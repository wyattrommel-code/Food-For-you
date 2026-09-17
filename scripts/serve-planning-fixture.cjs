// Isolated UI development backend. Binds loopback only; never contacts Supabase.
// Start: node scripts/serve-planning-fixture.cjs
// Expo: EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:8092 and ANON_KEY=local-ui-fixture
// Sign in as alex@example.invalid or blair@example.invalid with any nonempty password.
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),{randomUUID}=require('node:crypto');
const a='11111111-1111-4111-8111-111111111111',b='22222222-2222-4222-8222-222222222222',h='33333333-3333-4333-8333-333333333333';
const base='http://127.0.0.1:8092',today=new Date().toLocaleDateString('en-CA'),now=new Date().toISOString();
const settings=Object.fromEntries([a,b].map(id=>[id,{enabled:false,defaultPlanner:'personal',sharePreferences:false}]));
const defaults={disliked_recipe_ids:[],disliked_ingredients:[],disliked_cuisines:[],liked_ingredients:[],liked_cuisines:[],diet_style:'any',preferred_meal_styles:[],max_cook_time_mins:null,prefer_easy:false,household_size:1,onboarding_completed_at:now};
const prefs={[a]:{...defaults,user_id:a,disliked_ingredients:['egg']},[b]:{...defaults,user_id:b,diet_style:'vegan',disliked_ingredients:['peanut']}};
const make=(id,title,ingredients,meal_time=['lunch','dinner'],is_user_created=false)=>({id,title,description:'Local UI test recipe',ingredients_list:ingredients,shopping_list:ingredients,recipe_steps:['Prepare the ingredients.','Serve.'],meal_time,tags:['easy','quick'],prep_time_mins:15,effort_score:1,cuisine:'American',servings:2,is_user_created,user_id:is_user_created?a:null,image_url:base+'/photo.jpg',created_at:now});
const recipes=[make('44444444-4444-4444-8444-444444444441','Bean and Rice Bowl',['1 cup rice','1 can black beans']),make('44444444-4444-4444-8444-444444444442','Chicken Tacos',['chicken','tortillas']),make('44444444-4444-4444-8444-444444444443','Peanut Noodles',['noodles','peanut butter']),make('44444444-4444-4444-8444-444444444444','Private Apple Snack',['apple'],['snack'],true)];
const tables={meal_plans:[{id:randomUUID(),user_id:a,plan_date:today,meal_slot:'snack',recipe_id:recipes[3].id,recipe_title:recipes[3].title,created_at:now}],meal_plan_purchases:[],household_meal_plans:[],household_meal_plan_purchases:[],household_grocery_items:[],user_ingredients:[]};
const household={id:h,name:'QA household',ownerId:a,inviteExpiresAt:null,members:[{userId:a,name:'Alex',isOwner:true},{userId:b,name:'Blair',isOwner:false}]};
let preferenceWrites=0;
const reads={};
function user(id){return {id,email:id===b?'blair@example.invalid':'alex@example.invalid',aud:'authenticated',role:'authenticated',created_at:now,app_metadata:{provider:'email'},user_metadata:{}};}
function session(id){const token=Buffer.from('{"alg":"HS256","typ":"JWT"}').toString('base64url')+'.'+Buffer.from(JSON.stringify({sub:id,role:'authenticated',exp:Math.floor(Date.now()/1000)+3600})).toString('base64url')+'.local-fixture';return {access_token:token,refresh_token:id,token_type:'bearer',expires_in:3600,user:user(id)};}
function actor(req){try{return JSON.parse(Buffer.from(req.headers.authorization.split('.')[1],'base64url')).sub;}catch{return null;}}
function matches(row,url){for(const [key,value] of url.searchParams){const i=value.indexOf('.'),op=value.slice(0,i),v=value.slice(i+1);if(op==='eq'&&String(row[key])!==v)return false;if(op==='gte'&&String(row[key])<v)return false;if(op==='lte'&&String(row[key])>v)return false;if(op==='cs'&&!v.slice(1,-1).split(',').every(x=>row[key]?.includes(x)))return false;}return true;}
const server=http.createServer(async(req,res)=>{
 res.setHeader('Access-Control-Allow-Origin','*');res.setHeader('Access-Control-Allow-Headers','*');res.setHeader('Access-Control-Allow-Methods','GET,POST,PATCH,DELETE,OPTIONS');res.setHeader('Access-Control-Expose-Headers','content-range');
 if(req.method==='OPTIONS'){res.writeHead(204);return res.end();}
 const url=new URL(req.url,base),p=url.pathname,id=actor(req);let body='';for await(const chunk of req)body+=chunk;const input=body?JSON.parse(body):{};
 const send=(data,status=200)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(data));};
 try{
 if(p==='/photo.jpg'){res.writeHead(200,{'Content-Type':'image/jpeg'});return res.end(fs.readFileSync(path.resolve(__dirname,'../assets/recipe-photos/turkey-and-cheddar-sandwich-with-chips-3822fcb4ceef.jpg')));}
 if(p==='/fixture-state')return send({settings,tables,preferenceWrites,reads,prefs});
 if(!p.startsWith('/auth/')&&!p.startsWith('/rest/')){
  const root=path.resolve(__dirname,'../artifacts/household-ui/export');const requested=path.resolve(root,'.'+decodeURIComponent(p));
  if(!requested.startsWith(root+path.sep)&&requested!==root)return send({},403);
  const file=[requested,requested+'.html',path.join(requested,'index.html')].find(f=>fs.existsSync(f)&&fs.statSync(f).isFile());
  if(!file)return send({message:'Export the web fixture first'},404);
  const types={'.html':'text/html','.js':'application/javascript','.css':'text/css','.ttf':'font/ttf','.png':'image/png','.jpg':'image/jpeg','.json':'application/json'};
  res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'});return res.end(fs.readFileSync(file));
 }
 if(p.startsWith('/auth/'))return send(p.endsWith('/user')?user(id):p.endsWith('/logout')?{}:session(input.refresh_token===b||input.email==='blair@example.invalid'?b:a));
 if(![a,b].includes(id))return send({message:'Local fixture sign-in required'},401);
 if(p.endsWith('/rpc/household_action'))return send({household});
 if(p.endsWith('/rpc/household_planning_action')){if(input.p_settings){Object.assign(settings[id],input.p_settings);if(!settings[id].enabled)settings[id].defaultPlanner='personal';}return send({householdId:h,settings:settings[id],members:household.members.map(m=>({userId:m.userId,name:m.name,planningEnabled:settings[m.userId].enabled,sharingPreferences:settings[m.userId].sharePreferences,preferences:settings[m.userId].sharePreferences?prefs[m.userId]:null}))});}
 let data=[];const table=p.split('/').pop();
 if(req.method==='GET')reads[table]=(reads[table]||0)+1;
 if(req.method==='GET'&&table==='meal_plans'&&process.env.FIXTURE_PLAN_DELAY_MS)await new Promise(resolve=>setTimeout(resolve,Number(process.env.FIXTURE_PLAN_DELAY_MS)));
 if(table==='recipes')data=recipes.filter(r=>!r.is_user_created||r.user_id===id);
 else if(table==='users')data=[{id,name:id===b?'Blair':'Alex'}];
 else if(table==='user_preferences'){if(req.method!=='GET'){preferenceWrites++;Object.assign(prefs[id],input);}data=[prefs[id]];}
 else if(tables[table]){
 const shared=table.startsWith('household_meal_');
 if(shared&&!settings[id].enabled)return send({message:'Opt in to household planning'},403);
 const column=shared?'household_id':'user_id',owner=shared?h:id;
 if(req.method==='POST')for(const values of Array.isArray(input)?input:[input]){
 const keys=(url.searchParams.get('on_conflict')||'id').split(',');const old=tables[table].find(r=>keys.every(k=>r[k]===values[k]));
 if(old){if(!req.headers.prefer?.includes('ignore-duplicates'))Object.assign(old,values);}
 else tables[table].push({id:randomUUID(),created_at:new Date().toISOString(),...values});
 }
 data=tables[table].filter(r=>(r[column]===owner||table==='household_grocery_items')&&matches(r,url));
 if(req.method==='PATCH')data.forEach(r=>Object.assign(r,input));
 if(req.method==='DELETE')tables[table]=tables[table].filter(r=>!data.includes(r));
 if(url.searchParams.get('select')?.includes('recipes('))data=data.map(r=>({...r,recipes:recipes.find(x=>x.id===r.recipe_id)}));
 }
 data=data.filter(r=>matches(r,url));
 if(url.searchParams.has('order')){const [key,direction]=url.searchParams.get('order').split('.');data.sort((a,b)=>String(a[key]??'').localeCompare(String(b[key]??''))*(direction==='desc'?-1:1));}
 res.setHeader('content-range',`0-${Math.max(0,data.length-1)}/${data.length}`);
 if(req.headers.accept?.includes('vnd.pgrst.object'))data=data[0]??null;
 send(data);
 }catch(e){send({message:e.message},500);}
});
server.listen(8092,'127.0.0.1',()=>console.log('Isolated household UI fixture on '+base));
