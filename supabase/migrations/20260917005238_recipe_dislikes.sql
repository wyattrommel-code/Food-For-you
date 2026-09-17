alter table public.user_preferences add column disliked_recipe_ids uuid[] not null default '{}'::uuid[];
comment on column public.user_preferences.disliked_recipe_ids is 'Personal recipe exclusions; never included in shared household food preferences.';
