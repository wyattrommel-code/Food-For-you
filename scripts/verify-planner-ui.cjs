// Local browser QA. All account requests are intercepted; no real account is edited.
// Requires a running Expo web preview and Playwright (optionally PLAYWRIGHT_MODULE_PATH).
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'playwright');
const base=process.env.UI_QA_URL||'http://localhost:8088';
assert.ok(['localhost','127.0.0.1'].includes(new URL(base).hostname),'QA targets local previews only');
const out=process.env.UI_QA_DIR||path.resolve('artifacts/ui-qa');fs.mkdirSync(out,{recursive:true});
const env={};for(const line of fs.readFileSync('.env','utf8').split(/\r?\n/)){const m=line.match(/^(EXPO_PUBLIC_SUPABASE_(?:URL|ANON_KEY))=(.*)$/);if(m)env[m[1]]=m[2].trim().replace(/^['"]|['"]$/g,'');}
const api=env.EXPO_PUBLIC_SUPABASE_URL,key=env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
if(!key.startsWith('sb_publishable_'))assert.equal(JSON.parse(Buffer.from(key.split('.')[1],'base64url')).role,'anon');
const fixtureId='11111111-1111-4111-8111-111111111111';
const user={id:fixtureId,aud:'authenticated',role:'authenticated',email:'qa@example.invalid',app_metadata:{provider:'email',providers:['email']},user_metadata:{},created_at:new Date().toISOString()};
const token=Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url')+'.'+Buffer.from(JSON.stringify({sub:fixtureId,role:'authenticated',exp:Math.floor(Date.now()/1000)+3600})).toString('base64url')+'.local-test-signature';
const session={access_token:token,refresh_token:'local-test-only',expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600,token_type:'bearer',user};
(async()=>{
 const response=await fetch(api+'/rest/v1/recipes?select=*&is_user_created=eq.false',{headers:{apikey:key}});assert.ok(response.ok);const catalog=await response.json();assert.equal(catalog.length,269);
 const browser=await chromium.launch({channel:process.env.UI_QA_BROWSER||'msedge',headless:true});
 const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1});
 let plans=[],failPlan=false,hasPrivateSmoothie=false; let cloudPrefs=null,saveCalls=0,failCloud=false;const errors=[];
 const privateSmoothie={...catalog[0],id:'33333333-3333-4333-8333-333333333333',title:'QA private smoothie',meal_time:['smoothie'],user_id:fixtureId,is_user_created:true};
 await context.route(api+'/**',async route=>{
   const req=route.request(),url=new URL(req.url()),p=url.pathname;
   if(p.startsWith('/storage/'))return route.continue();
   let data;
   if(p.startsWith('/auth/'))data=p.endsWith('/user')?user:session;
   else if(p.endsWith('/rpc/household_action'))data={household:null};
   else if(p.endsWith('/user_preferences')){
     if(req.method()==='POST'){if(failCloud)return route.fulfill({status:503,json:{message:'QA simulated offline'}});cloudPrefs={...cloudPrefs,...req.postDataJSON()};saveCalls++;data=[];}
     else data=cloudPrefs?[cloudPrefs]:[];
   }else if(p.endsWith('/users'))data=[{id:fixtureId,name:'QA Cook',avatar_url:null}];
   else if(p.endsWith('/recipes')){data=url.searchParams.get('meal_time')?.includes('smoothie')?(hasPrivateSmoothie?[privateSmoothie]:[]):[...catalog,...(hasPrivateSmoothie&&!url.searchParams.has('is_user_created')?[privateSmoothie]:[])];if(url.searchParams.has('id'))data=data.filter(r=>r.id===url.searchParams.get('id').replace(/^eq\./,''));if(url.searchParams.get('is_user_created')==='eq.true')data=[];}
   else if(p.endsWith('/meal_plans')){
     if(req.method()!=='GET'&&failPlan)return route.fulfill({status:503,json:{message:'Simulated network failure'}});
     const body=req.postDataJSON();const rowId=url.searchParams.get('id')?.replace(/^eq\./,'');
     if(req.method()==='POST'){const old=plans.find(e=>e.plan_date===body.plan_date&&e.meal_slot===body.meal_slot&&e.recipe_id===body.recipe_id);if(!old)plans.push({...body,id:'plan-'+(plans.length+1),created_at:new Date().toISOString()});data=[];}
     else if(req.method()==='PATCH'){const entry=plans.find(e=>e.id===rowId);Object.assign(entry,body);data=[entry];}
     else if(req.method()==='DELETE'){data=plans.filter(e=>e.id===rowId);plans=plans.filter(e=>e.id!==rowId);}
     else {const lo=url.searchParams.getAll('plan_date').find(v=>v.startsWith('gte.'))?.slice(4);const hi=url.searchParams.getAll('plan_date').find(v=>v.startsWith('lte.'))?.slice(4);data=plans.filter(e=>(!lo||e.plan_date>=lo)&&(!hi||e.plan_date<=hi));}
   }
   else data=[];
   if(req.headers().accept?.includes('vnd.pgrst.object'))data=Array.isArray(data)?data[0]??null:data;
   return route.fulfill({status:200,json:data});
 });
 await context.addInitScript(({session,project})=>{const key=`sb-${project}-auth-token`;if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(session));},{session,project:new URL(api).hostname.split('.')[0]});
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base,{waitUntil:'domcontentloaded',timeout:90000});
 await page.getByText('What sounds good?',{exact:true}).waitFor({timeout:90000});
 await page.screenshot({path:path.join(out,'onboarding-phone.png')});
 await page.getByRole('checkbox',{name:'Pasta',exact:true}).click();
 await page.getByRole('checkbox',{name:'Chicken dinners',exact:true}).click();
 await page.getByRole('button',{name:'Continue',exact:true}).click();
 await page.getByRole('checkbox',{name:'mushrooms',exact:true}).click();
 await page.getByRole('button',{name:'Continue',exact:true}).click();
 await page.getByRole('checkbox',{name:'30 minutes',exact:true}).click();
 await page.getByRole('checkbox',{name:'Favor easy recipes',exact:true}).click();
 await page.getByRole('button',{name:'Continue',exact:true}).click();
 await page.getByRole('checkbox',{name:'Just me',exact:true}).click();
 await page.getByRole('button',{name:'Save my preferences',exact:true}).click();
 await page.getByRole('button',{name:'Refresh meal ideas',exact:true}).waitFor({timeout:30000});
 assert.equal(saveCalls,1);assert.equal(cloudPrefs.household_size,1);assert.deepEqual(cloudPrefs.preferred_meal_styles,['pasta','chicken']);assert.deepEqual(cloudPrefs.disliked_ingredients,['mushrooms']);assert.equal(cloudPrefs.max_cook_time_mins,30);assert.equal(cloudPrefs.prefer_easy,true);

 await page.getByText("I'm Hungry Now",{exact:true}).click();
 await page.getByText('Ready in 30 minutes or less',{exact:true}).waitFor();
 let labels=await page.locator('[role="img"][aria-label]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('aria-label')));
 assert.equal(labels.length,3);assert.ok(labels.every(title=>!catalog.find(r=>r.title===title).meal_time.includes('dessert')));
 await page.getByRole('button',{name:'I need a sweet treat',exact:true}).click();
 await page.getByText('Hot treat',{exact:true}).waitFor();await page.getByText('Cold treat',{exact:true}).waitFor();await page.getByText('Quick & easy',{exact:true}).waitFor();
 labels=await page.locator('[role="img"][aria-label]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('aria-label')));
 assert.equal(labels.length,3);assert.equal(new Set(labels).size,3);
 for(const [width,height] of [[320,740],[390,844],[844,390]]){
  await page.setViewportSize({width,height});const sweet=page.getByRole('button',{name:'I need a sweet treat',exact:true});await sweet.scrollIntoViewIfNeeded();const box=await sweet.boundingBox();assert.ok(box.x>=0&&box.x+box.width<=width+1);await page.screenshot({path:path.join(out,'sweet-'+width+'.png')});
 }
 await page.setViewportSize({width:390,height:844});
 await page.getByRole('button',{name:'Smoothies & Shakes',exact:true}).click();
 await page.getByText('No smoothies or shakes match yet. Add your own using the button above.',{exact:true}).waitFor();
 await page.getByRole('button',{name:'Add a smoothie or shake',exact:true}).click();
 const smoothieChoice=page.getByRole('checkbox',{name:'Smoothies & Shakes',exact:true});await smoothieChoice.scrollIntoViewIfNeeded();await page.waitForFunction(()=>document.querySelector('[role="checkbox"][aria-label="Smoothies & Shakes"]')?.getAttribute('aria-checked')==='true');assert.equal(await smoothieChoice.isChecked(),true);await page.screenshot({path:path.join(out,'create-smoothie.png')});
 hasPrivateSmoothie=true;await page.goto(base+'/browse?category=smoothie&title=Smoothies');await page.getByRole('img',{name:privateSmoothie.title,exact:true}).waitFor();
 const recipe=catalog.find(r=>r.title==='Boxed Mac with Hot Dogs and Peas');
 await page.goto(base+'/recipe/'+recipe.id);await page.getByRole('button',{name:'Add to planner',exact:true}).click();
 await page.getByRole('button',{name:'Save to day',exact:true}).waitFor();
 await page.getByRole('button',{name:'Dinner',exact:true}).click();await page.getByRole('button',{name:'Save to day',exact:true}).click();
 await page.getByText(/added to .*Dinner/).waitFor();assert.equal(plans.length,1);assert.equal(plans[0].meal_slot,'dinner');
 await page.reload();await page.getByRole('button',{name:recipe.title,exact:true}).waitFor();assert.equal(plans.length,1);
 await page.getByRole('button',{name:'Move '+recipe.title,exact:true}).click();
 await page.getByRole('button',{name:'Next week',exact:true}).click();await page.getByRole('button',{name:'Day’s menu',exact:true}).click();
 await page.getByRole('button',{name:'Move recipe',exact:true}).click();await page.getByText(/moved to/).waitFor();assert.equal(plans[0].meal_slot,'menu');
 await page.getByRole('button',{name:/^Add recipe to /}).first().click();
 await page.getByRole('textbox',{name:'Search planner recipes',exact:true}).fill('Quick Banana Pudding Cups');
 await page.getByRole('button',{name:'Quick Banana Pudding Cups',exact:true}).click();
 failPlan=true;await page.getByRole('button',{name:'Save to day',exact:true}).click();await page.getByText('Could not save your menu. Check your connection and try again.',{exact:true}).waitFor();assert.equal(plans.length,1);
 failPlan=false;await page.getByRole('button',{name:'Save to day',exact:true}).click();await page.getByText(/Quick Banana Pudding Cups added to/).waitFor();assert.equal(plans.length,2);
 await page.screenshot({path:path.join(out,'planner-saved.png')});
 await page.getByRole('button',{name:'Remove Quick Banana Pudding Cups',exact:true}).click();await page.getByRole('button',{name:'Quick Banana Pudding Cups',exact:true}).waitFor({state:'hidden'});assert.equal(plans.length,1);
 assert.deepEqual(errors,[]);
 fs.writeFileSync(path.join(out,'planner-results.json'),JSON.stringify({hungryDessertExclusion:true,treatOptions:labels,plannerSaveReloadMoveRemove:true,failedSavePreserved:true,categoryCreate:true,errors},null,2));
 await browser.close();console.log('Planner and treats browser QA passed.');
})().catch(e=>{console.error(e);process.exit(1);});
