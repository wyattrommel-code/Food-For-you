-- Additive, opt-in sharing. Existing personal plans and preferences stay private.
alter table household_private.members
  add column planning_enabled boolean not null default false,
  add column default_planner text not null default 'personal' check(default_planner in ('personal','household')),
  add column share_food_preferences boolean not null default false,
  add constraint household_default_requires_opt_in check(planning_enabled or default_planner='personal');

create function household_private.planning_household() returns uuid
language sql stable security definer set search_path='' as $$
  select household_id from household_private.members
  where user_id=(select auth.uid()) and planning_enabled and (select auth.uid()) is not null
$$;
revoke all on function household_private.planning_household() from public,anon;
grant execute on function household_private.planning_household() to authenticated;

create function household_private.planning_settings(p_household uuid,p_settings jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); member household_private.members; roster jsonb;
begin
  if actor is null then raise exception 'Sign in first' using errcode='42501'; end if;
  -- The same lock as membership changes prevents a leave/join racing an opt-in.
  perform pg_advisory_xact_lock(hashtext('mealsolved-household-membership'));
  select * into member from household_private.members where user_id=actor and household_id=p_household;
  if member.user_id is null then raise exception 'Household access has changed' using errcode='42501'; end if;
  if p_settings is not null then
    if jsonb_typeof(p_settings)<>'object' or octet_length(p_settings::text)>1000
      or exists(select 1 from jsonb_object_keys(p_settings) k where k not in ('enabled','defaultPlanner','sharePreferences'))
      or (p_settings ? 'enabled' and jsonb_typeof(p_settings->'enabled') is distinct from 'boolean')
      or (p_settings ? 'sharePreferences' and jsonb_typeof(p_settings->'sharePreferences') is distinct from 'boolean')
      or (p_settings ? 'defaultPlanner' and coalesce(p_settings->>'defaultPlanner','') not in ('personal','household'))
    then raise exception 'Invalid planning settings'; end if;
    update household_private.members set
      planning_enabled=coalesce((p_settings->>'enabled')::boolean,planning_enabled),
      default_planner=case when not coalesce((p_settings->>'enabled')::boolean,planning_enabled) then 'personal' else coalesce(p_settings->>'defaultPlanner',default_planner) end,
      share_food_preferences=coalesce((p_settings->>'sharePreferences')::boolean,share_food_preferences)
    where user_id=actor and household_id=p_household returning * into member;
  end if;
  select jsonb_agg(jsonb_build_object('userId',m.user_id,'name',m.display_name,
    'planningEnabled',m.planning_enabled,'sharingPreferences',m.share_food_preferences,
    'preferences',case when m.share_food_preferences then jsonb_build_object(
      'disliked_ingredients',coalesce(p.disliked_ingredients,'{}'::text[]),
      'disliked_cuisines',coalesce(p.disliked_cuisines,'{}'::text[]),
      'liked_ingredients',coalesce(p.liked_ingredients,'{}'::text[]),
      'liked_cuisines',coalesce(p.liked_cuisines,'{}'::text[]),
      'diet_style',coalesce(p.diet_style,'any'),
      'preferred_meal_styles',coalesce(p.preferred_meal_styles,'{}'::text[]),
      'max_cook_time_mins',p.max_cook_time_mins,'prefer_easy',coalesce(p.prefer_easy,false)
    ) else null end) order by m.joined_at,m.user_id) into roster
  from household_private.members m left join public.user_preferences p on p.user_id=m.user_id
  where m.household_id=p_household;
  return jsonb_build_object('householdId',p_household,'settings',jsonb_build_object(
    'enabled',member.planning_enabled,'defaultPlanner',member.default_planner,'sharePreferences',member.share_food_preferences),
    'members',coalesce(roster,'[]'::jsonb));
end $$;
revoke all on function household_private.planning_settings(uuid,jsonb) from public,anon;
grant execute on function household_private.planning_settings(uuid,jsonb) to authenticated;
create function public.household_planning_action(p_household uuid,p_settings jsonb default null) returns jsonb
language sql security invoker set search_path='' as $$ select household_private.planning_settings(p_household,p_settings) $$;
revoke all on function public.household_planning_action(uuid,jsonb) from public,anon;
grant execute on function public.household_planning_action(uuid,jsonb) to authenticated;

create table public.household_meal_plans (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references household_private.households(id) on delete cascade,
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  plan_date date not null,
  meal_slot text not null default 'menu' check(meal_slot in ('menu','breakfast','lunch','dinner','snack','dessert','smoothie')),
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  recipe_title text not null check(char_length(recipe_title) between 1 and 300),
  created_at timestamptz not null default now(),
  unique(household_id,plan_date,meal_slot,recipe_id),
  unique(id,household_id)
);
create index household_meal_plans_recipe_idx on public.household_meal_plans(recipe_id);
create index household_meal_plans_creator_idx on public.household_meal_plans(created_by);
alter table public.household_meal_plans enable row level security;
revoke all on public.household_meal_plans from public,anon,authenticated;
grant select,insert,delete on public.household_meal_plans to authenticated;
grant update(plan_date,meal_slot) on public.household_meal_plans to authenticated;
create policy "Opted in household reads plans" on public.household_meal_plans for select to authenticated
 using(household_id=(select household_private.planning_household()));
create policy "Opted in household adds public recipes" on public.household_meal_plans for insert to authenticated
 with check(household_id=(select household_private.planning_household()) and created_by=(select auth.uid())
 and exists(select 1 from public.recipes r where r.id=recipe_id and r.is_user_created=false));
create policy "Opted in household moves plans" on public.household_meal_plans for update to authenticated
 using(household_id=(select household_private.planning_household()))
 with check(household_id=(select household_private.planning_household()));
create policy "Opted in household removes plans" on public.household_meal_plans for delete to authenticated
 using(household_id=(select household_private.planning_household()));

create table public.household_meal_plan_purchases (
  plan_id uuid not null,
  household_id uuid not null,
  ingredient_key text not null check(char_length(ingredient_key) between 1 and 600),
  checked boolean not null default false,
  primary key(plan_id,ingredient_key),
  foreign key(plan_id,household_id) references public.household_meal_plans(id,household_id) on delete cascade
);
create index household_plan_purchases_household_idx on public.household_meal_plan_purchases(household_id);
alter table public.household_meal_plan_purchases enable row level security;
revoke all on public.household_meal_plan_purchases from public,anon,authenticated;
grant select,insert,update,delete on public.household_meal_plan_purchases to authenticated;
create policy "Opted in household reads purchases" on public.household_meal_plan_purchases for select to authenticated
 using(household_id=(select household_private.planning_household()));
create policy "Opted in household adds purchases" on public.household_meal_plan_purchases for insert to authenticated
 with check(household_id=(select household_private.planning_household()));
create policy "Opted in household checks purchases" on public.household_meal_plan_purchases for update to authenticated
 using(household_id=(select household_private.planning_household()))
 with check(household_id=(select household_private.planning_household()));
create policy "Opted in household removes purchases" on public.household_meal_plan_purchases for delete to authenticated
 using(household_id=(select household_private.planning_household()));
