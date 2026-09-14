begin;
create temp table purchase_test_ids(a uuid,b uuid,pa uuid,pb uuid,recipe uuid);
insert into purchase_test_ids select gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),(select id from public.recipes where not is_user_created limit 1);
insert into auth.users(id,email) select a,'purchase-a-'||a||'@example.invalid' from purchase_test_ids union all select b,'purchase-b-'||b||'@example.invalid' from purchase_test_ids;
insert into public.meal_plans(id,user_id,plan_date,recipe_id,recipe_title) select pa,a,date '2026-09-14',recipe,'Purchase test A' from purchase_test_ids union all select pb,b,date '2026-09-14',recipe,'Purchase test B' from purchase_test_ids;
grant select on purchase_test_ids to authenticated;
select set_config('request.jwt.claim.sub',a::text,true) from purchase_test_ids;
set local role authenticated;
insert into public.meal_plan_purchases(plan_id,user_id,ingredient_key,checked) select pa,a,'1 cup milk',true from purchase_test_ids;
do $$ begin
 if (select count(*) from public.meal_plan_purchases where plan_id=(select pa from purchase_test_ids) and checked)<>1 then raise exception 'Owner purchase write/read failed'; end if;
 begin
  insert into public.meal_plan_purchases(plan_id,user_id,ingredient_key) select pb,a,'forbidden plan' from purchase_test_ids;
  raise exception 'Other owner plan allowed';
 exception when insufficient_privilege then null; end;
 begin
  update public.meal_plan_purchases set user_id=(select b from purchase_test_ids) where plan_id=(select pa from purchase_test_ids);
  raise exception 'Ownership reassignment allowed';
 exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub',b::text,true) from purchase_test_ids;
do $$ declare n integer; begin
 if exists(select 1 from public.meal_plan_purchases where plan_id=(select pa from purchase_test_ids)) then raise exception 'Other account read purchase'; end if;
 update public.meal_plan_purchases set checked=false where plan_id=(select pa from purchase_test_ids);get diagnostics n=row_count;if n<>0 then raise exception 'Other account updated purchase'; end if;
 delete from public.meal_plan_purchases where plan_id=(select pa from purchase_test_ids);get diagnostics n=row_count;if n<>0 then raise exception 'Other account deleted purchase'; end if;
end $$;
select set_config('request.jwt.claim.sub',a::text,true) from purchase_test_ids;
update public.meal_plan_purchases set checked=false where plan_id=(select pa from purchase_test_ids);
delete from public.meal_plans where id=(select pa from purchase_test_ids);
reset role;
do $$ begin
 if exists(select 1 from public.meal_plan_purchases where plan_id=(select pa from purchase_test_ids)) then raise exception 'Delete did not cascade'; end if;
 if has_table_privilege('anon','public.meal_plan_purchases','SELECT') then raise exception 'Anonymous grant found'; end if;
end $$;
select 'Purchase owner access, cross-account isolation, ownership checks and cleanup passed' as result;
rollback;
