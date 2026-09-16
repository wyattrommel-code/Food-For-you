-- Run with an administrative SQL connection. Every fixture is rolled back.
begin;
do $$
declare
 a uuid:=gen_random_uuid(); b uuid:=gen_random_uuid(); outsider uuid:=gen_random_uuid();
 h uuid:=gen_random_uuid(); other_h uuid:=gen_random_uuid();
 recipe uuid; private_recipe uuid:=gen_random_uuid(); plan uuid:=gen_random_uuid(); personal uuid:=gen_random_uuid();
 state jsonb; blocked boolean; affected integer;
begin
 insert into auth.users(id,email) values(a,a||'@household-test.invalid'),(b,b||'@household-test.invalid'),(outsider,outsider||'@household-test.invalid');
 insert into household_private.households(id,name,owner_id) values(h,'Household test',a),(other_h,'Other test',outsider);
 insert into household_private.members(user_id,household_id,display_name) values(a,h,'Alex'),(b,h,'Blair'),(outsider,other_h,'Other');
 update public.user_preferences set disliked_ingredients=array['peanut'],diet_style='vegan' where user_id=b;
 select id into strict recipe from public.recipes where is_user_created=false limit 1;
 insert into public.recipes(id,user_id,is_user_created,title,description,prep_time_mins,effort_score,image_url)
 values(private_recipe,a,true,'Private test meal','Rollback fixture',5,1,'https://example.invalid/photo.jpg');
 insert into public.meal_plans(id,user_id,plan_date,recipe_id,recipe_title) values(personal,a,current_date,recipe,'Personal test meal');

 perform set_config('request.jwt.claim.sub',a::text,true);
 set local role authenticated;
 state:=public.household_planning_action(h,null);
 assert state#>>'{settings,enabled}'='false','Planning must start opted out';
 assert state#>>'{settings,defaultPlanner}'='personal','Personal must be default';
 assert not exists(select 1 from jsonb_array_elements(state->'members') m where m->'preferences'<>'null'::jsonb),'Unshared preferences leaked';
 blocked:=false;
 begin insert into public.household_meal_plans(household_id,plan_date,recipe_id,recipe_title) values(h,current_date,recipe,'Blocked');
 exception when insufficient_privilege then blocked:=true; end;
 assert blocked,'Opted-out member inserted a plan';
 state:=public.household_planning_action(h,'{"enabled":true,"defaultPlanner":"household","sharePreferences":true}');
 assert state#>>'{settings,defaultPlanner}'='household','Default not saved';
 insert into public.household_meal_plans(id,household_id,plan_date,meal_slot,recipe_id,recipe_title)
 values(plan,h,current_date,'dinner',recipe,'Shared dinner');
 -- Match the app's retry-safe insert without requiring broad UPDATE privileges.
 insert into public.household_meal_plans(household_id,plan_date,meal_slot,recipe_id,recipe_title)
 values(h,current_date,'dinner',recipe,'Shared dinner') on conflict(household_id,plan_date,meal_slot,recipe_id) do nothing;
 blocked:=false;
 begin insert into public.household_meal_plans(household_id,plan_date,recipe_id,recipe_title) values(h,current_date,private_recipe,'Private');
 exception when insufficient_privilege then blocked:=true; end;
 assert blocked,'Private recipe shared';
 blocked:=false;
 begin update public.household_meal_plans set created_by=b where id=plan;
 exception when insufficient_privilege then blocked:=true; end;
 assert blocked,'Creator could be changed';

 perform set_config('request.jwt.claim.sub',b::text,true);
 assert not exists(select 1 from public.household_meal_plans where id=plan),'Opted-out partner can read plans';
 assert not exists(select 1 from public.meal_plans where id=personal),'Personal planner leaked to partner';
 assert not exists(select 1 from public.user_preferences where user_id=a),'Raw preferences leaked';
 state:=public.household_planning_action(h,'{"enabled":true,"sharePreferences":true}');
 assert state#>>'{settings,defaultPlanner}'='personal','One member changed another default';
 assert exists(select 1 from public.household_meal_plans where id=plan),'Opted-in partner cannot read';
 update public.household_meal_plans set plan_date=current_date+1,meal_slot='lunch' where id=plan;
 get diagnostics affected=row_count; assert affected=1,'Partner could not move shared meal';
 insert into public.household_meal_plan_purchases(plan_id,household_id,ingredient_key,checked) values(plan,h,'rice',true)
 on conflict(plan_id,ingredient_key) do update set checked=excluded.checked;

 perform set_config('request.jwt.claim.sub',a::text,true);
 state:=public.household_planning_action(h,null);
 assert exists(select 1 from jsonb_array_elements(state->'members') m where m->>'userId'=b::text and m#>>'{preferences,diet_style}'='vegan'),'Consented preferences unavailable';
 assert exists(select 1 from public.household_meal_plan_purchases where plan_id=plan and checked),'Partner purchase not shared';
 perform public.household_planning_action(h,'{"enabled":false}');
 state:=public.household_planning_action(h,null);
 assert state#>>'{settings,defaultPlanner}'='personal','Opt out must reset default';
 assert not exists(select 1 from public.household_meal_plans where id=plan),'Opt out did not revoke plan reads';
 assert not exists(select 1 from public.household_meal_plan_purchases where plan_id=plan),'Opt out did not revoke purchase reads';

 perform set_config('request.jwt.claim.sub',outsider::text,true);
 perform public.household_planning_action(other_h,'{"enabled":true}');
 assert not exists(select 1 from public.household_meal_plans where id=plan),'Other household can read plans';
 blocked:=false;
 begin perform public.household_planning_action(h,'{"sharePreferences":true}');
 exception when insufficient_privilege then blocked:=true; end;
 assert blocked,'Other household accessed preference RPC';
 blocked:=false;
 begin insert into public.household_meal_plan_purchases(plan_id,household_id,ingredient_key,checked) values(plan,other_h,'wrong household',true);
 exception when foreign_key_violation then blocked:=true; end;
 assert blocked,'Purchase can reference another household plan';
 update public.household_meal_plans set plan_date=current_date+2 where id=plan;
 get diagnostics affected=row_count; assert affected=0,'Other household moved a meal';

 perform set_config('request.jwt.claim.sub',b::text,true);
 perform public.household_planning_action(h,'{"sharePreferences":false}');
 perform set_config('request.jwt.claim.sub',a::text,true);
 state:=public.household_planning_action(h,null);
 assert exists(select 1 from jsonb_array_elements(state->'members') m where m->>'userId'=b::text and m->'preferences'='null'::jsonb),'Consent withdrawal failed';
 reset role;
 delete from household_private.members where user_id=b;
 perform set_config('request.jwt.claim.sub',b::text,true);
 set local role authenticated;
 assert not exists(select 1 from public.household_meal_plans where id=plan),'Removed member can read plans';
 blocked:=false;
 begin perform public.household_planning_action(h,null);
 exception when insufficient_privilege then blocked:=true; end;
 assert blocked,'Removed member can access preferences';
 reset role;
 set local role anon;
 blocked:=false;
 begin perform * from public.household_meal_plans;
 exception when insufficient_privilege then blocked:=true; end;
 assert blocked,'Anonymous plan access';
 blocked:=false;
 begin perform public.household_planning_action(h,null);
 exception when insufficient_privilege then blocked:=true; end;
 assert blocked,'Anonymous settings access';
 reset role;
end $$;
select 'PASS: opt-in, personal isolation, partner planning/shopping, consent, removal, cross-household and anonymous access' as result;
rollback;
