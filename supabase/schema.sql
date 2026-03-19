-- ============================================================
-- Food For You — Supabase Database Schema
-- Run this in your Supabase SQL editor (Dashboard → SQL Editor)
-- ============================================================

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- ============================================================
-- TABLE: users
-- Mirrors auth.users; created automatically on sign-up via trigger
-- ============================================================
create table if not exists public.users (
  id         uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Auto-create a public.users row when a new auth user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- TABLE: user_preferences
-- Stores the Taste Engine data (likes, dislikes) per user
-- ============================================================
create table if not exists public.user_preferences (
  id                   uuid primary key default uuid_generate_v4(),
  user_id              uuid not null references public.users (id) on delete cascade,
  -- Strict bans — any recipe containing these is completely hidden
  disliked_ingredients text[] not null default '{}',
  disliked_cuisines    text[] not null default '{}',
  -- Positive signals — used to weight the RNG toward preferred recipes
  liked_ingredients    text[] not null default '{}',
  liked_cuisines       text[] not null default '{}',
  updated_at           timestamptz not null default now(),
  constraint user_preferences_user_id_key unique (user_id)
);

-- ============================================================
-- TABLE: recipes
-- The core content table
-- meal_time values: 'breakfast' | 'lunch' | 'dinner' | 'snack'
-- effort_score: 1 (very easy) → 5 (weekend project)
-- ============================================================
create table if not exists public.recipes (
  id                   uuid primary key default uuid_generate_v4(),
  title                text not null,
  description          text not null,
  meal_time            text[] not null default '{}',
  prep_time_mins       integer not null check (prep_time_mins > 0),
  effort_score         integer not null check (effort_score between 1 and 5),
  is_recipe_of_the_day boolean not null default false,
  tags                 text[] not null default '{}',
  image_url            text not null,
  -- Flat list of all ingredients (used for dislike filtering)
  ingredients_list     text[] not null default '{}',
  -- Grouped shopping list lines, e.g. "🥦 Produce: 1 head broccoli"
  shopping_list        text[] not null default '{}',
  -- Numbered, short, actionable cooking steps
  recipe_steps         text[] not null default '{}',
  cuisine              text,
  -- NULL = seeded/admin recipe; set to auth.uid() for user-created recipes
  created_by           uuid references auth.users (id) on delete set null,
  created_at           timestamptz not null default now()
);

-- Partial unique index: only one recipe can be recipe_of_the_day at a time
create unique index if not exists recipes_rotd_unique
  on public.recipes (is_recipe_of_the_day)
  where (is_recipe_of_the_day = true);

-- ============================================================
-- TABLE: user_favorites
-- Many-to-many: user ↔ recipe
-- ============================================================
create table if not exists public.user_favorites (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references public.users (id) on delete cascade,
  recipe_id  uuid not null references public.recipes (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint user_favorites_unique unique (user_id, recipe_id)
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.users             enable row level security;
alter table public.user_preferences  enable row level security;
alter table public.recipes           enable row level security;
alter table public.user_favorites    enable row level security;

-- users: only read/update your own row
create policy "users: own row" on public.users
  for all using (auth.uid() = id);

-- user_preferences: full CRUD on own row
create policy "prefs: own row" on public.user_preferences
  for all using (auth.uid() = user_id);

-- recipes: publicly readable by authenticated users
create policy "recipes: authenticated read" on public.recipes
  for select using (auth.role() = 'authenticated');

-- recipes: any authenticated user may insert their own recipe
create policy "recipes: authenticated insert" on public.recipes
  for insert with check (auth.role() = 'authenticated');

-- recipes: creators may update / delete their own rows
create policy "recipes: own update" on public.recipes
  for update using (auth.uid() = created_by);

create policy "recipes: own delete" on public.recipes
  for delete using (auth.uid() = created_by);

-- user_favorites: full CRUD on own rows
create policy "favorites: own rows" on public.user_favorites
  for all using (auth.uid() = user_id);

-- ============================================================
-- SEED DATA — 12 sample recipes
-- Replace image_url values with real Unsplash / your CDN URLs
-- ============================================================

insert into public.recipes
  (title, description, meal_time, prep_time_mins, effort_score,
   is_recipe_of_the_day, tags, image_url, ingredients_list, shopping_list, recipe_steps, cuisine)
values

-- 1 ─ ROTD
(
  'Spicy Honey Garlic Salmon',
  'Silky salmon glazed in a sticky honey-garlic-chili sauce, ready in 20 minutes. Pure weeknight gold.',
  array['dinner'],
  20, 2, true,
  array['seafood','spicy','asian','gluten-free','high-protein','quick'],
  'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=1200',
  array['salmon fillet','honey','garlic','soy sauce','chili flakes','sesame oil','green onion','sesame seeds'],
  array['🐟 Proteins: 2 salmon fillets (6 oz each)','🧄 Pantry: 4 cloves garlic, 3 tbsp honey, 2 tbsp soy sauce, 1 tsp chili flakes, 1 tsp sesame oil','🌿 Produce: 2 green onions, sesame seeds'],
  array['Pat salmon dry and season with salt and pepper.','Mix honey, minced garlic, soy sauce, and chili flakes in a bowl.','Heat sesame oil in a skillet over medium-high heat.','Sear salmon skin-side up for 4 minutes, flip, then pour glaze over.','Cook 3–4 more minutes, basting constantly, until glaze caramelizes.','Garnish with sliced green onions and sesame seeds. Serve immediately.'],
  'Asian Fusion'
),

-- 2
(
  'Avocado Toast with Poached Egg',
  'The brunch classic, elevated. Crushed avocado on sourdough topped with a runny poached egg and chili flakes.',
  array['breakfast','snack'],
  12, 1, false,
  array['vegetarian','quick','high-protein','brunch','eggs'],
  'https://images.unsplash.com/photo-1546554137-f86b9593a222?w=1200',
  array['sourdough bread','avocado','eggs','lemon','chili flakes','salt','olive oil','microgreens'],
  array['🥑 Produce: 1 ripe avocado, 1 lemon, microgreens','🍞 Bread: 2 slices thick-cut sourdough','🥚 Proteins: 2 large eggs','🫙 Pantry: chili flakes, salt, good olive oil'],
  array['Bring a pot of water to a gentle simmer with a splash of white vinegar.','Toast sourdough until golden and crisp.','Halve and pit avocado; mash with lemon juice and a pinch of salt.','Create a gentle whirlpool in the water; crack egg in and poach 3 minutes.','Spread avocado on toast. Place poached egg on top.','Drizzle with olive oil, scatter chili flakes and microgreens.'],
  'American'
),

-- 3
(
  'Creamy Tuscan Chicken Pasta',
  'Sun-dried tomatoes, spinach, and parmesan in a rich cream sauce clinging to rigatoni. Italian comfort in one pan.',
  array['dinner'],
  35, 3, false,
  array['italian','pasta','creamy','chicken','comfort-food'],
  'https://images.unsplash.com/photo-1555949258-eb67b1ef0ceb?w=1200',
  array['chicken breast','rigatoni','heavy cream','parmesan','sun-dried tomatoes','spinach','garlic','olive oil','Italian seasoning'],
  array['🍗 Proteins: 2 chicken breasts','🍝 Pasta: 12 oz rigatoni','🧀 Dairy: 1 cup heavy cream, ½ cup grated parmesan','🫙 Pantry: sun-dried tomatoes (jar), olive oil, Italian seasoning','🥬 Produce: 3 cups baby spinach, 4 cloves garlic'],
  array['Season and pan-fry chicken in olive oil until golden; slice and set aside.','In the same pan, sauté garlic 1 minute, then add sun-dried tomatoes.','Pour in cream; simmer 3 minutes until slightly thickened.','Cook rigatoni to al dente; reserve ½ cup pasta water.','Add pasta, spinach, and parmesan to pan; toss, adding pasta water to loosen.','Top with sliced chicken and extra parmesan.'],
  'Italian'
),

-- 4
(
  'Açaí Breakfast Bowl',
  'Thick frozen açaí blended smooth, loaded with granola, fresh berries, banana, and a honey drizzle.',
  array['breakfast'],
  8, 1, false,
  array['vegan','gluten-free','healthy','quick','fruit','no-cook'],
  'https://images.unsplash.com/photo-1590301157284-26c85b8c7e52?w=1200',
  array['frozen açaí packets','banana','frozen mixed berries','granola','honey','coconut flakes','chia seeds','almond milk'],
  array['🫐 Frozen: 2 açaí packets (100g each), 1 cup frozen mixed berries','🍌 Produce: 1 banana (half for blend, half for topping)','🥣 Pantry: granola, honey, coconut flakes, chia seeds','🥛 Dairy-free: ¼ cup almond milk'],
  array['Break frozen açaí packets into blender.','Add ½ banana, ½ cup frozen berries, and almond milk.','Blend on high — keep it thick! Add liquid sparingly.','Pour into a chilled bowl.','Top with granola, sliced banana, remaining berries, coconut, and chia seeds.','Drizzle generously with honey.'],
  'Brazilian'
),

-- 5
(
  'Korean BBQ Beef Tacos',
  'Bulgogi-marinated beef in warm corn tortillas with kimchi slaw, sriracha mayo, and pickled cucumbers.',
  array['lunch','dinner'],
  30, 3, false,
  array['korean','beef','tacos','spicy','fusion','crowd-pleaser'],
  'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=1200',
  array['beef ribeye','corn tortillas','kimchi','soy sauce','sesame oil','brown sugar','ginger','garlic','sriracha','mayo','cucumber','rice vinegar'],
  array['🥩 Proteins: 1 lb thinly sliced ribeye or bulgogi cut','🌮 Bread: 8 small corn tortillas','🥬 Produce: ½ English cucumber, ginger knob','🧄 Pantry: soy sauce, sesame oil, brown sugar, garlic, rice vinegar','🌶️ Sauce: sriracha, mayo, kimchi (jar)'],
  array['Mix soy sauce, sesame oil, brown sugar, ginger, and garlic; marinate beef 20 min.','Quick-pickle cucumber slices in rice vinegar + pinch of sugar for 15 min.','Mix sriracha and mayo (1:2 ratio) for the sauce.','Sear beef in a hot cast-iron skillet in batches — 2 min per side.','Warm tortillas directly over a gas flame or dry skillet.','Assemble: beef → kimchi slaw → pickled cucumber → sriracha mayo.'],
  'Korean Fusion'
),

-- 6
(
  'Caprese Salad with Burrata',
  'Oversized heirloom tomatoes, fresh burrata, torn basil, and a balsamic glaze. No cooking required.',
  array['lunch','snack'],
  5, 1, false,
  array['vegetarian','italian','no-cook','gluten-free','quick','summer'],
  'https://images.unsplash.com/photo-1529042410759-befb1204b468?w=1200',
  array['burrata cheese','heirloom tomatoes','fresh basil','balsamic glaze','olive oil','flaky sea salt','black pepper'],
  array['🍅 Produce: 3 large heirloom tomatoes, 1 bunch fresh basil','🧀 Dairy: 2 balls fresh burrata (4 oz each)','🫙 Pantry: balsamic glaze, good extra-virgin olive oil, flaky sea salt'],
  array['Slice tomatoes ½ inch thick; arrange on a large plate.','Tear burrata open and nestle between tomato slices.','Tuck fresh basil leaves throughout.','Drizzle with olive oil, then balsamic glaze.','Finish with flaky sea salt and cracked black pepper.','Serve immediately at room temperature.'],
  'Italian'
),

-- 7
(
  'Shakshuka',
  'Eggs poached in a smoky, spiced tomato-pepper sauce. A one-pan Middle Eastern legend perfect for any meal.',
  array['breakfast','lunch'],
  25, 2, false,
  array['vegetarian','middle-eastern','eggs','spicy','one-pan','gluten-free'],
  'https://images.unsplash.com/photo-1590301157890-4810ed352733?w=1200',
  array['eggs','crushed tomatoes','bell peppers','onion','garlic','cumin','paprika','cayenne','olive oil','feta','parsley'],
  array['🥚 Proteins: 4–6 large eggs','🥫 Pantry: 1 can (28 oz) crushed tomatoes, cumin, smoked paprika, cayenne, olive oil','🥬 Produce: 2 bell peppers, 1 onion, 4 cloves garlic, fresh parsley','🧀 Dairy: crumbled feta for topping'],
  array['Heat olive oil in a large skillet; sauté diced onion and bell peppers 5 min.','Add minced garlic, cumin, paprika, and cayenne; cook 1 min until fragrant.','Pour in crushed tomatoes; season and simmer 10 minutes.','Create wells in the sauce; crack eggs directly in.','Cover and cook 5–7 min until whites are set, yolks still runny.','Top with feta and fresh parsley. Serve with crusty bread.'],
  'Middle Eastern'
),

-- 8
(
  'Thai Green Curry',
  'Coconut milk and green curry paste with tender chicken, Thai eggplant, and fresh basil over jasmine rice.',
  array['dinner'],
  30, 2, false,
  array['thai','curry','coconut','spicy','asian','gluten-free'],
  'https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=1200',
  array['chicken thighs','green curry paste','coconut milk','Thai eggplant','fish sauce','palm sugar','Thai basil','jasmine rice','lime','ginger'],
  array['🍗 Proteins: 1.5 lb boneless chicken thighs','🥫 Pantry: green curry paste (jar), 2 cans coconut milk, fish sauce, palm sugar','🥬 Produce: Thai eggplant, fresh Thai basil, 1 lime, ginger','🍚 Grains: 2 cups jasmine rice'],
  array['Cook jasmine rice according to package directions.','In a wok, fry green curry paste in 2 tbsp coconut cream 2 min.','Add chicken pieces; cook until sealed on all sides.','Pour in coconut milk; bring to a gentle simmer.','Add eggplant, fish sauce, and palm sugar; cook 10 min.','Finish with Thai basil and a lime squeeze. Serve over rice.'],
  'Thai'
),

-- 9
(
  'Smash Burgers',
  'Ultra-crispy lacey edges, double patties, American cheese melt, and special sauce on a brioche bun.',
  array['lunch','dinner'],
  20, 2, false,
  array['beef','american','comfort-food','crowd-pleaser','quick'],
  'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=1200',
  array['ground beef (80/20)','brioche buns','American cheese','butter','lettuce','tomato','pickles','mayo','ketchup','mustard','onion powder','garlic powder'],
  array['🥩 Proteins: 1 lb 80/20 ground beef (makes 4 smash patties)','🍞 Bread: 2 brioche burger buns','🧀 Dairy: 4 slices American cheese, butter','🥬 Produce: iceberg lettuce, tomato, pickles','🫙 Sauce: mayo, ketchup, mustard'],
  array['Divide beef into 4 equal loose balls (do NOT compact them).','Heat a cast-iron skillet screaming hot; lightly butter the surface.','Place a ball on skillet; immediately smash flat with spatula for 10 seconds.','Season with salt, onion powder, and garlic powder.','Cook 2 min until edges are deeply crispy; flip, add cheese immediately.','Stack double patties, special sauce, lettuce, tomato, and pickles.'],
  'American'
),

-- 10
(
  'Mango Overnight Oats',
  'Thick oats soaked in coconut milk overnight, topped with fresh mango, toasted coconut, and lime zest.',
  array['breakfast'],
  5, 1, false,
  array['vegan','no-cook','healthy','meal-prep','quick','fruit','gluten-free'],
  'https://images.unsplash.com/photo-1614961233913-a5113a4a34ed?w=1200',
  array['rolled oats','coconut milk','mango','chia seeds','maple syrup','lime','coconut flakes','vanilla extract'],
  array['🥣 Grains: 1 cup rolled oats','🥫 Pantry: chia seeds, maple syrup, vanilla extract, coconut flakes','🥭 Produce: 1 ripe mango, 1 lime','🥛 Dairy-free: 1 cup full-fat coconut milk'],
  array['Combine oats, coconut milk, chia seeds, maple syrup, and vanilla in a jar.','Stir well; cover and refrigerate overnight (or minimum 4 hours).','In the morning, dice fresh mango into small cubes.','Stir oats; add a splash more milk if too thick.','Top with mango, toasted coconut flakes, and fresh lime zest.','Best served cold straight from the fridge.'],
  'Tropical'
),

-- 11
(
  'Lemon Ricotta Pancakes',
  'Cloud-like fluffy pancakes made with creamy ricotta and bright lemon zest. The weekend stack upgrade.',
  array['breakfast'],
  25, 2, false,
  array['vegetarian','breakfast','fluffy','lemon','weekend','comfort-food'],
  'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=1200',
  array['ricotta cheese','eggs','all-purpose flour','baking powder','lemon','sugar','butter','vanilla extract','maple syrup','powdered sugar','berries'],
  array['🥛 Dairy: 1 cup whole-milk ricotta, butter','🥚 Proteins: 2 large eggs','🌾 Grains: ¾ cup all-purpose flour, baking powder, sugar','🍋 Produce: 1 large lemon (zest + juice), fresh berries for serving','🫙 Pantry: vanilla extract, maple syrup, powdered sugar'],
  array['Separate eggs; whisk yolks with ricotta, lemon zest, juice, sugar, and vanilla.','Fold in flour and baking powder until just combined.','Beat egg whites to soft peaks; gently fold into batter in two additions.','Melt butter in a nonstick pan over medium-low heat.','Pour ¼ cup batter per pancake; cook 3 min until bubbles form, flip, cook 2 min.','Stack high; dust with powdered sugar and pile on fresh berries.'],
  'American'
),

-- 12
(
  'Poke Bowl',
  'Sushi-grade ahi tuna marinated in sesame-soy over sushi rice with pickled ginger, edamame, and sriracha aioli.',
  array['lunch','dinner'],
  20, 2, false,
  array['seafood','hawaiian','healthy','no-cook','gluten-free','asian','high-protein'],
  'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=1200',
  array['sushi-grade ahi tuna','sushi rice','soy sauce','sesame oil','sriracha','mayo','edamame','avocado','pickled ginger','cucumber','nori','sesame seeds','rice vinegar','sugar'],
  array['🐟 Proteins: 8 oz sushi-grade ahi tuna','🍚 Grains: 1.5 cups sushi rice, rice vinegar, sugar','🥑 Produce: 1 avocado, ½ cucumber, edamame (frozen)','🫙 Pantry: soy sauce, sesame oil, sriracha, mayo, sesame seeds','🥒 Fridge: pickled ginger, nori sheets'],
  array['Cook sushi rice; season with rice vinegar and sugar while warm.','Dice tuna into ¾-inch cubes; toss gently in soy sauce and sesame oil.','Mix sriracha and mayo (1:3) for the aioli.','Thaw and salt edamame; slice cucumber into half-moons.','Slice avocado just before serving to prevent browning.','Build bowl: rice base → tuna → all toppings → sriracha aioli drizzle.'],
  'Hawaiian'
);

-- ============================================================
-- MIGRATION — run this block in Supabase SQL Editor if you
-- already have the recipes table from a previous schema version
-- ============================================================

-- 1. Add the created_by column (safe to run multiple times)
alter table public.recipes
  add column if not exists created_by uuid references auth.users (id) on delete set null;

-- 2. RLS policies for user-created recipes
do $$
begin
  -- Insert: any authenticated user may add a recipe
  if not exists (
    select 1 from pg_policies
    where tablename = 'recipes' and policyname = 'recipes: authenticated insert'
  ) then
    create policy "recipes: authenticated insert" on public.recipes
      for insert with check (auth.role() = 'authenticated');
  end if;

  -- Update: only the creator may edit their own recipe
  if not exists (
    select 1 from pg_policies
    where tablename = 'recipes' and policyname = 'recipes: own update'
  ) then
    create policy "recipes: own update" on public.recipes
      for update using (auth.uid() = created_by);
  end if;

  -- Delete: only the creator may delete their own recipe
  if not exists (
    select 1 from pg_policies
    where tablename = 'recipes' and policyname = 'recipes: own delete'
  ) then
    create policy "recipes: own delete" on public.recipes
      for delete using (auth.uid() = created_by);
  end if;
end $$;
