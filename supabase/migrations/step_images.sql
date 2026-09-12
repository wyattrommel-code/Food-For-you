-- Optional per-step photos for cooking mode (recipe_id + step_number).
-- Run in Supabase SQL Editor if this table does not exist yet.

create table if not exists public.step_images (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  step_number int not null,
  image_url text not null,
  created_at timestamptz default now()
);

create index if not exists step_images_recipe_id_idx on public.step_images (recipe_id);

alter table public.step_images enable row level security;

drop policy if exists "Public read" on public.step_images;
create policy "Public read" on public.step_images
  for select using (true);
