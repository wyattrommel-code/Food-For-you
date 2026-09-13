-- Separate logins share groceries only. No existing recipes/preferences are changed.
CREATE SCHEMA IF NOT EXISTS household_private;
REVOKE ALL ON SCHEMA household_private FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA household_private TO authenticated;

CREATE TABLE household_private.households (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 name text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 60),
 owner_id uuid NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX households_owner_idx ON household_private.households(owner_id);
CREATE TABLE household_private.members (
 user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 household_id uuid NOT NULL REFERENCES household_private.households(id) ON DELETE CASCADE,
 display_name text NOT NULL CHECK(length(btrim(display_name)) BETWEEN 1 AND 60),
 joined_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX household_members_household_idx ON household_private.members(household_id);
-- Account deletion removes membership and transfers ownership to a remaining member.
CREATE FUNCTION household_private.member_removed() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE successor uuid;
BEGIN
 IF EXISTS(SELECT 1 FROM household_private.households WHERE id=OLD.household_id AND owner_id=OLD.user_id) THEN
  SELECT user_id INTO successor FROM household_private.members WHERE household_id=OLD.household_id ORDER BY joined_at,user_id LIMIT 1;
  IF successor IS NULL THEN DELETE FROM household_private.households WHERE id=OLD.household_id;
  ELSE UPDATE household_private.households SET owner_id=successor WHERE id=OLD.household_id; END IF;
 END IF;
 RETURN OLD;
END $$;
REVOKE ALL ON FUNCTION household_private.member_removed() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER household_member_removed AFTER DELETE ON household_private.members FOR EACH ROW EXECUTE FUNCTION household_private.member_removed();
CREATE TABLE household_private.invites (
 household_id uuid PRIMARY KEY REFERENCES household_private.households(id) ON DELETE CASCADE,
 token_hash text NOT NULL UNIQUE,
 expires_at timestamptz NOT NULL
);
CREATE TABLE household_private.join_attempts (
 user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 started_at timestamptz NOT NULL DEFAULT now(), attempts integer NOT NULL DEFAULT 0
);
CREATE TABLE household_private.operations (
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 operation_id text NOT NULL CHECK(length(operation_id) BETWEEN 1 AND 100),
 household_id uuid NOT NULL REFERENCES household_private.households(id) ON DELETE CASCADE,
 payload_hash text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(user_id,operation_id)
);
CREATE INDEX household_operations_household_idx ON household_private.operations(household_id);
ALTER TABLE household_private.households ENABLE ROW LEVEL SECURITY;
ALTER TABLE household_private.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE household_private.invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE household_private.join_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE household_private.operations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ALL TABLES IN SCHEMA household_private FROM PUBLIC, anon, authenticated;

CREATE FUNCTION household_private.current_household() RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT household_id FROM household_private.members WHERE user_id=(SELECT auth.uid())
$$;
REVOKE ALL ON FUNCTION household_private.current_household() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION household_private.current_household() TO authenticated;

CREATE TABLE public.household_grocery_items (
 household_id uuid NOT NULL REFERENCES household_private.households(id) ON DELETE CASCADE,
 item_key text NOT NULL CHECK(length(item_key) BETWEEN 1 AND 200),
 entry_id text NOT NULL CHECK(length(entry_id) BETWEEN 1 AND 120),
 name text NOT NULL CHECK(length(btrim(name)) BETWEEN 1 AND 200),
 category text NOT NULL CHECK(category IN ('protein','produce','pantry')),
 sources jsonb NOT NULL CHECK(jsonb_typeof(sources)='object' AND octet_length(sources::text)<=16000),
 checked boolean NOT NULL DEFAULT false,
 deleted boolean NOT NULL DEFAULT false,
 revision bigint NOT NULL DEFAULT 1,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(household_id,item_key)
);
ALTER TABLE public.household_grocery_items ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.household_grocery_items FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.household_grocery_items TO authenticated;
CREATE POLICY household_grocery_member_read ON public.household_grocery_items FOR SELECT TO authenticated
 USING(household_id=(SELECT household_private.current_household()));

-- Privileged membership operations are internal; public RPC wrappers run as invoker.
CREATE FUNCTION household_private.manage(p_action text,p_data jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid:=auth.uid(); hid uuid; h household_private.households; token text; roster jsonb; invite jsonb; n integer; target uuid;
BEGIN
 IF actor IS NULL OR NOT EXISTS(SELECT 1 FROM auth.users WHERE id=actor AND NOT coalesce(is_anonymous,false)) THEN RAISE EXCEPTION 'Sign in to use a household' USING ERRCODE='42501'; END IF;
 IF p_data IS NULL OR jsonb_typeof(p_data)<>'object' OR octet_length(p_data::text)>4000 THEN RAISE EXCEPTION 'Invalid household request'; END IF;
 IF p_action<>'get' THEN PERFORM pg_advisory_xact_lock(hashtext('mealsolved-household-membership')); END IF;
 SELECT household_id INTO hid FROM household_private.members WHERE user_id=actor;
 IF p_action='create' THEN
  IF hid IS NOT NULL THEN RAISE EXCEPTION 'Leave your current household before creating another'; END IF;
  INSERT INTO household_private.households(name,owner_id) VALUES(btrim(p_data->>'name'),actor) RETURNING id INTO hid;
  INSERT INTO household_private.members(user_id,household_id,display_name) VALUES(actor,hid,btrim(p_data->>'displayName'));
 ELSIF p_action='join' THEN
  IF hid IS NOT NULL THEN RAISE EXCEPTION 'Leave your current household before joining another'; END IF;
  INSERT INTO household_private.join_attempts(user_id,attempts) VALUES(actor,1)
  ON CONFLICT(user_id) DO UPDATE SET attempts=CASE WHEN household_private.join_attempts.started_at<now()-interval '10 minutes' THEN 1 ELSE household_private.join_attempts.attempts+1 END,
   started_at=CASE WHEN household_private.join_attempts.started_at<now()-interval '10 minutes' THEN now() ELSE household_private.join_attempts.started_at END RETURNING attempts INTO n;
  IF n>10 THEN RETURN jsonb_build_object('error','Too many attempts. Wait 10 minutes before trying again.'); END IF;
  token:=lower(regexp_replace(coalesce(p_data->>'code',''),'[\s-]','','g'));
  IF token!~'^[a-f0-9]{32}$' THEN RETURN jsonb_build_object('error','This invitation is invalid or expired. Ask for a new code.'); END IF;
  SELECT household_id INTO hid FROM household_private.invites WHERE token_hash=encode(extensions.digest(token,'sha256'),'hex') AND expires_at>now();
  IF hid IS NULL THEN RETURN jsonb_build_object('error','This invitation is invalid or expired. Ask for a new code.'); END IF;
  PERFORM 1 FROM household_private.households WHERE id=hid FOR UPDATE;
  IF (SELECT count(*) FROM household_private.members WHERE household_id=hid)>=8 THEN RETURN jsonb_build_object('error','This household already has eight members.'); END IF;
  INSERT INTO household_private.members(user_id,household_id,display_name) VALUES(actor,hid,btrim(p_data->>'displayName'));
  DELETE FROM household_private.invites WHERE household_id=hid;
 ELSIF p_action IN ('invite','revoke','remove','leave','rename') THEN
  SELECT * INTO h FROM household_private.households WHERE id=hid FOR UPDATE;
  IF h.id IS NULL THEN RAISE EXCEPTION 'Household access has changed' USING ERRCODE='42501'; END IF;
  IF p_action='leave' THEN
   IF h.owner_id=actor THEN
    SELECT user_id INTO target FROM household_private.members WHERE household_id=hid AND user_id<>actor ORDER BY joined_at,user_id LIMIT 1;
    IF target IS NULL THEN DELETE FROM household_private.households WHERE id=hid;
    ELSE UPDATE household_private.households SET owner_id=target WHERE id=hid;
     DELETE FROM household_private.members WHERE user_id=actor;
     DELETE FROM household_private.invites WHERE household_id=hid;
    END IF;
   ELSE DELETE FROM household_private.members WHERE user_id=actor; END IF;
   RETURN jsonb_build_object('household',NULL);
  END IF;
  IF h.owner_id<>actor THEN RAISE EXCEPTION 'Only the household owner can do that' USING ERRCODE='42501'; END IF;
  IF p_action='invite' THEN
   token:=encode(extensions.gen_random_bytes(16),'hex');
   INSERT INTO household_private.invites VALUES(hid,encode(extensions.digest(token,'sha256'),'hex'),now()+interval '24 hours')
   ON CONFLICT(household_id) DO UPDATE SET token_hash=EXCLUDED.token_hash,expires_at=EXCLUDED.expires_at;
   invite:=jsonb_build_object('code',upper(token),'expiresAt',now()+interval '24 hours');
  ELSIF p_action='revoke' THEN DELETE FROM household_private.invites WHERE household_id=hid;
  ELSIF p_action='rename' THEN UPDATE household_private.households SET name=btrim(p_data->>'name') WHERE id=hid;
  ELSE
   target:=(p_data->>'userId')::uuid;
   IF target=actor THEN RAISE EXCEPTION 'Use Leave household to leave'; END IF;
   DELETE FROM household_private.members WHERE household_id=hid AND user_id=target;
   DELETE FROM household_private.invites WHERE household_id=hid;
  END IF;
 ELSIF p_action<>'get' THEN RAISE EXCEPTION 'Unknown household action'; END IF;
 SELECT * INTO h FROM household_private.households WHERE id=hid;
 IF h.id IS NULL THEN RETURN jsonb_build_object('household',NULL); END IF;
 SELECT jsonb_agg(jsonb_build_object('userId',user_id,'name',display_name,'isOwner',user_id=h.owner_id) ORDER BY joined_at,user_id) INTO roster FROM household_private.members WHERE household_id=hid;
 RETURN jsonb_build_object('household',jsonb_build_object('id',hid,'name',h.name,'ownerId',h.owner_id,'members',roster,'inviteExpiresAt',(SELECT expires_at FROM household_private.invites WHERE household_id=hid AND h.owner_id=actor)), 'invite',invite);
END $$;

CREATE FUNCTION household_private.apply_grocery(p_household uuid,p_operation jsonb) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid:=auth.uid(); op text:=p_operation->>'opId'; kind text:=p_operation->>'kind'; item jsonb; old public.household_grocery_items; sources jsonb; signature text; prev text;
BEGIN
 IF actor IS NULL THEN RAISE EXCEPTION 'Sign in first' USING ERRCODE='42501'; END IF;
 PERFORM 1 FROM household_private.households WHERE id=p_household FOR UPDATE;
 IF NOT EXISTS(SELECT 1 FROM household_private.members WHERE user_id=actor AND household_id=p_household) THEN RAISE EXCEPTION 'Household access has changed' USING ERRCODE='42501'; END IF;
 IF p_operation IS NULL OR jsonb_typeof(p_operation)<>'object' OR octet_length(p_operation::text)>100000 OR op IS NULL OR length(op) NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'Invalid grocery request'; END IF;
 signature:=md5(p_household::text||p_operation::text);
 SELECT payload_hash INTO prev FROM household_private.operations WHERE user_id=actor AND operation_id=op;
 IF prev IS NOT NULL THEN
  IF prev<>signature THEN RAISE EXCEPTION 'Operation ID was already used'; END IF;
  RETURN;
 END IF;
 IF kind NOT IN ('add','check','remove','remove_recipe') OR kind IS NULL OR jsonb_typeof(p_operation->'items') IS DISTINCT FROM 'array' OR jsonb_array_length(p_operation->'items') NOT BETWEEN 1 AND 500 THEN RAISE EXCEPTION 'Invalid grocery operation'; END IF;
 FOR item IN SELECT value FROM jsonb_array_elements(p_operation->'items') LOOP
  IF length(item->>'id') NOT BETWEEN 1 AND 200 OR item->>'id' IS NULL THEN RAISE EXCEPTION 'Invalid grocery item'; END IF;
  SELECT * INTO old FROM public.household_grocery_items WHERE household_id=p_household AND item_key=item->>'id';
  IF kind='add' THEN
   sources:=item->'sources';
   IF jsonb_typeof(sources) IS DISTINCT FROM 'object' OR sources='{}'::jsonb OR EXISTS(SELECT 1 FROM jsonb_each(sources) s WHERE length(s.key)>100 OR jsonb_typeof(s.value)<>'string' OR length(s.value#>>'{}') NOT BETWEEN 1 AND 200) THEN RAISE EXCEPTION 'Invalid recipe sources'; END IF;
   IF item->>'id' IS DISTINCT FROM lower(btrim(item->>'name')) THEN RAISE EXCEPTION 'Invalid item name'; END IF;
   IF old.household_id IS NULL OR old.deleted THEN
    INSERT INTO public.household_grocery_items(household_id,item_key,entry_id,name,category,sources,checked)
    VALUES(p_household,item->>'id',item->>'entryId',btrim(item->>'name'),item->>'category',sources,coalesce((item->>'checked')::boolean,false))
    ON CONFLICT(household_id,item_key) DO UPDATE SET entry_id=EXCLUDED.entry_id,name=EXCLUDED.name,category=EXCLUDED.category,sources=EXCLUDED.sources,checked=EXCLUDED.checked,deleted=false,revision=1,created_at=now(),updated_at=now();
   ELSIF old.sources||sources IS DISTINCT FROM old.sources THEN
    UPDATE public.household_grocery_items SET sources=old.sources||sources,revision=revision+1,updated_at=now() WHERE household_id=p_household AND item_key=old.item_key;
   END IF;
  ELSIF NOT coalesce(old.deleted,true) AND old.entry_id=item->>'entryId' THEN
   IF kind='check' THEN
    IF jsonb_typeof(item->'checked') IS DISTINCT FROM 'boolean' THEN RAISE EXCEPTION 'Checked state required'; END IF;
    UPDATE public.household_grocery_items SET checked=(item->>'checked')::boolean,revision=revision+1,updated_at=now() WHERE household_id=p_household AND item_key=old.item_key;
   ELSIF kind='remove' AND old.revision=(item->>'revision')::bigint THEN
    UPDATE public.household_grocery_items SET deleted=true,revision=revision+1,updated_at=now() WHERE household_id=p_household AND item_key=old.item_key;
   ELSIF kind='remove_recipe' AND old.sources ? (item->>'recipeId') THEN
    sources:=old.sources-(item->>'recipeId');
    UPDATE public.household_grocery_items SET sources=sources,deleted=(sources='{}'::jsonb),revision=revision+1,updated_at=now() WHERE household_id=p_household AND item_key=old.item_key;
   END IF;
  END IF;
 END LOOP;
 IF (SELECT count(*) FROM public.household_grocery_items WHERE household_id=p_household AND NOT deleted)>500 THEN RAISE EXCEPTION 'A household list can hold up to 500 items'; END IF;
 INSERT INTO household_private.operations(user_id,operation_id,household_id,payload_hash) VALUES(actor,op,p_household,signature);
END $$;
REVOKE ALL ON FUNCTION household_private.manage(text,jsonb), household_private.apply_grocery(uuid,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION household_private.manage(text,jsonb), household_private.apply_grocery(uuid,jsonb) TO authenticated;
CREATE FUNCTION public.household_action(p_action text,p_data jsonb DEFAULT '{}'::jsonb) RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT household_private.manage(p_action,p_data) $$;
CREATE FUNCTION public.household_grocery_apply(p_household uuid,p_operation jsonb) RETURNS void LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT household_private.apply_grocery(p_household,p_operation) $$;
REVOKE ALL ON FUNCTION public.household_action(text,jsonb),public.household_grocery_apply(uuid,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.household_action(text,jsonb),public.household_grocery_apply(uuid,jsonb) TO authenticated;
-- Soft deletions emit authorized UPDATE events, not unfiltered row deletions.
ALTER PUBLICATION supabase_realtime ADD TABLE public.household_grocery_items;
