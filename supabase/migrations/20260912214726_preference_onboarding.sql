-- Additive fields: older installed clients keep their four existing preference arrays.
ALTER TABLE public.user_preferences
  ADD COLUMN diet_style text NOT NULL DEFAULT 'any' CHECK (diet_style IN ('any','vegetarian','vegan')),
  ADD COLUMN preferred_meal_styles text[] NOT NULL DEFAULT '{}' CHECK (preferred_meal_styles <@ ARRAY['tacos','pasta','sandwiches','chicken','rice','breakfast','soup','meatless']::text[]),
  ADD COLUMN max_cook_time_mins integer CHECK (max_cook_time_mins IN (15,30,45,60)),
  ADD COLUMN prefer_easy boolean NOT NULL DEFAULT false,
  ADD COLUMN household_size integer CHECK (household_size BETWEEN 1 AND 6),
  ADD COLUMN onboarding_completed_at timestamptz;

-- Existing authenticated-only ownership policy continues to cover all new columns.
-- No backfill of completion: returning users review their existing choices once.
COMMENT ON COLUMN public.user_preferences.max_cook_time_mins IS 'Usual cooking time, used as a ranking preference, not an exclusion.';
COMMENT ON COLUMN public.user_preferences.onboarding_completed_at IS 'Set after completing or explicitly skipping preference setup.';
