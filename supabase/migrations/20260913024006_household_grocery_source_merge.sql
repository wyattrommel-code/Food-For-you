CREATE OR REPLACE FUNCTION household_private.apply_grocery(p_household uuid,p_operation jsonb) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid:=auth.uid(); op text:=p_operation->>'opId'; kind text:=p_operation->>'kind'; item jsonb; old public.household_grocery_items; v_sources jsonb; signature text; prev text;
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
   v_sources:=item->'sources';
   IF jsonb_typeof(v_sources) IS DISTINCT FROM 'object' OR v_sources='{}'::jsonb OR EXISTS(SELECT 1 FROM jsonb_each(v_sources) s WHERE length(s.key)>100 OR jsonb_typeof(s.value)<>'string' OR length(s.value#>>'{}') NOT BETWEEN 1 AND 200) THEN RAISE EXCEPTION 'Invalid recipe sources'; END IF;
   IF item->>'id' IS DISTINCT FROM lower(btrim(item->>'name')) THEN RAISE EXCEPTION 'Invalid item name'; END IF;
   IF old.household_id IS NULL OR old.deleted THEN
    INSERT INTO public.household_grocery_items(household_id,item_key,entry_id,name,category,sources,checked)
    VALUES(p_household,item->>'id',item->>'entryId',btrim(item->>'name'),item->>'category',v_sources,coalesce((item->>'checked')::boolean,false))
    ON CONFLICT(household_id,item_key) DO UPDATE SET entry_id=EXCLUDED.entry_id,name=EXCLUDED.name,category=EXCLUDED.category,sources=EXCLUDED.sources,checked=EXCLUDED.checked,deleted=false,revision=1,created_at=now(),updated_at=now();
   ELSIF old.sources||v_sources IS DISTINCT FROM old.sources THEN
    UPDATE public.household_grocery_items SET sources=old.sources||v_sources,revision=revision+1,updated_at=now() WHERE household_id=p_household AND item_key=old.item_key;
   END IF;
  ELSIF NOT coalesce(old.deleted,true) AND old.entry_id=item->>'entryId' THEN
   IF kind='check' THEN
    IF jsonb_typeof(item->'checked') IS DISTINCT FROM 'boolean' THEN RAISE EXCEPTION 'Checked state required'; END IF;
    UPDATE public.household_grocery_items SET checked=(item->>'checked')::boolean,revision=revision+1,updated_at=now() WHERE household_id=p_household AND item_key=old.item_key;
   ELSIF kind='remove' AND old.revision=(item->>'revision')::bigint THEN
    UPDATE public.household_grocery_items SET deleted=true,revision=revision+1,updated_at=now() WHERE household_id=p_household AND item_key=old.item_key;
   ELSIF kind='remove_recipe' AND old.sources ? (item->>'recipeId') THEN
    v_sources:=old.sources-(item->>'recipeId');
    UPDATE public.household_grocery_items SET sources=v_sources,deleted=(v_sources='{}'::jsonb),revision=revision+1,updated_at=now() WHERE household_id=p_household AND item_key=old.item_key;
   END IF;
  END IF;
 END LOOP;
 IF (SELECT count(*) FROM public.household_grocery_items WHERE household_id=p_household AND NOT deleted)>500 THEN RAISE EXCEPTION 'A household list can hold up to 500 items'; END IF;
 INSERT INTO household_private.operations(user_id,operation_id,household_id,payload_hash) VALUES(actor,op,p_household,signature);
END $$;
