-- Optional provenance; existing mobile builds ignore these extra columns.
ALTER TABLE public.recipes
  ADD COLUMN IF NOT EXISTS source_url text,
  ADD COLUMN IF NOT EXISTS source_name text;
COMMENT ON COLUMN public.recipes.source_url IS 'Original recipe or community meal idea. Mealsolved adaptations are not endorsements.';
COMMENT ON COLUMN public.recipes.source_name IS 'Display attribution for the original source.';
