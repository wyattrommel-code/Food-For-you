// Isolated browser account. No real account writes; only the public recipe catalog is read.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'playwright');
const base=process.env.UI_QA_URL||'http://localhost:8090',out=process.env.UI_QA_DIR||path.resolve('artifacts/meal-choices');
assert.ok(['localhost','127.0.0.1'].includes(new URL(base).hostname));fs.mkdirSync(out,{recursive:true});
const env={};for(const line of fs.readFileSync('.env','utf8').split(/\r?\n/)){const m=line.match(/^(EXPO_PUBLIC_SUPABASE_(?:URL|ANON_KEY))=(.*)$/);if(m)env[m[1]]=m[2].trim().replace(/^['"]|['"]$/g,'');}
const api=env.EXPO_PUBLIC_SUPABASE_URL,key=env.EXPO_PUBLIC_SUPABASE_ANON_KEY,id='11111111-1111-4111-8111-111111111111';
const user={id,aud:'authenticated',role:'authenticated',email:'qa@example.invalid',app_metadata:{provider:'email'},user_metadata:{},created_at:new Date().toISOString()};
const token=Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url')+'.'+Buffer.from(JSON.stringify({sub:id,role:'authenticated',exp:Math.floor(Date.now()/1000)+3600})).toString('base64url')+'.local-test-signature';
const session={access_token:token,refresh_token:'local-test-only',expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600,token_type:'bearer',user};
(async()=>{
 const response=await fetch(api+'/rest/v1/recipes?select=*&is_user_created=eq.false',{headers:{apikey:key}});assert.ok(response.ok);const catalog=await response.json();
 let qaCatalog=catalog,failCatalog=false;
 const recipe=catalog.find(r=>r.title==='Simple Vanilla Milkshake');assert.ok(recipe);
 let plans=['2026-09-14','2026-09-21'].map((d,i)=>({id:'plan-'+i,user_id:id,plan_date:d,meal_slot:'dessert',recipe_id:recipe.id,recipe_title:recipe.title,created_at:new Date().toISOString()})),checks=[],sequence=2,failPurchase=false,failMove=false;
 const browser=await chromium.launch({channel:'msedge',headless:true}),context=await browser.newContext({viewport:{width:390,height:844},timezoneId:'America/Denver'});
 await context.route(api+'/**',async route=>{const req=route.request(),u=new URL(req.url()),p=u.pathname;let data=[];
  if(p.startsWith('/storage/'))return route.continue();
  if(p.startsWith('/auth/'))data=p.endsWith('/user')?user:session;
  else if(p.endsWith('/rpc/household_action'))data={household:null};
  else if(p.endsWith('/user_preferences'))data=[{user_id:id,onboarding_completed_at:new Date().toISOString(),disliked_ingredients:[],disliked_cuisines:[],liked_ingredients:[],liked_cuisines:[]}];
  else if(p.endsWith('/users'))data=[{id,name:'Test cook'}];
  else if(p.endsWith('/recipes')){if(failCatalog)return route.fulfill({status:503,json:{message:'Simulated offline'}});data=qaCatalog;if(u.searchParams.has('id'))data=data.filter(r=>r.id===u.searchParams.get('id').slice(3));if(u.searchParams.get('is_user_created')==='eq.true')data=[];}
  else if(p.endsWith('/meal_plans')){
   const body=req.postDataJSON(),rowId=u.searchParams.get('id')?.slice(3);
   if(req.method()==='POST'){plans.push({...body,id:'plan-'+sequence++,created_at:new Date().toISOString()});}
   else if(req.method()==='PATCH'){if(failMove)return route.fulfill({status:503,json:{message:'Simulated offline'}});Object.assign(plans.find(r=>r.id===rowId),body);data=plans.filter(r=>r.id===rowId);}
   else if(req.method()==='DELETE'){data=plans.filter(r=>r.id===rowId);plans=plans.filter(r=>r.id!==rowId);checks=checks.filter(c=>c.plan_id!==rowId);}
   else{const lo=u.searchParams.getAll('plan_date').find(v=>v.startsWith('gte.'))?.slice(4),hi=u.searchParams.getAll('plan_date').find(v=>v.startsWith('lte.'))?.slice(4);data=plans.filter(r=>(!lo||r.plan_date>=lo)&&(!hi||r.plan_date<=hi));if(u.searchParams.get('select')?.includes('recipes('))data=data.map(r=>({...r,recipes:catalog.find(c=>c.id===r.recipe_id)}));}
  }else if(p.endsWith('/meal_plan_purchases')){
   if(req.method()==='POST'){if(failPurchase)return route.fulfill({status:503,json:{message:'Simulated offline'}});for(const r of req.postDataJSON()){const old=checks.find(c=>c.plan_id===r.plan_id&&c.ingredient_key===r.ingredient_key);if(old)Object.assign(old,r);else checks.push(r);}}
   else data=checks;
  }
  if(req.headers().accept?.includes('vnd.pgrst.object'))data=Array.isArray(data)?data[0]??null:data;
  return route.fulfill({status:200,json:data});
 });
 await context.addInitScript(({session,project})=>{localStorage.setItem('sb-'+project+'-auth-token',JSON.stringify(session));const original=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key==='user_pantry'&&this.getItem('qa-fail-pantry')==='yes')throw Error('Simulated disk failure');return original.call(this,key,value);};},{session,project:new URL(api).hostname.split('.')[0]});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.clock.install({time:new Date('2026-09-14T12:00:00-06:00')});


 page.setDefaultTimeout(12000);
 const button=name=>page.getByRole('button',{name,exact:true});
 const refreshChoices=()=>button('Refresh choices').click();
 const titles=()=>page.getByRole('button',{name:/^View /}).evaluateAll(nodes=>nodes.map(n=>n.getAttribute('aria-label').slice(5)));
 const snap=async name=>{await page.waitForTimeout(500);await page.screenshot({path:path.join(out,name)});};
 await page.goto(base);await page.getByText("I'm Hungry Now",{exact:true}).click();await page.waitForURL('**/meal-choices?mode=hungryNow');await page.getByTestId('choice-2').waitFor();
 const first=await titles();assert.equal(first.length,3);
 await button('Hold '+first[1]).click();await refreshChoices();const second=await titles();assert.equal(second[1],first[1]);assert.ok(second.filter(t=>t!==first[1]).every(t=>!first.includes(t)));
 assert.equal(await page.evaluate(id=>localStorage.getItem('favs:'+id),id),null,'Hold does not favorite a recipe');
 await snap('hungry-held.png');
 await button('Hold '+second[0]).click();await button('Hold '+second[2]).click();assert.ok(await button('Refresh choices').isDisabled());
 await button('Release '+second[2]).click();await refreshChoices();const third=await titles();assert.deepEqual(third.slice(0,2),second.slice(0,2));assert.notEqual(third[2],second[2]);
 await button('Save '+third[1]).click();await button('Unsave '+third[1]).waitFor();const favorite=qaCatalog.find(r=>r.title===third[1]);assert.ok((await page.evaluate(id=>JSON.parse(localStorage.getItem('favs:'+id)),id)).includes(favorite.id));
 await button('View '+third[1]).click();await page.waitForURL('**/recipe/**');await page.goBack();await button('Release '+third[1]).waitFor();assert.deepEqual(await titles(),third);await button('Unsave '+third[1]).waitFor();
 await button('Back to home').click();await page.getByText("I'm Hungry Now",{exact:true}).click();await page.getByTestId('choice-2').waitFor();assert.notDeepEqual(await titles(),third);assert.equal(await page.getByRole('button',{name:/^Release /}).count(),0);
 await button('Back to home').click();await button('I need a sweet treat').click();await page.getByTestId('choice-quick').waitFor();const sweets=await titles();assert.equal(sweets.length,3);await page.getByText('Hot treat',{exact:true}).waitFor();await page.getByText('Cold treat',{exact:true}).waitFor();await page.getByText('Quick & easy',{exact:true}).waitFor();
 await button('Hold '+sweets[0]).click();await refreshChoices();const newSweets=await titles();assert.equal(newSweets[0],sweets[0]);assert.ok(newSweets.slice(1).every(t=>!sweets.includes(t)));await snap('sweet-held.png');
 for(const width of [320,390,844]){await page.setViewportSize({width,height:844});await snap('choices-'+width+'.png');assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));const box=await button('Refresh choices').boundingBox();assert.ok(box.x+box.width<=width);}
 await page.setViewportSize({width:390,height:844});await page.emulateMedia({colorScheme:'dark'});await snap('choices-dark.png');await page.emulateMedia({colorScheme:'light'});
 await button('Back to home').click();await page.getByText('Pick For Me',{exact:true}).click();await page.getByTestId('choice-0').waitFor();const pick=await titles();assert.equal(pick.length,1);await refreshChoices();assert.notDeepEqual(await titles(),pick);
 await button('Back to home').click();await page.getByText('Feeling Bold',{exact:true}).click();await page.getByTestId('choice-2').waitFor();const bold=await titles();assert.equal(bold.length,3);assert.ok(bold.every(t=>qaCatalog.find(r=>r.title===t).effort_score===3));await refreshChoices();assert.notDeepEqual(await titles(),bold);
 qaCatalog=[catalog.find(r=>!r.meal_time.includes('dessert'))];await page.goto(base+'/meal-choices?mode=hungryNow');await page.getByTestId('choice-0').waitFor();assert.equal((await titles()).length,1);await refreshChoices();await page.getByText('These are the available matches right now. Some choices may repeat.',{exact:true}).waitFor();await button('Hold '+qaCatalog[0].title).click();assert.ok(await button('Refresh choices').isDisabled());
 qaCatalog=[];await page.reload();await page.getByText('No matching recipes yet',{exact:true}).waitFor();assert.ok(await button('Refresh choices').isDisabled());
 qaCatalog=catalog;failCatalog=true;await page.reload();await button('Retry choices').waitFor();failCatalog=false;await button('Retry choices').click();await page.getByTestId('choice-2').waitFor();
 assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({homeButtonsOpenPages:true,reopeningCreatesFreshChoices:true,holdAndRefresh:true,allHeldDisabled:true,releaseOne:true,holdsSeparateFromFavorites:true,detailBackPreservesChoices:true,sweetSlots:true,pickOne:true,boldThree:true,emptyAndSmallPools:true,loadFailureRetry:true,responsiveWidths:[320,390,844],errors},null,2));await browser.close();console.log('Meal choices browser checks passed.');
})().catch(e=>{console.error(e);process.exit(1);});
