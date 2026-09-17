begin;
do $$
declare a uuid:=gen_random_uuid(); b uuid:=gen_random_uuid(); h uuid:=gen_random_uuid(); r uuid:=gen_random_uuid(); state jsonb; affected integer;
begin
insert into auth.users(id,email) values(a,a||'@dislike-test.invalid'),(b,b||'@dislike-test.invalid');
insert into household_private.households(id,name,owner_id) values(h,'Dislike privacy test',a);
insert into household_private.members(user_id,household_id,display_name) values(a,h,'A'),(b,h,'B');
perform set_config('request.jwt.claim.sub',a::text,true);
set local role authenticated;
update public.user_preferences set disliked_recipe_ids=array[r] where user_id=a;
assert exists(select 1 from public.user_preferences where user_id=a and disliked_recipe_ids=array[r]),'Dislike not saved';
perform public.household_planning_action(h,'{"enabled":true,"sharePreferences":true}');
perform set_config('request.jwt.claim.sub',b::text,true);
assert not exists(select 1 from public.user_preferences where user_id=a),'Private dislikes leaked';
update public.user_preferences set disliked_recipe_ids='{}' where user_id=a;
get diagnostics affected=row_count; assert affected=0,'Partner modified dislikes';
state:=public.household_planning_action(h,'{"enabled":true,"sharePreferences":true}');
assert not exists(select 1 from jsonb_array_elements(state->'members') m where (m->'preferences') ? 'disliked_recipe_ids'),'Shared preferences leaked recipe dislikes';
perform set_config('request.jwt.claim.sub',a::text,true);
update public.user_preferences set disliked_recipe_ids='{}' where user_id=a;
assert exists(select 1 from public.user_preferences where user_id=a and cardinality(disliked_recipe_ids)=0),'Restore failed';
end $$;
rollback;
