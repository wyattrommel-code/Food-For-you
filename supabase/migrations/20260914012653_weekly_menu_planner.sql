create table public.meal_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_date date not null,
  meal_slot text not null default 'menu' check (meal_slot in ('menu','breakfast','lunch','dinner','snack','dessert','smoothie')),
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  recipe_title text not null check (char_length(recipe_title) between 1 and 300),
  created_at timestamptz not null default now(),
  unique(user_id,plan_date,meal_slot,recipe_id)
);
create index meal_plans_recipe_idx on public.meal_plans(recipe_id);
alter table public.meal_plans enable row level security;
revoke all on public.meal_plans from anon;
grant select,insert,update,delete on public.meal_plans to authenticated;
create policy "Read own menu" on public.meal_plans for select to authenticated using ((select auth.uid())=user_id);
create policy "Add own accessible recipe" on public.meal_plans for insert to authenticated with check (
  (select auth.uid())=user_id and exists(select 1 from public.recipes r where r.id=recipe_id and (r.is_user_created=false or r.user_id=(select auth.uid())))
);
create policy "Move own accessible recipe" on public.meal_plans for update to authenticated using ((select auth.uid())=user_id) with check (
  (select auth.uid())=user_id and exists(select 1 from public.recipes r where r.id=recipe_id and (r.is_user_created=false or r.user_id=(select auth.uid())))
);
create policy "Remove own menu item" on public.meal_plans for delete to authenticated using ((select auth.uid())=user_id);
