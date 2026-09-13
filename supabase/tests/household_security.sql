-- All identities and writes are temporary. Roll back the complete test transaction.
BEGIN;
CREATE TEMP TABLE household_fixture(a uuid DEFAULT gen_random_uuid(),b uuid DEFAULT gen_random_uuid(),c uuid DEFAULT gen_random_uuid(),d uuid DEFAULT gen_random_uuid(),household uuid,other_household uuid,code text,old_code text);
INSERT INTO household_fixture DEFAULT VALUES;
GRANT SELECT,UPDATE ON household_fixture TO authenticated;
CREATE FUNCTION pg_temp.hh_assert(ok boolean,label text) RETURNS void LANGUAGE plpgsql AS $$ BEGIN IF ok IS DISTINCT FROM true THEN RAISE EXCEPTION 'FAILED: %',label; END IF; END $$;
INSERT INTO auth.users(id) SELECT a FROM household_fixture UNION ALL SELECT b FROM household_fixture UNION ALL SELECT c FROM household_fixture UNION ALL SELECT d FROM household_fixture;
SELECT pg_temp.hh_assert((SELECT relrowsecurity FROM pg_class WHERE oid='public.household_grocery_items'::regclass),'shared grocery RLS enabled');
SET LOCAL ROLE authenticated;
DO $$ BEGIN PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',(SELECT a FROM household_fixture),'role','authenticated')::text,true); END $$;
UPDATE household_fixture SET household=(public.household_action('create','{"name":"Household test A","displayName":"Alex"}')->'household'->>'id')::uuid;
UPDATE household_fixture SET code=public.household_action('invite')->'invite'->>'code';
SELECT pg_temp.hh_assert(length((SELECT code FROM household_fixture))=32,'128-bit invitation returned');
SELECT public.household_grocery_apply((SELECT household FROM household_fixture),'{"opId":"test-add-a","kind":"add","items":[{"id":"milk","name":"milk","entryId":"a-milk","category":"pantry","sources":{"manual":"Manually added"},"checked":false}]}');
DO $$ BEGIN
 BEGIN INSERT INTO public.household_grocery_items(household_id,item_key,entry_id,name,category,sources) SELECT household,'bad','bad','bad','pantry','{}' FROM household_fixture; RAISE EXCEPTION 'Direct INSERT allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN UPDATE public.household_grocery_items SET household_id=gen_random_uuid(); RAISE EXCEPTION 'Direct reassignment allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN SELECT token_hash FROM household_private.invites; RAISE EXCEPTION 'Invitation hashes readable'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;

DO $$ BEGIN PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',(SELECT b FROM household_fixture),'role','authenticated')::text,true); END $$;
SELECT pg_temp.hh_assert(NOT EXISTS(SELECT 1 FROM public.household_grocery_items),'uninvited account cannot read list');
SELECT pg_temp.hh_assert((public.household_action('join',jsonb_build_object('displayName','Bailey','code',(SELECT code FROM household_fixture)))->'household'->>'id')::uuid=(SELECT household FROM household_fixture),'invited account joined');
SELECT pg_temp.hh_assert((SELECT count(*) FROM public.household_grocery_items)=1,'member can read shared groceries');
SELECT public.household_grocery_apply((SELECT household FROM household_fixture),'{"opId":"test-check-b","kind":"check","items":[{"id":"milk","entryId":"a-milk","checked":true}]}');
-- Exact replay must not increment the revision a second time.
SELECT public.household_grocery_apply((SELECT household FROM household_fixture),'{"opId":"test-check-b","kind":"check","items":[{"id":"milk","entryId":"a-milk","checked":true}]}');
SELECT pg_temp.hh_assert((SELECT checked AND revision=2 FROM public.household_grocery_items WHERE item_key='milk'),'idempotent check-off');
DO $$ BEGIN BEGIN PERFORM public.household_action('invite'); RAISE EXCEPTION 'Non-owner created invite'; EXCEPTION WHEN insufficient_privilege THEN NULL; END; END $$;

DO $$ BEGIN PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',(SELECT c FROM household_fixture),'role','authenticated')::text,true); END $$;
SELECT pg_temp.hh_assert(public.household_action('join',jsonb_build_object('displayName','Casey','code',(SELECT code FROM household_fixture))) ? 'error','invite only works once');
UPDATE household_fixture SET other_household=(public.household_action('create','{"name":"Household test B","displayName":"Casey"}')->'household'->>'id')::uuid;
SELECT pg_temp.hh_assert(NOT EXISTS(SELECT 1 FROM public.household_grocery_items),'different household cannot read rows');
DO $$ BEGIN BEGIN PERFORM public.household_grocery_apply((SELECT household FROM household_fixture),'{"opId":"intrusion","kind":"check","items":[{"id":"milk","entryId":"a-milk","checked":false}]}'); RAISE EXCEPTION 'Cross-household write allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END; END $$;

