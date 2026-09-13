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
 let cloudPrefs=null,saveCalls=0,failCloud=false;const errors=[];
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
   else if(p.endsWith('/recipes')){data=catalog;if(url.searchParams.has('id'))data=catalog.filter(r=>r.id===url.searchParams.get('id').replace(/^eq\./,''));if(url.searchParams.get('is_user_created')==='eq.true')data=[];}
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
 const shown=async()=>page.locator('[role="img"][aria-label]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('aria-label')));
 const before=await shown();await page.getByRole('button',{name:'Refresh meal ideas',exact:true}).click();
 await page.waitForFunction(old=>JSON.stringify([...document.querySelectorAll('[role="img"][aria-label]')].map(n=>n.getAttribute('aria-label')))!==JSON.stringify(old),before,{timeout:20000});
 const after=await shown();assert.notDeepEqual(after.slice(0,3),before.slice(0,3));
 // The placeholder beneath a loaded photo must not announce a second missing image.
 assert.ok(!after.includes('No recipe photo'),'A feed card reports a missing image');
 const firstPhoto=page.getByRole('img',{name:after[0],exact:true}).first();
 await firstPhoto.locator('img').waitFor();
 await page.waitForFunction(title=>{const root=[...document.querySelectorAll('[role="img"]')].find(n=>n.getAttribute('aria-label')===title);const img=root?.querySelector('img');return img?.complete&&img.naturalWidth>0;},after[0],{timeout:30000});
 await page.screenshot({path:path.join(out,'home-phone.png')});
 const layouts=[];
 for(const [name,width,height] of [['small-phone',320,740],['android-phone',360,800],['phone',390,844],['landscape',844,390],['tablet',768,1024]]){
   await page.setViewportSize({width,height});
   const action=page.getByRole('button',{name:/^See all /}).first();await action.scrollIntoViewIfNeeded();
   const b=await action.boundingBox();assert.ok(b.x>=0&&b.x+b.width<=width+1,`${name}: See all clipped`);
   const nav=page.getByRole('tablist').last();await nav.waitFor();const n=await nav.boundingBox();assert.ok(n.y+n.height<=height+1,`${name}: tab bar out of viewport`);
   for(const label of ['Home','Saved','Grocery','Pantry','Create','Settings']){const text=nav.getByText(label,{exact:true});const box=await text.boundingBox();assert.ok(box&&box.y+box.height<=height-7,`${name}: ${label} label clipped`);}
   await page.screenshot({path:path.join(out,`layout-${name}.png`)});layouts.push({name,width,height,seeAll:b,tabBar:n});
 }
 await page.setViewportSize({width:390,height:844});
 await page.getByRole('tab',{name:'Settings',exact:true}).click();
 await page.getByText(/cooking for 1/).waitFor();
 await page.getByText('Food Preferences',{exact:true}).last().click();
 await page.getByRole('checkbox',{name:'Pasta',exact:true}).waitFor();await page.screenshot({path:path.join(out,'settings-edit.png')});
 assert.equal(await page.getByRole('checkbox',{name:'Pasta',exact:true}).isChecked(),true);
 await page.getByRole('button',{name:'Cancel',exact:true}).click();
 await page.getByRole('tab',{name:'Home',exact:true}).click();
 await page.reload({waitUntil:'domcontentloaded'});await page.getByRole('button',{name:'Refresh meal ideas',exact:true}).waitFor({timeout:30000});
 assert.ok(!page.url().includes('onboarding'));
 const detail=catalog.find(r=>r.title==='Boxed Mac and Canned Chili Dinner');assert.ok(detail);
 await page.goto(base+'/recipe/'+detail.id,{waitUntil:'domcontentloaded'});
 const hero=page.getByRole('img',{name:detail.title,exact:true});await hero.waitFor({timeout:30000});
 await page.waitForFunction(title=>{const root=[...document.querySelectorAll('[role="img"]')].find(n=>n.getAttribute('aria-label')===title);const img=root?.querySelector('img');return img?.complete&&img.naturalWidth>0;},detail.title,{timeout:30000});
 const servingSlider=page.getByRole('slider',{name:'Recipe servings',exact:true});assert.equal(await servingSlider.getAttribute('aria-valuenow'),'1');
 await page.screenshot({path:path.join(out,'recipe-photo-servings.png')});
 fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({catalog:catalog.length,saveCalls,layouts,firstCardsBefore:before.slice(0,3),firstCardsAfter:after.slice(0,3),errors},null,2));
 assert.deepEqual(errors,[]);console.log('Browser QA passed: onboarding save, Settings sync, reload, refresh variety, feed/detail photos, household portions and five viewport layouts.');
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});
