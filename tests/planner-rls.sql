-- Isolated test records; the entire test always rolls back.
begin;
create temp table planner_test_ids(a uuid,b uuid,recipe uuid,private_recipe uuid);
insert into planner_test_ids select gen_random_uuid(),gen_random_uuid(),(select id from public.recipes where is_user_created=false limit 1),gen_random_uuid();
insert into auth.users(id,email) select a,'planner-a-'||a||'@example.invalid' from planner_test_ids union all select b,'planner-b-'||b||'@example.invalid' from planner_test_ids;
insert into public.recipes(id,title,description,meal_time,prep_time_mins,effort_score,servings,tags,image_url,ingredients_list,shopping_list,recipe_steps,user_id,is_user_created)
select private_recipe,'Private planner test','Test only',array['dinner'],5,1,1,array['test'],'',array['1 apple'],array['1 apple'],array['Slice apple'],b,true from planner_test_ids;
grant select on planner_test_ids to authenticated;
select set_config('request.jwt.claim.sub',a::text,true) from planner_test_ids;
set local role authenticated;
insert into public.meal_plans(user_id,plan_date,meal_slot,recipe_id,recipe_title) select a,'2026-09-14','dinner',recipe,'Planner test' from planner_test_ids;
do $$ begin
  if (select count(*) from public.meal_plans where recipe_title='Planner test')<>1 then raise exception 'Owner read failed'; end if;
  begin
    insert into public.meal_plans(user_id,plan_date,recipe_id,recipe_title) select b,'2026-09-14',recipe,'Forbidden owner' from planner_test_ids;
    raise exception 'Cross-account insert succeeded';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.meal_plans(user_id,plan_date,recipe_id,recipe_title) select a,'2026-09-14',private_recipe,'Forbidden private recipe' from planner_test_ids;
    raise exception 'Private recipe reference succeeded';
  exception when insufficient_privilege then null; end;
  begin
    update public.meal_plans set user_id=(select b from planner_test_ids) where recipe_title='Planner test';
    raise exception 'Owner reassignment succeeded';
  exception when insufficient_privilege then null; end;
end $$;
update public.meal_plans set plan_date='2026-09-15',meal_slot='menu' where recipe_title='Planner test';
select set_config('request.jwt.claim.sub',b::text,true) from planner_test_ids;
do $$ declare n integer; begin
  if exists(select 1 from public.meal_plans where recipe_title='Planner test') then raise exception 'Cross-account read succeeded'; end if;
  delete from public.meal_plans where recipe_title='Planner test'; get diagnostics n=row_count;
  if n<>0 then raise exception 'Cross-account delete succeeded'; end if;
end $$;
select set_config('request.jwt.claim.sub',a::text,true) from planner_test_ids;
do $$ begin
  if not exists(select 1 from public.meal_plans where recipe_title='Planner test' and plan_date='2026-09-15' and meal_slot='menu') then raise exception 'Move failed'; end if;
end $$;
delete from public.meal_plans where recipe_title='Planner test';
reset role;
do $$ begin
  if has_table_privilege('anon','public.meal_plans','SELECT') then raise exception 'Anonymous grant found'; end if;
end $$;
select 'Planner owner CRUD, cross-account isolation, private-recipe protection and anonymous grants passed' as result;
rollback;
