create table public.meal_plan_purchases (
  plan_id uuid not null references public.meal_plans(id) on delete cascade,
  ingredient_key text not null check (char_length(ingredient_key) between 1 and 600),
  user_id uuid not null references auth.users(id) on delete cascade,
  checked boolean not null default false,
  primary key (plan_id,ingredient_key)
);
create index meal_plan_purchases_user_idx on public.meal_plan_purchases(user_id);
alter table public.meal_plan_purchases enable row level security;
revoke all on public.meal_plan_purchases from anon;
grant select,insert,update,delete on public.meal_plan_purchases to authenticated;
create policy "Read own planned purchases" on public.meal_plan_purchases for select to authenticated using ((select auth.uid())=user_id);
create policy "Add own planned purchases" on public.meal_plan_purchases for insert to authenticated with check (
 (select auth.uid())=user_id and exists(select 1 from public.meal_plans p where p.id=plan_id and p.user_id=(select auth.uid()))
);
create policy "Update own planned purchases" on public.meal_plan_purchases for update to authenticated using ((select auth.uid())=user_id) with check (
 (select auth.uid())=user_id and exists(select 1 from public.meal_plans p where p.id=plan_id and p.user_id=(select auth.uid()))
);
create policy "Remove own planned purchases" on public.meal_plan_purchases for delete to authenticated using ((select auth.uid())=user_id);
