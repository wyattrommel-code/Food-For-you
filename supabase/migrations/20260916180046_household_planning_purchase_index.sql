-- Cover both columns of the shared-plan foreign key for cascade operations.
create index household_plan_purchases_plan_household_idx
  on public.household_meal_plan_purchases(plan_id,household_id);
