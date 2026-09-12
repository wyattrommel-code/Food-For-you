-- Reviewed against live Food for You schema on 2026-09-12.
-- Shared recipes remain readable; only trusted administration can publish them.
-- Apply atomically. Existing user content is not changed.
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own created recipes" ON public.recipes;
DROP POLICY IF EXISTS "Users can insert own recipes" ON public.recipes;
DROP POLICY IF EXISTS "Users can update own recipes" ON public.recipes;
DROP POLICY IF EXISTS "Users can delete own recipes" ON public.recipes;
CREATE POLICY recipes_shared_read ON public.recipes FOR SELECT TO anon, authenticated
  USING (NOT is_user_created);
CREATE POLICY recipes_owner_read ON public.recipes FOR SELECT TO authenticated
  USING (is_user_created AND user_id = (SELECT auth.uid()));
CREATE POLICY recipes_owner_insert ON public.recipes FOR INSERT TO authenticated
  WITH CHECK (is_user_created AND user_id = (SELECT auth.uid()));
CREATE POLICY recipes_owner_update ON public.recipes FOR UPDATE TO authenticated
  USING (is_user_created AND user_id = (SELECT auth.uid()))
  WITH CHECK (is_user_created AND user_id = (SELECT auth.uid()));
CREATE POLICY recipes_owner_delete ON public.recipes FOR DELETE TO authenticated
  USING (is_user_created AND user_id = (SELECT auth.uid()));

ALTER TABLE public.step_images ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read" ON public.step_images;
DROP POLICY IF EXISTS "Public insert" ON public.step_images;
DROP POLICY IF EXISTS "Public update" ON public.step_images;
CREATE POLICY step_images_visible_recipe_read ON public.step_images FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.recipes r WHERE r.id = step_images.recipe_id));
CREATE POLICY step_images_owner_insert ON public.step_images FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.recipes r WHERE r.id = step_images.recipe_id
    AND r.is_user_created AND r.user_id = (SELECT auth.uid())));
CREATE POLICY step_images_owner_update ON public.step_images FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.recipes r WHERE r.id = step_images.recipe_id
    AND r.is_user_created AND r.user_id = (SELECT auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.recipes r WHERE r.id = step_images.recipe_id
    AND r.is_user_created AND r.user_id = (SELECT auth.uid())));
CREATE POLICY step_images_owner_delete ON public.step_images FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.recipes r WHERE r.id = step_images.recipe_id
    AND r.is_user_created AND r.user_id = (SELECT auth.uid())));

ALTER POLICY "users: own row" ON public.users TO authenticated
  USING (id = (SELECT auth.uid())) WITH CHECK (id = (SELECT auth.uid()));
ALTER POLICY "prefs: own row" ON public.user_preferences TO authenticated
  USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));
ALTER POLICY "favorites: own rows" ON public.user_favorites TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()) AND EXISTS
    (SELECT 1 FROM public.recipes r WHERE r.id = user_favorites.recipe_id));

-- TRUNCATE bypasses row policies; client roles need only ordinary row operations.
REVOKE ALL ON public.recipes, public.step_images, public.users,
  public.user_preferences, public.user_favorites FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.recipes, public.step_images TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recipes, public.step_images,
  public.users, public.user_preferences, public.user_favorites TO authenticated;

-- Trigger functions run through their triggers, not through the public RPC API.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;
ALTER FUNCTION public.handle_new_user() SET search_path = '';

CREATE INDEX IF NOT EXISTS recipes_user_id_idx ON public.recipes (user_id);
CREATE INDEX IF NOT EXISTS step_images_recipe_id_idx ON public.step_images (recipe_id);
