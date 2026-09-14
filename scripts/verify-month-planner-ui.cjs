// Isolated browser account. No real account writes; only the public recipe catalog is read.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'playwright');
const base=process.env.UI_QA_URL||'http://localhost:8088',out=process.env.UI_QA_DIR||path.resolve('artifacts/month-planner');
assert.ok(['localhost','127.0.0.1'].includes(new URL(base).hostname));fs.mkdirSync(out,{recursive:true});
const env={};for(const line of fs.readFileSync('.env','utf8').split(/\r?\n/)){const m=line.match(/^(EXPO_PUBLIC_SUPABASE_(?:URL|ANON_KEY))=(.*)$/);if(m)env[m[1]]=m[2].trim().replace(/^['"]|['"]$/g,'');}
const api=env.EXPO_PUBLIC_SUPABASE_URL,key=env.EXPO_PUBLIC_SUPABASE_ANON_KEY,id='11111111-1111-4111-8111-111111111111';
const user={id,aud:'authenticated',role:'authenticated',email:'qa@example.invalid',app_metadata:{provider:'email'},user_metadata:{},created_at:new Date().toISOString()};
const token=Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url')+'.'+Buffer.from(JSON.stringify({sub:id,role:'authenticated',exp:Math.floor(Date.now()/1000)+3600})).toString('base64url')+'.local-test-signature';
const session={access_token:token,refresh_token:'local-test-only',expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600,token_type:'bearer',user};
(async()=>{
 const response=await fetch(api+'/rest/v1/recipes?select=*&is_user_created=eq.false',{headers:{apikey:key}});assert.ok(response.ok);const catalog=await response.json();
 const recipe=catalog.find(r=>r.title==='Simple Vanilla Milkshake');assert.ok(recipe);
 let plans=['2026-09-14','2026-09-21'].map((d,i)=>({id:'plan-'+i,user_id:id,plan_date:d,meal_slot:'dessert',recipe_id:recipe.id,recipe_title:recipe.title,created_at:new Date().toISOString()})),checks=[],sequence=2,failPurchase=false;
 const browser=await chromium.launch({channel:'msedge',headless:true}),context=await browser.newContext({viewport:{width:390,height:844},timezoneId:'America/Denver'});
 await context.route(api+'/**',async route=>{const req=route.request(),u=new URL(req.url()),p=u.pathname;let data=[];
  if(p.startsWith('/storage/'))return route.continue();
  if(p.startsWith('/auth/'))data=p.endsWith('/user')?user:session;
  else if(p.endsWith('/rpc/household_action'))data={household:null};
  else if(p.endsWith('/user_preferences'))data=[{user_id:id,onboarding_completed_at:new Date().toISOString(),disliked_ingredients:[],disliked_cuisines:[],liked_ingredients:[],liked_cuisines:[]}];
  else if(p.endsWith('/users'))data=[{id,name:'Test cook'}];
  else if(p.endsWith('/recipes')){data=catalog;if(u.searchParams.has('id'))data=data.filter(r=>r.id===u.searchParams.get('id').slice(3));if(u.searchParams.get('is_user_created')==='eq.true')data=[];}
  else if(p.endsWith('/meal_plans')){
   const body=req.postDataJSON(),rowId=u.searchParams.get('id')?.slice(3);
   if(req.method()==='POST'){plans.push({...body,id:'plan-'+sequence++,created_at:new Date().toISOString()});}
   else if(req.method()==='PATCH'){Object.assign(plans.find(r=>r.id===rowId),body);data=plans.filter(r=>r.id===rowId);}
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
 await page.goto(base+'/planner');await page.getByText('Meal planner',{exact:true}).waitFor();await page.getByRole('button',{name:recipe.title,exact:true}).waitFor();
 assert.equal(await page.getByRole('tab').count(),5);assert.equal(await page.getByRole('tab',{name:'Planner',exact:true}).count(),1);
 await page.screenshot({path:path.join(out,'today-phone.png')});
 await page.getByRole('button',{name:'Week view',exact:true}).click();await page.getByText('September 2026',{exact:true}).waitFor();
 assert.equal(await page.getByRole('button',{name:/^Plan week /}).count(),5);
 await page.getByRole('button',{name:'Next month',exact:true}).click();await page.getByText('October 2026',{exact:true}).waitFor();
 await page.getByRole('button',{name:/^Add recipe to /}).first().click();await page.getByRole('textbox',{name:'Search planner recipes'}).fill('Simple Vanilla Milkshake');await page.getByRole('button',{name:recipe.title,exact:true}).click();await page.getByRole('button',{name:'Dinner',exact:true}).click();await page.getByRole('button',{name:'Save to day',exact:true}).click();await page.getByText(/Simple Vanilla Milkshake added to/).waitFor();assert.equal(plans.length,3);
 await page.getByRole('button',{name:'Remove '+recipe.title,exact:true}).click();await page.getByRole('button',{name:'Remove '+recipe.title,exact:true}).waitFor({state:'hidden'});assert.equal(plans.length,2);
 await page.getByRole('button',{name:'This week',exact:true}).click();await page.getByText('September 2026',{exact:true}).waitFor();
 for(const width of [320,390,844]){await page.setViewportSize({width,height:844});await page.screenshot({path:path.join(out,'week-'+width+'.png')});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));}
 await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:'Today’s groceries',exact:true}).click();await page.getByRole('checkbox',{name:'Mark 1/4 cup cold milk as bought',exact:true}).waitFor();
 assert.equal(await page.getByRole('checkbox').count(),3);assert.equal(await page.evaluate(()=>localStorage.getItem('user_pantry')),null);
 failPurchase=true;await page.getByRole('checkbox').first().click();await page.getByText('Could not save shopping progress. Check your connection and try again.',{exact:true}).waitFor();assert.equal(checks.length,0);failPurchase=false;
 await page.getByRole('checkbox').first().click();await page.waitForFunction(()=>document.querySelectorAll('[role="checkbox"][aria-checked="true"]').length===1);assert.equal(await page.evaluate(()=>localStorage.getItem('user_pantry')),null);
 for(let i=0;i<2;i++){await page.getByRole('checkbox',{name:/ as bought$/}).first().click();await page.waitForFunction(n=>document.querySelectorAll('[role="checkbox"][aria-checked="true"]').length===n,i+2);}
 await page.getByText('Shopping complete!',{exact:true}).waitFor();await page.waitForFunction(()=>{const el=[...document.querySelectorAll('div')].find(e=>e.textContent==='Shopping complete!'&&e.children.length===0);if(!el)return false;for(let x=el;x;x=x.parentElement)if(Number(getComputedStyle(x).opacity)<1)return false;return true;});await page.screenshot({path:path.join(out,'pantry-prompt.png')});
 await page.evaluate(()=>localStorage.setItem('qa-fail-pantry','yes'));await page.getByRole('button',{name:'Yes, update pantry',exact:true}).click();await page.getByText('Could not save your pantry. Your groceries are still checked; try again.',{exact:true}).first().waitFor();
 await page.evaluate(()=>localStorage.removeItem('qa-fail-pantry'));await page.getByRole('button',{name:'Yes, update pantry',exact:true}).click();await page.getByText('Shopping complete!',{exact:true}).waitFor({state:'hidden'});
 const pantry=await page.evaluate(()=>JSON.parse(localStorage.getItem('user_pantry')));assert.ok(pantry.includes('milk'));assert.equal(pantry.length,3);
 await page.reload();await page.getByText('Shopping complete ✓',{exact:true}).waitFor();assert.equal(await page.getByText('Shopping complete!',{exact:true}).count(),0);
 await page.getByRole('button',{name:'Week',exact:true}).click();await page.getByRole('button',{name:'Next week',exact:true}).click();await page.getByRole('checkbox',{name:'Mark 1/4 cup cold milk as bought',exact:true}).waitFor();assert.equal(await page.locator('[role="checkbox"][aria-checked="true"]').count(),0);
 await page.getByRole('button',{name:'All',exact:true}).click();await page.getByRole('checkbox',{name:'Mark 2 × 1/4 cup cold milk as bought',exact:true}).waitFor();await page.screenshot({path:path.join(out,'all-groceries.png')});
 await page.getByRole('textbox',{name:'Grocery item',exact:true}).fill('apples');await page.getByRole('button',{name:'Add',exact:true}).click();await page.getByRole('checkbox',{name:'Mark apples as bought',exact:true}).waitFor();
 for(let i=0;i<4;i++){await page.getByRole('checkbox',{name:/ as bought$/}).first().click();await page.waitForFunction(n=>document.querySelectorAll('[role="checkbox"][aria-checked="true"]').length===n,i+1);}await page.getByText('Shopping complete!',{exact:true}).waitFor();await page.getByRole('button',{name:'Not now',exact:true}).click();await page.getByText('Shopping complete!',{exact:true}).waitFor({state:'hidden'});assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('user_pantry'))),pantry);
 await page.getByRole('button',{name:'Update pantry',exact:true}).click();await page.getByRole('button',{name:'Yes, update pantry',exact:true}).click();await page.getByText('Shopping complete!',{exact:true}).waitFor({state:'hidden'});assert.equal((await page.evaluate(()=>JSON.parse(localStorage.getItem('user_pantry')))).length,4);
 await page.getByRole('tab',{name:'More',exact:true}).click();for(const label of ['Saved recipes','Create a recipe','Settings','Household'])assert.equal(await page.getByRole('button',{name:label,exact:true}).count(),1);
 await page.getByRole('tab',{name:'Home',exact:true}).click();assert.equal(await page.getByRole('button',{name:'Weekly planner',exact:true}).count(),0);
 await page.getByRole('tab',{name:'Planner',exact:true}).click();await page.getByRole('button',{name:'Today',exact:true}).click();await page.clock.fastForward(24*60*60*1000);await page.getByText('Tue, Sep 15 · Today',{exact:true}).waitFor();
 assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({navigationTabs:5,calendarMonths:true,monthBoundarySave:true,dayWeekAll:true,repeatedPurchases:true,noPrematurePantryUpdate:true,pantryConfirmationRetryDeduplication:true,midnightRollover:true,errors},null,2));await browser.close();console.log('Calendar, grocery scopes, quantity repetition, pantry confirmation/retry, navigation and date rollover browser checks passed.');
})().catch(e=>{console.error(e);process.exit(1);});
