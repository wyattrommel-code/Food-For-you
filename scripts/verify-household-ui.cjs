// Local browser fixture only. All account requests and sockets are intercepted.
const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'playwright');
const base=process.env.UI_QA_URL||'http://localhost:8088';assert.ok(['localhost','127.0.0.1'].includes(new URL(base).hostname));
const out=path.resolve('artifacts/household-ui');fs.mkdirSync(out,{recursive:true});
const env={};for(const line of fs.readFileSync('.env','utf8').split(/\r?\n/)){const m=line.match(/^(EXPO_PUBLIC_SUPABASE_(?:URL|ANON_KEY))=(.*)$/);if(m)env[m[1]]=m[2].trim().replace(/^['"]|['"]$/g,'');}
const api=env.EXPO_PUBLIC_SUPABASE_URL;
const id='11111111-1111-4111-8111-111111111111',hid='22222222-2222-4222-8222-222222222222';
const user={id,aud:'authenticated',role:'authenticated',email:'qa@example.invalid',app_metadata:{provider:'email',providers:['email']},user_metadata:{},created_at:new Date().toISOString()};
const token=Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url')+'.'+Buffer.from(JSON.stringify({sub:id,role:'authenticated',exp:Math.floor(Date.now()/1000)+3600})).toString('base64url')+'.local-only';
const session={access_token:token,refresh_token:'local-only',expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600,token_type:'bearer',user};
(async()=>{
 const browser=await chromium.launch({channel:process.env.UI_QA_BROWSER||'msedge',headless:true});try{
 const context=await browser.newContext({viewport:{width:390,height:844}});let household=null,cloud=[],offline=false;let prefsWrites=0;const errors=[];
 await context.routeWebSocket(/.*/,ws=>ws.close());
 await context.route(api+'/**',async route=>{const req=route.request(),url=new URL(req.url()),p=url.pathname;let data=[];
  if(p.startsWith('/auth/'))data=p.endsWith('/user')?user:session;
  else if(p.endsWith('/user_preferences')){if(req.method()==='POST')prefsWrites++;data=[{user_id:id,onboarding_completed_at:new Date().toISOString(),disliked_ingredients:['mushrooms'],liked_ingredients:[],disliked_cuisines:[],liked_cuisines:[],household_size:1}];}
  else if(p.endsWith('/users'))data=[{id,name:'Alex'}];
  else if(p.endsWith('/rpc/household_action')){const {p_action:a,p_data:d={}}=req.postDataJSON();if(a==='create')household={id:hid,name:d.name,ownerId:id,members:[{userId:id,name:d.displayName,isOwner:true}],inviteExpiresAt:null};
   if(a==='join')household={id:hid,name:'Joined household',ownerId:'other',members:[{userId:'other',name:'Partner',isOwner:true},{userId:id,name:d.displayName,isOwner:false}],inviteExpiresAt:null};
   if(a==='invite')household.inviteExpiresAt=new Date(Date.now()+86400000).toISOString();if(a==='revoke')household.inviteExpiresAt=null;
   data={household,invite:a==='invite'?{code:'0123456789ABCDEF0123456789ABCDEF',expiresAt:household.inviteExpiresAt}:null};
  }else if(p.endsWith('/rpc/household_grocery_apply')){if(offline)return route.fulfill({status:503,json:{message:'Connection unavailable; changes saved on this phone.'}});const op=req.postDataJSON().p_operation;
   for(const r of op.items){const old=cloud.find(x=>x.item_key===r.id);if(op.kind==='add'&&!old)cloud.push({household_id:hid,item_key:r.id,entry_id:r.entryId,name:r.name,category:r.category,sources:r.sources,checked:r.checked,revision:1,created_at:new Date().toISOString()});if(op.kind==='check'&&old)old.checked=r.checked;}
   data=null;
  }else if(p.endsWith('/household_grocery_items'))data=cloud;
  if(req.headers().accept?.includes('vnd.pgrst.object'))data=Array.isArray(data)?data[0]??null:data;
  await route.fulfill({status:200,json:data});
 });
 await context.addInitScript(({session,project})=>{localStorage.setItem('sb-'+project+'-auth-token',JSON.stringify(session));},{session,project:new URL(api).hostname.split('.')[0]});
 const page=await context.newPage();page.on('pageerror',e=>{errors.push(e.message);console.error('Browser error:',e.message);});
 await page.goto(base+'/household',{waitUntil:'domcontentloaded',timeout:90000});
 await page.getByRole('button',{name:'Create shared list',exact:true}).waitFor({timeout:90000});
 for(const [width,height] of [[320,740],[390,844],[844,390]]){await page.setViewportSize({width,height});const input=page.getByRole('textbox',{name:'Your name in this household'});await input.scrollIntoViewIfNeeded();const b=await input.boundingBox();assert.ok(b.x>=0&&b.x+b.width<=width+1);await page.screenshot({path:path.join(out,`household-create-${width}.png`)});}
 await page.setViewportSize({width:390,height:844});
 await page.getByRole('textbox',{name:'Your name in this household'}).fill('Alex');await page.getByRole('textbox',{name:'Household name',exact:true}).fill('Our groceries');await page.getByRole('button',{name:'Create shared list',exact:true}).click();
 await page.getByRole('button',{name:'Invite someone',exact:true}).waitFor({timeout:10000}).catch(async e=>{await page.screenshot({path:path.join(out,'failure-create.png')});console.error(page.url(),await page.locator('body').innerText());throw e;});await page.getByRole('button',{name:'Invite someone',exact:true}).click();await page.getByRole('button',{name:'Share invitation',exact:true}).waitFor();
 await page.screenshot({path:path.join(out,'household-invite.png')});
 await page.getByRole('button',{name:'Open shared groceries',exact:true}).click();await page.getByRole('textbox',{name:'Grocery item',exact:true}).waitFor();
 await page.getByRole('textbox',{name:'Grocery item',exact:true}).fill('milk');await page.getByRole('button',{name:'Add grocery item',exact:true}).click();await page.getByText('milk',{exact:true}).waitFor();
 await page.getByRole('checkbox',{name:'Mark milk as bought',exact:true}).click();await page.getByRole('checkbox',{name:'Mark milk as needed',exact:true}).waitFor();assert.equal(cloud.find(r=>r.name==='milk')?.checked,true);
 offline=true;await page.getByRole('textbox',{name:'Grocery item',exact:true}).fill('bread');await page.getByRole('button',{name:'Add grocery item',exact:true}).click();await page.getByText(/1 change saved on this phone/).waitFor();
 await page.reload({waitUntil:'domcontentloaded'});await page.getByText('bread',{exact:true}).waitFor();await page.getByText(/1 change saved on this phone/).waitFor();
 await page.screenshot({path:path.join(out,'grocery-offline.png')});
 offline=false;await page.getByText(/Tap to retry/).click();await page.getByText('Shared list is up to date',{exact:true}).waitFor();assert.equal(cloud.length,2);
 for(const [width,height] of [[320,740],[390,844],[844,390]]){await page.setViewportSize({width,height});const add=page.getByRole('button',{name:'Add grocery item',exact:true});await add.scrollIntoViewIfNeeded();const b=await add.boundingBox();assert.ok(b.x>=0&&b.x+b.width<=width+1);assert.ok(b.y+b.height<height);const check=page.getByRole('checkbox',{name:'Mark milk as needed',exact:true});await check.scrollIntoViewIfNeeded();const box=await check.boundingBox();assert.ok(box.y+box.height<height-65,'Checkbox remains reachable above navigation');await page.screenshot({path:path.join(out,`groceries-${width}.png`)});}
 assert.equal(prefsWrites,0,'Household actions must not overwrite food preferences');assert.deepEqual(errors,[]);
 fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({passed:true,screenWidths:[320,390,844],offlineRestart:true,preferenceWrites:prefsWrites,errors},null,2));console.log('Household UI passed: create/invite, shared grocery add/check, offline reload/retry and three responsive layouts.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
