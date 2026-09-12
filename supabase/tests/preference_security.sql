-- Temporary fixtures only. No real user's preferences are changed.
BEGIN;
CREATE TEMP TABLE preference_fixture(owner_id uuid DEFAULT gen_random_uuid(), other_id uuid DEFAULT gen_random_uuid());
INSERT INTO preference_fixture DEFAULT VALUES;
GRANT SELECT ON preference_fixture TO anon, authenticated;
CREATE FUNCTION pg_temp.assert_pref(ok boolean,label text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN IF ok IS DISTINCT FROM true THEN RAISE EXCEPTION 'FAILED: %',label; END IF; END $$;
INSERT INTO auth.users(id) SELECT owner_id FROM preference_fixture UNION ALL SELECT other_id FROM preference_fixture;
SELECT pg_temp.assert_pref((SELECT relrowsecurity FROM pg_class WHERE oid='public.user_preferences'::regclass),'RLS enabled');
SET LOCAL ROLE authenticated;
DO $$ BEGIN PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',(SELECT owner_id FROM preference_fixture),'role','authenticated')::text,true); END $$;
UPDATE public.user_preferences SET diet_style='vegetarian',preferred_meal_styles=ARRAY['pasta','rice'],household_size=2,max_cook_time_mins=30,prefer_easy=true,onboarding_completed_at=now() WHERE user_id=(SELECT owner_id FROM preference_fixture);
SELECT pg_temp.assert_pref((SELECT diet_style='vegetarian' AND household_size=2 AND preferred_meal_styles=ARRAY['pasta','rice'] AND max_cook_time_mins=30 AND prefer_easy AND onboarding_completed_at IS NOT NULL FROM public.user_preferences WHERE user_id=(SELECT owner_id FROM preference_fixture)),'owner saves and reads all setup answers');
SELECT pg_temp.assert_pref(NOT EXISTS(SELECT 1 FROM public.user_preferences WHERE user_id=(SELECT other_id FROM preference_fixture)),'other preferences hidden');
DO $$ DECLARE n integer; BEGIN
  UPDATE public.user_preferences SET household_size=6 WHERE user_id=(SELECT other_id FROM preference_fixture);
  GET DIAGNOSTICS n=ROW_COUNT;
  IF n<>0 THEN RAISE EXCEPTION 'Other account preferences changed'; END IF;
  BEGIN
    UPDATE public.user_preferences SET user_id=(SELECT other_id FROM preference_fixture) WHERE user_id=(SELECT owner_id FROM preference_fixture);
    RAISE EXCEPTION 'Owner reassignment permitted';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    UPDATE public.user_preferences SET household_size=0 WHERE user_id=(SELECT owner_id FROM preference_fixture);
    RAISE EXCEPTION 'Invalid household size permitted';
  EXCEPTION WHEN check_violation THEN NULL; END;
END $$;
-- Existing clients may still update only their old preference arrays.
UPDATE public.user_preferences SET liked_ingredients=ARRAY['tomato'] WHERE user_id=(SELECT owner_id FROM preference_fixture);
SELECT pg_temp.assert_pref((SELECT household_size=2 AND diet_style='vegetarian' FROM public.user_preferences WHERE user_id=(SELECT owner_id FROM preference_fixture)),'legacy field update preserves setup answers');
RESET ROLE;
SET LOCAL ROLE anon;
DO $$ BEGIN
  PERFORM set_config('request.jwt.claims','{}',true);
  BEGIN
    IF EXISTS(SELECT 1 FROM public.user_preferences) THEN RAISE EXCEPTION 'Anonymous preferences visible'; END IF;
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
SELECT 'Preference isolation and field checks passed; fixtures rolled back.' AS result;
ROLLBACK;