DO $$ BEGIN PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',(SELECT a FROM household_fixture),'role','authenticated')::text,true); END $$;
SELECT public.household_grocery_apply((SELECT household FROM household_fixture),'{"opId":"stale-clear","kind":"remove","items":[{"id":"milk","entryId":"a-milk","revision":1}]}');
SELECT pg_temp.hh_assert((SELECT NOT deleted AND checked FROM public.household_grocery_items WHERE item_key='milk'),'stale clear preserves newer partner check');
SELECT public.household_grocery_apply((SELECT household FROM household_fixture),'{"opId":"recipe-source","kind":"add","items":[{"id":"milk","name":"milk","entryId":"irrelevant","category":"pantry","sources":{"recipe-x":"Recipe X"},"checked":false},{"id":"bread","name":"bread","entryId":"a-bread","category":"pantry","sources":{"manual":"Manually added"},"checked":false}]}');
SELECT public.household_grocery_apply((SELECT household FROM household_fixture),'{"opId":"remove-recipe","kind":"remove_recipe","items":[{"id":"milk","entryId":"a-milk","recipeId":"recipe-x"}]}');
SELECT pg_temp.hh_assert((SELECT count(*) FROM public.household_grocery_items WHERE NOT deleted)=2,'recipe removal preserves manual items');
SELECT public.household_grocery_apply((SELECT household FROM household_fixture),'{"opId":"delete-old","kind":"remove","items":[{"id":"bread","entryId":"a-bread","revision":1}]}');
SELECT public.household_grocery_apply((SELECT household FROM household_fixture),'{"opId":"new-bread","kind":"add","items":[{"id":"bread","name":"bread","entryId":"new-bread","category":"pantry","sources":{"manual":"Manually added"},"checked":false}]}');
SELECT public.household_grocery_apply((SELECT household FROM household_fixture),'{"opId":"stale-check","kind":"check","items":[{"id":"bread","entryId":"a-bread","checked":true}]}');
SELECT pg_temp.hh_assert((SELECT NOT checked FROM public.household_grocery_items WHERE item_key='bread'),'old check cannot affect replacement item');
UPDATE household_fixture SET old_code=public.household_action('invite')->'invite'->>'code';
UPDATE household_fixture SET code=public.household_action('invite')->'invite'->>'code';
DO $$ BEGIN PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',(SELECT d FROM household_fixture),'role','authenticated')::text,true); END $$;
SELECT pg_temp.hh_assert(public.household_action('join',jsonb_build_object('displayName','Drew','code',(SELECT old_code FROM household_fixture))) ? 'error','rotating invitation revokes older code');
RESET ROLE;
UPDATE household_private.invites SET expires_at=now()-interval '1 minute' WHERE household_id=(SELECT household FROM household_fixture);
SET LOCAL ROLE authenticated;
SELECT pg_temp.hh_assert(public.household_action('join',jsonb_build_object('displayName','Drew','code',(SELECT code FROM household_fixture))) ? 'error','expired code rejected');
DO $$ DECLARE result jsonb; BEGIN FOR i IN 1..10 LOOP result:=public.household_action('join','{"code":"invalid","displayName":"Drew"}'); END LOOP; PERFORM pg_temp.hh_assert(result->>'error' LIKE 'Too many attempts%','join attempts limited'); END $$;
DO $$ BEGIN PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',(SELECT a FROM household_fixture),'role','authenticated')::text,true); END $$;
SELECT public.household_action('remove',jsonb_build_object('userId',(SELECT b FROM household_fixture)));
DO $$ BEGIN PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',(SELECT b FROM household_fixture),'role','authenticated')::text,true); END $$;
SELECT pg_temp.hh_assert(NOT EXISTS(SELECT 1 FROM public.household_grocery_items),'removed member loses read access');
DO $$ BEGIN BEGIN PERFORM public.household_grocery_apply((SELECT household FROM household_fixture),'{"opId":"after-removal","kind":"add","items":[{"id":"eggs","name":"eggs","entryId":"bad","category":"protein","sources":{"manual":"Manual"}}]}'); RAISE EXCEPTION 'Removed member wrote to list'; EXCEPTION WHEN insufficient_privilege THEN NULL; END; END $$;
-- Rejoin, then delete the owner account. The remaining member keeps the household.
DO $$ BEGIN PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',(SELECT a FROM household_fixture),'role','authenticated')::text,true); END $$;
UPDATE household_fixture SET code=public.household_action('invite')->'invite'->>'code';
DO $$ BEGIN PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',(SELECT b FROM household_fixture),'role','authenticated')::text,true); END $$;
SELECT public.household_action('join',jsonb_build_object('displayName','Bailey','code',(SELECT code FROM household_fixture)));
RESET ROLE;
DELETE FROM auth.users WHERE id=(SELECT a FROM household_fixture);
SELECT pg_temp.hh_assert((SELECT owner_id=(SELECT b FROM household_fixture) FROM household_private.households WHERE id=(SELECT household FROM household_fixture)),'account deletion transfers ownership');
SET LOCAL ROLE authenticated;
SELECT pg_temp.hh_assert((public.household_action('get')->'household'->>'ownerId')::uuid=(SELECT b FROM household_fixture),'remaining member becomes owner');
SELECT public.household_action('leave');
SELECT pg_temp.hh_assert(public.household_action('get')->'household'='null'::jsonb,'last member can leave');
RESET ROLE;
SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claims','{}',true);
DO $$ BEGIN
 BEGIN PERFORM public.household_action('get'); RAISE EXCEPTION 'Anonymous RPC allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM 1 FROM public.household_grocery_items; RAISE EXCEPTION 'Anonymous list access allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
SELECT 'Household access, invitations, shared edits, stale changes, removal and deletion checks passed. All fixtures rolled back.' AS result;
ROLLBACK;
