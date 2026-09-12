-- Run as postgres in the SQL editor. All fixtures and changes roll back.
BEGIN;
CREATE TEMP TABLE security_fixture (
  owner_id uuid DEFAULT gen_random_uuid(), other_id uuid DEFAULT gen_random_uuid(),
  own_recipe uuid DEFAULT gen_random_uuid(), other_recipe uuid DEFAULT gen_random_uuid(),
  shared_recipe uuid DEFAULT gen_random_uuid()
);
INSERT INTO security_fixture DEFAULT VALUES;
GRANT SELECT ON security_fixture TO anon, authenticated;
CREATE FUNCTION pg_temp.assert_true(ok boolean, label text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN IF ok IS DISTINCT FROM true THEN RAISE EXCEPTION 'FAILED: %', label; END IF; END $$;
CREATE FUNCTION pg_temp.expect_denied(statement text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  BEGIN EXECUTE statement;
  EXCEPTION WHEN insufficient_privilege THEN RETURN;
  END;
  RAISE EXCEPTION 'FAILED: statement was permitted: %', statement;
END $$;
CREATE FUNCTION pg_temp.expect_zero(statement text) RETURNS void LANGUAGE plpgsql AS $$
DECLARE affected bigint;
BEGIN EXECUTE statement; GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 0 THEN RAISE EXCEPTION 'FAILED: changed % protected rows', affected; END IF;
END $$;

-- These auth fixtures send no email; they exercise the existing signup trigger.
INSERT INTO auth.users (id) SELECT owner_id FROM security_fixture UNION ALL SELECT other_id FROM security_fixture;
SELECT pg_temp.assert_true((SELECT count(*) = 2 FROM public.users WHERE id IN
  (SELECT owner_id FROM security_fixture UNION ALL SELECT other_id FROM security_fixture)), 'signup mirror');
INSERT INTO public.recipes (id, user_id, is_user_created, title, description, prep_time_mins, effort_score, image_url)
SELECT other_recipe, other_id, true, 'Security fixture private', 'Temporary', 1, 1, '' FROM security_fixture
UNION ALL SELECT shared_recipe, NULL::uuid, false, 'Security fixture shared', 'Temporary', 1, 1, '' FROM security_fixture;
INSERT INTO public.step_images (recipe_id,step_number,image_url)
SELECT other_recipe,1,'https://example.invalid/private.jpg' FROM security_fixture
UNION ALL SELECT shared_recipe,1,'https://example.invalid/shared.jpg' FROM security_fixture;

SET LOCAL ROLE anon;
DO $$ BEGIN PERFORM set_config('request.jwt.claims','{}',true); END $$;
SELECT pg_temp.assert_true(NOT EXISTS(SELECT 1 FROM public.recipes WHERE is_user_created), 'anonymous private read blocked');
SELECT pg_temp.assert_true((SELECT count(*)=1 FROM public.recipes WHERE id=(SELECT shared_recipe FROM security_fixture)), 'anonymous shared read');
SELECT pg_temp.assert_true((SELECT count(*)=1 FROM public.step_images WHERE recipe_id=(SELECT shared_recipe FROM security_fixture)), 'anonymous shared image read');
SELECT pg_temp.assert_true(NOT EXISTS(SELECT 1 FROM public.step_images WHERE recipe_id=(SELECT other_recipe FROM security_fixture)), 'anonymous private images blocked');
SELECT pg_temp.expect_denied($q$INSERT INTO public.recipes (title,description,prep_time_mins,effort_score,image_url) VALUES ('Unauthorized','',1,1,'')$q$);
SELECT pg_temp.expect_denied($q$INSERT INTO public.step_images (recipe_id,step_number,image_url) SELECT shared_recipe,2,'' FROM security_fixture$q$);
SELECT pg_temp.expect_denied($q$UPDATE public.step_images SET image_url='changed' WHERE recipe_id=(SELECT shared_recipe FROM security_fixture)$q$);
SELECT pg_temp.assert_true(NOT has_table_privilege(current_user,'public.recipes','TRUNCATE'), 'anonymous truncate revoked');
SELECT pg_temp.assert_true(NOT has_function_privilege(current_user,'public.handle_new_user()','EXECUTE')
  AND NOT has_function_privilege(current_user,'public.rls_auto_enable()','EXECUTE'), 'anonymous trigger RPCs revoked');

RESET ROLE;
SET LOCAL ROLE authenticated;
DO $$ BEGIN PERFORM set_config('request.jwt.claims','{}',true); END $$;
SELECT pg_temp.expect_denied($q$INSERT INTO public.recipes (user_id,is_user_created,title,description,prep_time_mins,effort_score,image_url) SELECT owner_id,true,'Missing claim','',1,1,'' FROM security_fixture$q$);
DO $$ BEGIN PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',(SELECT owner_id FROM security_fixture),'role','authenticated')::text,true); END $$;
SELECT pg_temp.assert_true(NOT has_table_privilege(current_user,'public.recipes','TRUNCATE'), 'authenticated truncate revoked');
SELECT pg_temp.assert_true(NOT has_function_privilege(current_user,'public.handle_new_user()','EXECUTE')
  AND NOT has_function_privilege(current_user,'public.rls_auto_enable()','EXECUTE'), 'authenticated trigger RPCs revoked');
INSERT INTO public.recipes (id,user_id,is_user_created,title,description,prep_time_mins,effort_score,image_url)
SELECT own_recipe,owner_id,true,'Security fixture own','Temporary',1,1,'' FROM security_fixture;
SELECT pg_temp.assert_true((SELECT count(*)=1 FROM public.recipes WHERE id=(SELECT own_recipe FROM security_fixture)), 'owner insert and read');
SELECT pg_temp.assert_true(NOT EXISTS(SELECT 1 FROM public.recipes WHERE id=(SELECT other_recipe FROM security_fixture)), 'other account private read blocked');
UPDATE public.recipes SET title='Owner edited' WHERE id=(SELECT own_recipe FROM security_fixture);
SELECT pg_temp.assert_true((SELECT title='Owner edited' FROM public.recipes WHERE id=(SELECT own_recipe FROM security_fixture)), 'owner update');
SELECT pg_temp.expect_denied($q$INSERT INTO public.recipes (user_id,is_user_created,title,description,prep_time_mins,effort_score,image_url) SELECT owner_id,false,'Unauthorized shared','',1,1,'' FROM security_fixture$q$);
SELECT pg_temp.expect_denied($q$INSERT INTO public.recipes (user_id,is_user_created,title,description,prep_time_mins,effort_score,image_url) SELECT other_id,true,'Forged owner','',1,1,'' FROM security_fixture$q$);
SELECT pg_temp.expect_denied($q$UPDATE public.recipes SET is_user_created=false WHERE id=(SELECT own_recipe FROM security_fixture)$q$);
SELECT pg_temp.expect_denied($q$UPDATE public.recipes SET user_id=(SELECT other_id FROM security_fixture) WHERE id=(SELECT own_recipe FROM security_fixture)$q$);
SELECT pg_temp.expect_zero($q$UPDATE public.recipes SET title='Unauthorized' WHERE id=(SELECT shared_recipe FROM security_fixture)$q$);
SELECT pg_temp.expect_zero($q$DELETE FROM public.recipes WHERE id=(SELECT shared_recipe FROM security_fixture)$q$);
SELECT pg_temp.expect_zero($q$UPDATE public.recipes SET title='Unauthorized' WHERE id=(SELECT other_recipe FROM security_fixture)$q$);
SELECT pg_temp.expect_zero($q$DELETE FROM public.recipes WHERE id=(SELECT other_recipe FROM security_fixture)$q$);

INSERT INTO public.step_images(recipe_id,step_number,image_url) SELECT own_recipe,1,'https://example.invalid/own.jpg' FROM security_fixture;
UPDATE public.step_images SET image_url='https://example.invalid/edited.jpg' WHERE recipe_id=(SELECT own_recipe FROM security_fixture);
SELECT pg_temp.assert_true((SELECT count(*)=1 FROM public.step_images WHERE recipe_id=(SELECT own_recipe FROM security_fixture)
  AND image_url='https://example.invalid/edited.jpg'), 'owner image insert and update');
SELECT pg_temp.assert_true(NOT EXISTS(SELECT 1 FROM public.step_images WHERE recipe_id=(SELECT other_recipe FROM security_fixture)), 'other account image read blocked');
SELECT pg_temp.expect_denied($q$INSERT INTO public.step_images(recipe_id,step_number,image_url) SELECT shared_recipe,2,'' FROM security_fixture$q$);
SELECT pg_temp.expect_denied($q$INSERT INTO public.step_images(recipe_id,step_number,image_url) SELECT other_recipe,2,'' FROM security_fixture$q$);
SELECT pg_temp.expect_denied($q$UPDATE public.step_images SET recipe_id=(SELECT shared_recipe FROM security_fixture) WHERE recipe_id=(SELECT own_recipe FROM security_fixture)$q$);
SELECT pg_temp.expect_zero($q$UPDATE public.step_images SET image_url='Unauthorized' WHERE recipe_id=(SELECT shared_recipe FROM security_fixture)$q$);
SELECT pg_temp.expect_zero($q$DELETE FROM public.step_images WHERE recipe_id=(SELECT other_recipe FROM security_fixture)$q$);
SELECT pg_temp.assert_true(NOT EXISTS(SELECT 1 FROM public.users WHERE id=(SELECT other_id FROM security_fixture)), 'other profile blocked');
SELECT pg_temp.assert_true(NOT EXISTS(SELECT 1 FROM public.user_preferences WHERE user_id=(SELECT other_id FROM security_fixture)), 'other preferences blocked');
UPDATE public.user_preferences SET liked_ingredients=ARRAY['test'] WHERE user_id=(SELECT owner_id FROM security_fixture);
SELECT pg_temp.assert_true((SELECT liked_ingredients=ARRAY['test'] FROM public.user_preferences WHERE user_id=(SELECT owner_id FROM security_fixture)), 'own preference update');
INSERT INTO public.user_favorites(user_id,recipe_id) SELECT owner_id,shared_recipe FROM security_fixture;
SELECT pg_temp.expect_denied($q$INSERT INTO public.user_favorites(user_id,recipe_id) SELECT owner_id,other_recipe FROM security_fixture$q$);
DELETE FROM public.step_images WHERE recipe_id=(SELECT own_recipe FROM security_fixture);
SELECT pg_temp.assert_true(NOT EXISTS(SELECT 1 FROM public.step_images WHERE recipe_id=(SELECT own_recipe FROM security_fixture)), 'owner image delete');
DELETE FROM public.recipes WHERE id=(SELECT own_recipe FROM security_fixture);
SELECT pg_temp.assert_true(NOT EXISTS(SELECT 1 FROM public.recipes WHERE id=(SELECT own_recipe FROM security_fixture)), 'owner recipe delete');

RESET ROLE;
SELECT 'All recipe security assertions passed; fixtures rolled back.' AS result;
ROLLBACK;
