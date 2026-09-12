-- User-created recipes: ownership columns + RLS
-- Run in Supabase SQL Editor or via CLI after reviewing existing policies.

-- Columns
ALTER TABLE public.recipes
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users (id) ON DELETE CASCADE;

ALTER TABLE public.recipes
  ADD COLUMN IF NOT EXISTS is_user_created boolean NOT NULL DEFAULT false;

-- App expects servings on recipe rows (optional in UI)
ALTER TABLE public.recipes
  ADD COLUMN IF NOT EXISTS servings integer;

-- Relax prep time for quick user entries (schema may still require > 0 from seed)
-- If your table has CHECK (prep_time_mins > 0), user form enforces min 1.

-- Replace legacy recipe policies (names from schema.sql)
DROP POLICY IF EXISTS "recipes: authenticated read" ON public.recipes;
DROP POLICY IF EXISTS "recipes: authenticated insert" ON public.recipes;
DROP POLICY IF EXISTS "recipes: own update" ON public.recipes;
DROP POLICY IF EXISTS "recipes: own delete" ON public.recipes;

-- SELECT: catalog rows OR the signed-in owner's private recipes
CREATE POLICY "Users can read own created recipes"
  ON public.recipes FOR SELECT
  USING (
    is_user_created = false
    OR auth.uid() = user_id
  );

CREATE POLICY "Users can insert own recipes"
  ON public.recipes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own recipes"
  ON public.recipes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own recipes"
  ON public.recipes FOR DELETE
  USING (auth.uid() = user_id);
