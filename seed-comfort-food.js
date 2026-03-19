// ============================================================
// seed-comfort-food.js — Food For You comfort food seed script
//
// Usage:  node seed-comfort-food.js
//
// Requires SUPABASE_SERVICE_ROLE_KEY in .env
// (same key used by seed-meals.js)
// ============================================================

const { readFileSync } = require('fs');
const { createClient }  = require('@supabase/supabase-js');

// ─── Load .env ────────────────────────────────────────────────
function loadEnv() {
  try {
    const raw = readFileSync('.env', 'utf8');
    const result = {};
    for (const line of raw.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key   = trimmed.slice(0, eqIdx).trim();
      let   value = trimmed.slice(eqIdx + 1).trim().replace(/#.*$/, '').trim();
      value = value.replace(/^["']|["']$/g, '');
      result[key] = value;
    }
    return result;
  } catch {
    return {};
  }
}

const env             = loadEnv();
const SUPABASE_URL    = env.EXPO_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL) {
  console.error('❌  EXPO_PUBLIC_SUPABASE_URL missing from .env');
  process.exit(1);
}
if (!SERVICE_ROLE_KEY) {
  console.error('❌  SUPABASE_SERVICE_ROLE_KEY missing from .env');
  console.error('   Dashboard → Project Settings → API → service_role → Reveal');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ─── 50 Comfort Food Recipes ──────────────────────────────────
// Columns must match the live Supabase schema exactly.
const RECIPES = [

  // ══════════════════════════════════════
  // BREAKFAST (10)
  // ══════════════════════════════════════
  {
    title:                'Cereal & Milk',
    description:          'Pour cereal, add milk, done. The original zero-effort breakfast.',
    image_url:            'https://source.unsplash.com/featured/?cereal,breakfast,bowl',
    cuisine:              'American',
    meal_time:            ['breakfast'],
    prep_time_mins:       2,
    effort_score:         1,
    is_recipe_of_the_day: false,
    tags:                 ['no-cook', 'breakfast', 'quick', 'easy'],
    ingredients_list:     ['1.5 cups Cereal of choice', '1 cup Cold milk'],
    shopping_list:        [],
    recipe_steps:         ['Pour cereal into a bowl.', 'Add cold milk.', 'Eat immediately before it gets soggy.'],
  },
  {
    title:                'Basic Oatmeal',
    description:          'Rolled oats simmered in water or milk. Top with brown sugar and call it breakfast.',
    image_url:            'https://source.unsplash.com/featured/?oatmeal,porridge,breakfast',
    cuisine:              'American',
    meal_time:            ['breakfast'],
    prep_time_mins:       5,
    effort_score:         1,
    is_recipe_of_the_day: false,
    tags:                 ['breakfast', 'healthy', 'quick', 'easy'],
    ingredients_list:     ['1 cup Rolled oats', '2 cups Water or milk', '2 tbsp Brown sugar', 'Pinch of salt'],
    shopping_list:        [],
    recipe_steps:         ['Bring water or milk to a boil in a small pot.', 'Stir in oats and salt; reduce heat to medium.', 'Cook 3-5 minutes, stirring occasionally.', 'Pour into a bowl; top with brown sugar.'],
  },
  {
    title:                'Buttered Toast',
    description:          'Bread meets heat meets butter. Life\'s most underrated breakfast.',
    image_url:            'https://source.unsplash.com/featured/?toast,butter,bread',
    cuisine:              'American',
    meal_time:            ['breakfast', 'snack'],
    prep_time_mins:       3,
    effort_score:         1,
    is_recipe_of_the_day: false,
    tags:                 ['no-cook', 'breakfast', 'quick', 'snack'],
    ingredients_list:     ['2 slices Bread', '2 tbsp Butter', 'Pinch of salt'],
    shopping_list:        [],
    recipe_steps:         ['Toast bread until golden.', 'Spread butter immediately while hot.', 'Season with a pinch of salt. Eat.'],
  },
  {
    title:                'Peanut Butter Toast',
    description:          'Toast slathered with thick peanut butter. Protein-packed, zero effort.',
    image_url:            'https://source.unsplash.com/featured/?peanut+butter,toast,spread',
    cuisine:              'American',
    meal_time:            ['breakfast', 'snack'],
    prep_time_mins:       3,
    effort_score:         1,
    is_recipe_of_the_day: false,
    tags:                 ['no-cook', 'breakfast', 'protein', 'quick'],
    ingredients_list:     ['2 slices Bread', '3 tbsp Peanut butter'],
    shopping_list:        [],
    recipe_steps:         ['Toast bread to your preference.', 'Spread peanut butter generously while warm.', 'Eat standing over the sink if you want — no judgment.'],
  },
  {
    title:                'Cinnamon Sugar Toast',
    description:          'Butter, cinnamon, sugar on toast. Dangerous in its simplicity.',
    image_url:            'https://source.unsplash.com/featured/?cinnamon+toast,breakfast,sweet',
    cuisine:              'American',
    meal_time:            ['breakfast', 'snack'],
    prep_time_mins:       4,
    effort_score:         1,
    is_recipe_of_the_day: false,
    tags:                 ['sweet', 'breakfast', 'quick', 'comfort'],
    ingredients_list:     ['2 slices Bread', '2 tbsp Butter', '1 tbsp Sugar', '1 tsp Ground cinnamon'],
    shopping_list:        [],
    recipe_steps:         ['Toast bread until lightly golden.', 'Spread butter while bread is still warm.', 'Mix cinnamon and sugar together.', 'Sprinkle generously over buttered toast.'],
  },
  {
    title:                'Scrambled Eggs',
    description:          'Fluffy, buttery scrambled eggs. Done in 5 minutes, good any time of day.',
    image_url:            'https://source.unsplash.com/featured/?scrambled+eggs,breakfast,eggs',
    cuisine:              'American',
    meal_time:            ['breakfast'],
    prep_time_mins:       5,
    effort_score:         1,
    is_recipe_of_the_day: false,
    tags:                 ['eggs', 'breakfast', 'quick', 'protein'],
    ingredients_list:     ['3 Large eggs', '2 tbsp Butter', '2 tbsp Milk', 'Salt and pepper to taste'],
    shopping_list:        [],
    recipe_steps:         ['Crack eggs into a bowl with milk, salt, and pepper; whisk together.', 'Melt butter in a nonstick pan over medium-low heat.', 'Pour in eggs; fold slowly with a spatula every few seconds.', 'Pull off heat while still slightly wet — residual heat finishes them.'],
  },
  {
    title:                'Fried Egg Sandwich',
    description:          'A fried egg, American cheese, bread. The blue-collar breakfast champion.',
    image_url:            'https://source.unsplash.com/featured/?egg+sandwich,breakfast+sandwich',
    cuisine:              'American',
    meal_time:            ['breakfast', 'lunch'],
    prep_time_mins:       6,
    effort_score:         1,
    is_recipe_of_the_day: false,
    tags:                 ['eggs', 'sandwich', 'breakfast', 'quick'],
    ingredients_list:     ['2 slices Bread', '1 Large egg', '1 slice American cheese', '1 tbsp Butter', 'Salt and pepper'],
    shopping_list:        [],
    recipe_steps:         ['Melt butter in a pan over medium heat.', 'Crack egg in; season with salt and pepper.', 'Cook until white is set; lay cheese on top to melt.', 'Slide onto bread. Eat immediately.'],
  },
  {
    title:                'Frozen Waffles',
    description:          'Leggo my Eggo. Two minutes in the toaster, drown in syrup, done.',
    image_url:            'https://source.unsplash.com/featured/?waffles,syrup,breakfast',
    cuisine:              'American',
    meal_time:            ['breakfast'],
    prep_time_mins:       3,
    effort_score:         1,
    is_recipe_of_the_day: false,
    tags:                 ['frozen', 'breakfast', 'quick', 'sweet'],
    ingredients_list:     ['2 Frozen waffles', '3 tbsp Maple syrup', '1 tbsp Butter'],
    shopping_list:        [],
    recipe_steps:         ['Toast frozen waffles until golden and crispy.', 'Place on a plate; add a pat of butter on top.', 'Pour maple syrup generously. Eat immediately.'],
  },
  {
    title:                'Basic Pancakes',
    description:          'Fluffy pancakes from a box mix. Stack them tall, drown them in syrup.',
    image_url:            'https://source.unsplash.com/featured/?pancakes,syrup,stack',
    cuisine:              'American',
    meal_time:            ['breakfast'],
    prep_time_mins:       15,
    effort_score:         2,
    is_recipe_of_the_day: false,
    tags:                 ['breakfast', 'sweet', 'weekend', 'classic'],
    ingredients_list:     ['1 cup Pancake mix', '3/4 cup Milk', '1 Large egg', '2 tbsp Vegetable oil', 'Butter and maple syrup for serving'],
    shopping_list:        [],
    recipe_steps:         ['Mix pancake mix, milk, egg, and oil until just combined — lumps are fine.', 'Heat a buttered griddle or skillet over medium heat.', 'Pour 1/4 cup batter per pancake.', 'Cook until bubbles form on top and edges look set, about 2 min. Flip; cook 1 min more.', 'Serve with butter and a heavy pour of maple syrup.'],
  },
  {
    title:                'French Toast',
    description:          'Egg-dipped bread fried in butter with cinnamon. Stale bread\'s greatest comeback.',
    image_url:            'https://source.unsplash.com/featured/?french+toast,syrup,breakfast',
    cuisine:              'American',
    meal_time:            ['breakfast'],
    prep_time_mins:       12,
    effort_score:         2,
    is_recipe_of_the_day: false,
    tags:                 ['sweet', 'breakfast', 'eggs', 'comfort'],
    ingredients_list:     ['4 slices Thick bread', '2 Large eggs', '1/4 cup Milk', '1 tsp Ground cinnamon', '1 tsp Vanilla extract', '2 tbsp Butter', 'Maple syrup to serve'],
    shopping_list:        [],
    recipe_steps:         ['Whisk eggs, milk, cinnamon, and vanilla in a shallow bowl.', 'Melt butter in a pan over medium heat.', 'Dip each bread slice 10 seconds per side in the egg mixture.', 'Cook in pan 2-3 minutes per side until deep golden brown.', 'Serve with maple syrup and powdered sugar.'],
  },

  // ══════════════════════════════════════
  // SANDWICHES (10)
  // ══════════════════════════════════════
  {
    title:                'PB&J Sandwich',
    description:          'Peanut butter and grape jelly on white bread. Childhood distilled into a sandwich.',
    image_url:            'https://source.unsplash.com/featured/?peanut+butter+jelly,sandwich',
    cuisine:              'American',
    meal_time:            ['breakfast', 'lunch', 'snack'],
    prep_time_mins:       2,
    effort_score:         1,
    is_recipe_of_the_day: false,
    tags:                 ['no-cook', 'sandwich', 'quick', 'classic'],
    ingredients_list:     ['2 slices White bread', '2 tbsp Peanut butter', '1 tbsp Grape jelly'],
    shopping_list:        [],
    recipe_steps:         ['Spread peanut butter on one slice of bread.', 'Spread jelly on the other slice.', 'Press together. Cut diagonally. Eat.'],
  },
  {
    title:                'Classic Grilled Cheese',
    description:          'Buttered bread, American cheese, hot skillet. Peak comfort in 8 minutes.',
    image_url:            'https://source.unsplash.com/featured/?grilled+cheese,sandwich,comfort',
    cuisine:              'American',
    meal_time:            ['lunch', 'snack'],
    prep_time_mins:       8,
    effort_score:         1,
    is_recipe_of_the_day: false,
    tags:                 ['sandwich', 'cheese', 'comfort', 'quick'],
    ingredients_list:     ['2 slices White bread', '2 slices American cheese', '2 tbsp Butter'],
    shopping_list:        [],
    recipe_steps:         ['Butter the outside of both bread slices generously.', 'Heat a pan over medium-low heat.', 'Place one slice butter-side down; add cheese slices.', 'Top with second slice, butter-side up.', 'Cook 3-4 min per side until deeply golden and cheese is fully melted.'],
  },
  {
    title:                'BLT Sandwich',
    description:          'Bacon, lettuce, tomato, mayo on toasted bread. An American institution.',
    image_url:            'https://source.unsplash.com/featured/?BLT,bacon+sandwich,lettuce+tomato',
    cuisine:              'American',
    meal_time:            ['lunch'],
    prep_time_mins:       12,
    effort_score:         2,
    is_recipe_of_the_day: false,
    tags:                 ['sandwich', 'bacon', 'classic', 'lunch'],
    ingredients_list:     ['2 slices Bread', '3 strips Bacon', '2 leaves Romaine lettuce', '2 slices Tomato', '2 tbsp Mayo'],
    shopping_list:        [],
    recipe_steps:         ['Cook bacon in a skillet until crispy; drain on paper towels.', 'Toast bread to your liking.', 'Spread mayo on both slices.', 'Layer lettuce, tomato slices, and bacon.', 'Close and cut in half.'],
  },
  {
    title:                'Ham and Cheese Sandwich',
    description:          'Deli ham, Swiss cheese, mustard. Can\'t go wrong, never goes old.',
    image_url:            'https://source.unsplash.com/featured/?ham+cheese+sandwich,deli',
    cuisine:              'American',
    meal_time:            ['lunch'],
    prep_time_mins:       3,
    effort_score:         1,
    is_recipe_of_the_day: false,
    tags:                 ['no-cook', 'sandwich', 'deli', 'quick'],
    ingredients_list:     ['2 slices Bread', '4 slices Deli ham', '2 slices Swiss cheese', '1 tbsp Yellow mustard', '2 leaves Lettuce'],
    shopping_list:        [],
    recipe_steps:         ['Lay out both bread slices.', 'Spread mustard on one side.', 'Layer ham, Swiss, and lettuce.', 'Close sandwich. Eat or wrap it for later.'],
  },
  {
    title:                'Turkey Club',
    description:          'Deli turkey, Swiss, crispy bacon, lettuce and tomato on toasted bread.',
    image_url:            'https://source.unsplash.com/featured/?turkey+club+sandwich,deli',
    cuisine:              'American',
    meal_time:            ['lunch'],
    prep_time_mins:       8,
    effort_score:         2,
    is_recipe_of_the_day: false,
    tags:                 ['sandwich', 'deli', 'lunch', 'classic'],
    ingredients_list:     ['3 slices Toasted bread', '4 slices Deli turkey', '2 slices Swiss cheese', '2 strips Bacon, cooked crispy', 'Lettuce and tomato slices', '2 tbsp Mayo'],
    shopping_list:        [],
    recipe_steps:         ['Cook and drain bacon; toast all three bread slices.', 'Spread mayo on two slices.', 'Layer turkey, Swiss, lettuce, and tomato on the bottom slice.', 'Add the middle bread slice; top with bacon and remaining fillings.', 'Crown with the top bread slice; skewer with a toothpick. Cut into triangles.'],
  },
  {
    title:                'Bologna and Mustard Sandwich',
    description:          'The original struggle sandwich. Bologna, mustard, white bread. Timeless.',
    image_url:            'https://source.unsplash.com/featured/?bologna,deli+meat,sandwich',
    cuisine:              'American',
    meal_time:            ['lunch'],
    prep_time_mins:       2,
    effort_score:         1,
    is_recipe_of_the_day: false,
    tags:                 ['no-cook', 'sandwich', 'budget', 'classic'],
    ingredients_list:     ['2 slices White bread', '2 slices Bologna', '1 tbsp Yellow mustard'],
    shopping_list:        [],
    recipe_steps:         ['Spread mustard on one slice.', 'Lay both bologna slices flat on bread.', 'Top with the second slice. Done.'],
  },
  {
    title:                'Italian Hoagie',
    description:          'Salami, ham, provolone, oil and vinegar on a long roll. Real hoagie energy.',
    image_url:            'https://source.unsplash.com/featured/?italian+hoagie,sub+sandwich',
    cuisine:              'American',
    meal_time:            ['lunch', 'dinner'],
    prep_time_mins:       5,
    effort_score:         1,
    is_recipe_of_the_day: false,
    tags:                 ['sandwich', 'italian-american', 'deli', 'classic'],
    ingredients_list:     ['1 Hoagie roll', '3 slices Salami', '3 slices Deli ham', '2 slices Provolone', 'Shredded lettuce', 'Sliced tomato', '1 tbsp Olive oil', '1 tsp Red wine vinegar', 'Salt, pepper, and dried oregano'],
    shopping_list:        [],
    recipe_steps:         ['Split hoagie roll lengthwise.', 'Layer salami, ham, and provolone on the bottom.', 'Add shredded lettuce and tomato.', 'Drizzle with oil and vinegar; season with salt, pepper, and oregano.', 'Press closed firmly; cut in half.'],
  },
  {
    title:                'Meatball Sub',
    description:          'Frozen meatballs, jarred marinara, mozzarella on a sub roll. Better than it has any right to be.',
    image_url:            'https://source.unsplash.com/featured/?meatball+sub,sandwich,italian',
    cuisine:              'American',
    meal_time:            ['lunch', 'dinner'],
    prep_time_mins:       15,
    effort_score:         2,
    is_recipe_of_the_day: false,
    tags:                 ['sandwich', 'italian-american', 'comfort', 'crowd-pleaser'],
    ingredients_list:     ['1 Sub roll', '6 Frozen meatballs', '1/2 cup Jarred marinara sauce', '1/4 cup Shredded mozzarella', '1 tbsp Grated parmesan'],
    shopping_list:        [],
    recipe_steps:         ['Cook frozen meatballs per package; add marinara and simmer 5 min.', 'Split sub roll; pile on meatballs and sauce.', 'Top with mozzarella and parmesan.', 'Broil 2 minutes until cheese bubbles. Eat immediately.'],
  },
  {
    title:                'Sloppy Joe',
    description:          'Ground beef in sweet-tangy sauce on a bun. Mess absolutely included.',
    image_url:            'https://source.unsplash.com/featured/?sloppy+joe,ground+beef,bun',
    cuisine:              'American',
    meal_time:            ['lunch', 'dinner'],
    prep_time_mins:       15,
    effort_score:         2,
    is_recipe_of_the_day: false,
    tags:                 ['beef', 'comfort', 'american', 'classic'],
    ingredients_list:     ['1 lb Ground beef', '1 can (15 oz) Manwich sloppy joe sauce', '2 Hamburger buns'],
    shopping_list:        [],
    recipe_steps:         ['Brown ground beef in a skillet over medium-high heat; drain fat.', 'Pour in the entire can of Manwich sauce; stir to coat.', 'Simmer 5 minutes until thickened.', 'Spoon generously onto bottom bun; add the top.'],
  },
  {
    title:                'Tuna Melt',
    description:          'Canned tuna, mayo, melted cheddar on toast. A diner staple made at home.',
    image_url:            'https://source.unsplash.com/featured/?tuna+melt,sandwich,cheese',
    cuisine:              'American',
    meal_time:            ['lunch'],
    prep_time_mins:       10,
    effort_score:         2,
    is_recipe_of_the_day: false,
    tags:                 ['seafood', 'sandwich', 'comfort', 'quick'],
    ingredients_list:     ['1 can (5 oz) Tuna, drained', '2 tbsp Mayo', '1 tbsp Finely diced celery (optional)', '2 slices Bread', '2 slices Cheddar cheese'],
    shopping_list:        [],
    recipe_steps:         ['Mix tuna, mayo, and celery in a bowl; season with salt and pepper.', 'Spread tuna mix on both bread slices.', 'Top each with a slice of cheddar.', 'Broil or pan-toast open-faced until cheese bubbles, about 3 min.'],
  },

  // ══════════════════════════════════════
  // BURGERS & DOGS (6)
  // ══════════════════════════════════════
  {
    title:                'Classic Cheeseburger',
    description:          '80/20 beef, American cheese, all the fixings on a brioche bun. The American standard.',
    image_url:            'https://source.unsplash.com/featured/?cheeseburger,burger,american',
    cuisine:              'American',
    meal_time:            ['lunch', 'dinner'],
    prep_time_mins:       15,
    effort_score:         2,
    is_recipe_of_the_day: false,
    tags:                 ['burger', 'beef', 'american', 'comfort'],
    ingredients_list:     ['1/3 lb Ground beef (80/20)', '1 Brioche bun', '1 slice American cheese', 'Lettuce, tomato, onion', 'Ketchup and mustard', 'Kosher salt and black pepper'],
    shopping_list:        [],
    recipe_steps:         ['Form beef into a patty; season both sides with salt and pepper.', 'Cook on a cast-iron or grill over high heat, 3-4 min per side for medium.', 'Lay cheese on in the last minute; cover to melt.', 'Toast bun briefly; build with preferred toppings.'],
  },
  {
    title:                'Bacon Cheeseburger',
    description:          'Like a cheeseburger but better, because bacon. End of argument.',
    image_url:            'https://source.unsplash.com/featured/?bacon+cheeseburger,burger',
    cuisine:              'American',
    meal_time:            ['lunch', 'dinner'],
    prep_time_mins:       18,
    effort_score:         2,
    is_recipe_of_the_day: false,
    tags:                 ['burger', 'bacon', 'beef', 'comfort'],
    ingredients_list:     ['1/3 lb Ground beef (80/20)', '2 strips Bacon', '1 Brioche bun', '1 slice American cheese', 'Lettuce, tomato, pickles', 'Ketchup, mustard, and mayo'],
    shopping_list:        [],
    recipe_steps:         ['Cook bacon until crispy; drain on paper towels.', 'Form and season patty; cook 3-4 min per side.', 'Add cheese in the last minute.', 'Build: bun, sauce, lettuce, tomato, patty, bacon, pickles, top bun.'],
  },
  {
    title:                'Double Smash Burger',
    description:          'Two thin, lacy-edged smashed patties with special sauce. Maximum burger.',
    image_url:            'https://source.unsplash.com/featured/?smash+burger,double+patty',
    cuisine:              'American',
    meal_time:            ['lunch', 'dinner'],
    prep_time_mins:       15,
    effort_score:         2,
    is_recipe_of_the_day: false,
    tags:                 ['burger', 'beef', 'crispy', 'american'],
    ingredients_list:     ['2/3 lb Ground beef (80/20), formed into 2 loose balls', '2 slices American cheese', '1 Brioche bun', 'Pickles and diced onion', 'Mayo, ketchup, and mustard for sauce'],
    shopping_list:        [],
    recipe_steps:         ['Heat a cast-iron skillet until screaming hot.', 'Place a beef ball on skillet; immediately press flat with a sturdy spatula.', 'Season; cook 2 min until edges are deeply crispy. Flip; add cheese immediately.', 'Repeat with second patty.', 'Stack patties; serve on toasted bun with sauce, pickles, and onion.'],
  },
  {
    title:                'Classic Hot Dog',
    description:          'Boiled or grilled beef hot dog on a bun. Summer in one simple bite.',
    image_url:            'https://source.unsplash.com/featured/?hot+dog,hotdog,american',
    cuisine:              'American',
    meal_time:            ['lunch', 'dinner', 'snack'],
    prep_time_mins:       5,
    effort_score:         1,
    is_recipe_of_the_day: false,
    tags:                 ['hot dog', 'quick', 'american', 'classic'],
    ingredients_list:     ['1 Beef hot dog', '1 Hot dog bun', 'Yellow mustard', 'Ketchup', 'Chopped onion (optional)'],
    shopping_list:        [],
    recipe_steps:         ['Boil hot dog in water 4-5 minutes, or grill 2 min turning often.', 'Place in bun.', 'Top with mustard, ketchup, and onion as you like.'],
  },
  {
    title:                'Chili Cheese Dog',
    description:          'Hot dog, canned chili, shredded cheddar. Elevated in all the right trashy ways.',
    image_url:            'https://source.unsplash.com/featured/?chili+cheese+dog,hot+dog',
    cuisine:              'American',
    meal_time:            ['lunch', 'dinner'],
    prep_time_mins:       10,
    effort_score:         2,
    is_recipe_of_the_day: false,
    tags:                 ['hot dog', 'chili', 'comfort', 'american'],
    ingredients_list:     ['1 Beef hot dog', '1 Hot dog bun', '1/2 can Hormel chili (no beans)', '2 tbsp Shredded cheddar', 'Yellow mustard'],
    shopping_list:        [],
    recipe_steps:         ['Cook hot dog by boiling or grilling per preference.', 'Warm chili in a small saucepan over medium heat.', 'Place dog in bun; spoon hot chili generously on top.', 'Pile on cheddar. Add mustard. Eat.'],
  },
  {
    title:                'Corn Dog',
    description:          'Frozen corn dog from the box. Heat, eat, repeat at the state fair and at home.',
    image_url:            'https://source.unsplash.com/featured/?corn+dog,fair+food',
    cuisine:              'American',
    meal_time:            ['lunch', 'snack'],
    prep_time_mins:       15,
    effort_score:         1,
    is_recipe_of_the_day: false,
    tags:                 ['frozen', 'snack', 'fair food', 'quick'],
    ingredients_list:     ['2 Frozen corn dogs', 'Yellow mustard for dipping'],
    shopping_list:        [],
    recipe_steps:         ['Preheat oven to 375°F.', 'Bake corn dogs on a sheet pan 12-14 min until heated through.', 'Or microwave 45 seconds if you are in a hurry.', 'Dip in mustard. Enjoy with zero shame.'],
  },

  // ══════════════════════════════════════
  // PASTA & SKILLET MEALS (6)
  // ══════════════════════════════════════
  {
    title:                'Boxed Mac and Cheese',
    description:          'Kraft Mac & Cheese. The comfort food that launched a thousand childhoods.',
    image_url:            'https://source.unsplash.com/featured/?mac+and+cheese,macaroni,comfort',
    cuisine:              'American',
    meal_time:            ['lunch', 'dinner'],
    prep_time_mins:       10,
    effort_score:         1,
    is_recipe_of_the_day: false,
    tags:                 ['pasta', 'comfort', 'quick', 'classic'],
    ingredients_list:     ['1 box Kraft Mac and Cheese', '2 tbsp Butter', '1/4 cup Milk'],
    shopping_list:        [],
    recipe_steps:         ['Boil macaroni per package directions; drain.', 'Return to pot off the heat; add butter and milk.', 'Pour in the cheese powder packet; stir until creamy.', 'Eat directly from the pot if desired. No judgment.'],
  },
  {
    title:                'Butter Noodles',
    description:          'Pasta, butter, salt. The founding meal of every college student ever.',
    image_url:            'https://source.unsplash.com/featured/?butter+pasta,noodles,simple',
    cuisine:              'Quick & Easy',
    meal_time:            ['lunch', 'dinner'],
    prep_time_mins:       12,
    effort_score:         1,
    is_recipe_of_the_day: false,
    tags:                 ['pasta', 'budget', 'quick', 'simple'],
    ingredients_list:     ['8 oz Spaghetti or egg noodles', '3 tbsp Butter', 'Salt', '2 tbsp Parmesan (optional)'],
    shopping_list:        [],
    recipe_steps:         ['Boil pasta in heavily salted water per package directions.', 'Drain, reserving a splash of pasta water.', 'Return pasta to pot; toss with butter until fully melted.', 'Add a splash of pasta water to make it saucy. Top with parmesan.'],
  },
  {
    title:                'Spaghetti with Jarred Marinara',
    description:          'Boil noodles, open jar, combine. The OG easy weeknight dinner.',
    image_url:            'https://source.unsplash.com/featured/?spaghetti,marinara,pasta',
    cuisine:              'American',
    meal_time:            ['dinner'],
    prep_time_mins:       15,
    effort_score:         1,
    is_recipe_of_the_day: false,
    tags:                 ['pasta', 'italian-american', 'quick', 'dinner'],
    ingredients_list:     ['8 oz Spaghetti', '1 jar (24 oz) Marinara sauce', '2 tbsp Grated parmesan', 'Salt for pasta water'],
    shopping_list:        [],
    recipe_steps:         ['Boil spaghetti in salted water per package directions.', 'Warm marinara in a saucepan over medium heat.', 'Drain pasta and plate; ladle sauce over the top.', 'Sprinkle parmesan and serve.'],
  },
  {
    title:                'Hamburger Helper Cheeseburger Skillet',
    description:          'Brown beef, add the box mix, stir. America\'s most honest meal kit.',
    image_url:            'https://source.unsplash.com/featured/?hamburger,skillet+pasta,one+pan',
    cuisine:              'American',
    meal_time:            ['dinner'],
    prep_time_mins:       20,
    effort_score:         2,
    is_recipe_of_the_day: false,
    tags:                 ['beef', 'pasta', 'one-pan', 'comfort'],
    ingredients_list:     ['1 lb Ground beef', '1 box Hamburger Helper Cheeseburger Macaroni', '2.25 cups Water', '1 cup Milk'],
    shopping_list:        [],
    recipe_steps:         ['Brown ground beef in a large skillet over medium-high heat; drain fat.', 'Stir in pasta, sauce mix, water, and milk from the box.', 'Bring to a boil; reduce heat to medium-low.', 'Cover and simmer 10-12 minutes, stirring occasionally, until pasta is tender.', 'Remove from heat; let stand 5 minutes. The cheese sauce thickens as it cools.'],
  },
  {
    title:                'Garlic Butter Pasta',
    description:          'Pasta, olive oil, garlic, parmesan. Three real ingredients, infinite satisfaction.',
    image_url:            'https://source.unsplash.com/featured/?garlic+pasta,aglio+olio',
    cuisine:              'Quick & Easy',
    meal_time:            ['lunch', 'dinner'],
    prep_time_mins:       15,
    effort_score:         2,
    is_recipe_of_the_day: false,
    tags:                 ['pasta', 'garlic', '3-ingredient', 'quick'],
    ingredients_list:     ['8 oz Spaghetti', '4 cloves Garlic, thinly sliced', '4 tbsp Olive oil', '1/2 tsp Red pepper flakes', '1/4 cup Grated parmesan', 'Salt and fresh parsley'],
    shopping_list:        [],
    recipe_steps:         ['Cook spaghetti in salted water; reserve 1/2 cup pasta water before draining.', 'In a pan over medium heat, warm oil; add garlic slices and pepper flakes.', 'Cook gently until garlic is golden — not brown — about 3 min.', 'Add drained pasta and a splash of pasta water; toss vigorously for 1 minute.', 'Off heat, toss with parmesan and parsley. Serve immediately.'],
  },
  {
    title:                'Tuna Noodle Casserole',
    description:          'Egg noodles, canned tuna, cream of mushroom soup. The original budget bake.',
    image_url:            'https://source.unsplash.com/featured/?tuna+casserole,noodle+bake',
    cuisine:              'American',
    meal_time:            ['dinner'],
    prep_time_mins:       35,
    effort_score:         2,
    is_recipe_of_the_day: false,
    tags:                 ['pasta', 'budget', 'bake', 'comfort'],
    ingredients_list:     ['8 oz Egg noodles', '2 cans (5 oz each) Tuna, drained', '1 can Cream of mushroom soup', '1/2 cup Milk', '1 cup Frozen peas', '1/2 cup Shredded cheddar', 'Salt and pepper'],
    shopping_list:        [],
    recipe_steps:         ['Preheat oven to 375°F. Cook and drain egg noodles.', 'Whisk soup and milk until smooth in a large bowl.', 'Fold in tuna, peas, noodles, and half the cheddar. Season.', 'Pour into a greased 9x13 dish; top with remaining cheddar.', 'Bake 25 minutes until bubbly and golden on top.'],
  },

  // ══════════════════════════════════════
  // PIZZA & QUICK MEALS (5)
  // ══════════════════════════════════════
  {
    title:                'Frozen Pepperoni Pizza',
    description:          'DiGiorno or Red Baron, straight from the freezer to your belly. No notes.',
    image_url:            'https://source.unsplash.com/featured/?pepperoni+pizza,pizza',
    cuisine:              'American',
    meal_time:            ['dinner', 'snack'],
    prep_time_mins:       22,
    effort_score:         1,
    is_recipe_of_the_day: false,
    tags:                 ['frozen', 'pizza', 'comfort', 'quick'],
    ingredients_list:     ['1 Frozen pepperoni pizza'],
    shopping_list:        [],
    recipe_steps:         ['Preheat oven per package directions (usually 375-400°F).', 'Place pizza directly on the oven rack or a baking sheet.', 'Bake per package until cheese is fully bubbling.', 'Let cool 2 minutes. Cut into slices.'],
  },
  {
    title:                'Totino\'s Party Pizza',
    description:          'The $1.50 crispy square pizza. Budget royalty. Crunchy edges mandatory.',
    image_url:            'https://source.unsplash.com/featured/?party+pizza,crispy+pizza,snack',
    cuisine:              'American',
    meal_time:            ['snack', 'lunch'],
    prep_time_mins:       16,
    effort_score:         1,
    is_recipe_of_the_day: false,
    tags:                 ['frozen', 'pizza', 'snack', 'budget'],
    ingredients_list:     ["1 Totino's Party Pizza"],
    shopping_list:        [],
    recipe_steps:         ["Preheat oven to 450°F.", "Place Totino's directly on the center oven rack.", "Bake 12-14 minutes until cheese is melted and edges are deeply crispy.", "Cut into squares. Eat the crunchy corner pieces first."],
  },
  {
    title:                'Bagel Pizza',
    description:          'Bagel half, sauce, cheese, toppings. Lunch done in under 10 minutes.',
    image_url:            'https://source.unsplash.com/featured/?bagel+pizza,pizza+snack',
    cuisine:              'American',
    meal_time:            ['lunch', 'snack'],
    prep_time_mins:       8,
    effort_score:         1,
    is_recipe_of_the_day: false,
    tags:                 ['pizza', 'snack', 'quick', 'kids'],
    ingredients_list:     ['2 Bagel halves', '3 tbsp Jarred pizza or marinara sauce', '1/4 cup Shredded mozzarella', 'Pepperoni or toppings of choice'],
    shopping_list:        [],
    recipe_steps:         ['Preheat broiler or toaster oven to high.', 'Spread sauce on each bagel half.', 'Top with mozzarella and pepperoni.', 'Broil 3-4 minutes until cheese is bubbly and edges are toasted.', 'Wait 60 seconds before eating — molten cheese is a hazard.'],
  },
  {
    title:                'Cheese Quesadilla',
    description:          'Flour tortilla folded over shredded cheese on a hot pan. Two-minute perfection.',
    image_url:            'https://source.unsplash.com/featured/?quesadilla,cheese,tortilla',
    cuisine:              'American',
    meal_time:            ['lunch', 'snack'],
    prep_time_mins:       6,
    effort_score:         1,
    is_recipe_of_the_day: false,
    tags:                 ['quick', 'snack', 'cheese', 'tex-mex'],
    ingredients_list:     ['2 Large flour tortillas', '1 cup Shredded Mexican blend or cheddar cheese', 'Sour cream and salsa to serve'],
    shopping_list:        [],
    recipe_steps:         ['Heat a dry skillet over medium heat.', 'Lay one tortilla flat; spread cheese evenly over half of it.', 'Fold in half and press lightly.', 'Cook 2 min until golden; flip and cook 1-2 min more.', 'Cut into triangles; serve with sour cream and salsa.'],
  },
  {
    title:                'Nachos',
    description:          'Chips, melted cheese, beans, jalapeños, sour cream. From zero to party in 10 minutes.',
    image_url:            'https://source.unsplash.com/featured/?nachos,tortilla+chips,cheese',
    cuisine:              'American',
    meal_time:            ['snack', 'lunch'],
    prep_time_mins:       10,
    effort_score:         1,
    is_recipe_of_the_day: false,
    tags:                 ['snack', 'tex-mex', 'quick', 'crowd-pleaser'],
    ingredients_list:     ['1 bag Tortilla chips', '1.5 cups Shredded cheddar', '1/2 can Black beans, drained', 'Sliced pickled jalapeños', 'Sour cream', 'Salsa'],
    shopping_list:        [],
    recipe_steps:         ['Preheat oven to 375°F.', 'Spread chips in a single layer on a baking sheet.', 'Scatter beans and jalapeños over chips; cover with cheddar.', 'Bake 8-10 minutes until cheese is fully melted.', 'Top with sour cream and salsa right before serving.'],
  },

  // ══════════════════════════════════════
  // SOUPS & CANNED (4)
  // ══════════════════════════════════════
  {
    title:                'Canned Tomato Soup',
    description:          'Campbell\'s condensed tomato soup with milk. Warm, cheap, timeless.',
    image_url:            'https://source.unsplash.com/featured/?tomato+soup,bowl+of+soup',
    cuisine:              'American',
    meal_time:            ['lunch'],
    prep_time_mins:       5,
    effort_score:         1,
    is_recipe_of_the_day: false,
    tags:                 ['soup', 'quick', 'comfort', 'budget'],
    ingredients_list:     ['1 can (10.75 oz) Condensed tomato soup', '1 soup can of Milk or water', 'Crackers to serve'],
    shopping_list:        [],
    recipe_steps:         ['Pour condensed soup into a saucepan.', 'Add one soup can of milk (or water); whisk until smooth.', 'Heat over medium heat, stirring, until steaming and hot.', 'Pour into a bowl; dunk crackers liberally.'],
  },
  {
    title:                'Canned Chicken Noodle Soup',
    description:          'Campbell\'s from the can, straight to a bowl. The universal sick-day cure.',
    image_url:            'https://source.unsplash.com/featured/?chicken+noodle+soup,soup+bowl',
    cuisine:              'American',
    meal_time:            ['lunch'],
    prep_time_mins:       5,
    effort_score:         1,
    is_recipe_of_the_day: false,
    tags:                 ['soup', 'comfort', 'quick', 'sick-day'],
    ingredients_list:     ['1 can (10.75 oz) Condensed chicken noodle soup', '1 soup can of Water'],
    shopping_list:        [],
    recipe_steps:         ['Open can; pour into a saucepan.', 'Add one can of water; stir to combine.', 'Heat over medium heat until simmering.', 'Serve with crackers or a slice of bread.'],
  },
  {
    title:                'Chili from a Can',
    description:          'Hormel chili, straight from the can. Top with cheddar and call it dinner.',
    image_url:            'https://source.unsplash.com/featured/?chili,beef+chili,bowl',
    cuisine:              'American',
    meal_time:            ['lunch', 'dinner'],
    prep_time_mins:       5,
    effort_score:         1,
    is_recipe_of_the_day: false,
    tags:                 ['chili', 'quick', 'comfort', 'budget'],
    ingredients_list:     ['1 can (15 oz) Hormel chili with or without beans', '2 tbsp Shredded cheddar', 'Crackers or white bread'],
    shopping_list:        [],
    recipe_steps:         ['Open can; pour chili into a bowl.', 'Microwave 90 seconds, stirring halfway through.', 'Top with shredded cheddar.', 'Eat with crackers or pour over white rice if you are feeling ambitious.'],
  },
  {
    title:                'Instant Ramen',
    description:          'Maruchan or Top Ramen. Under $0.25, under 5 minutes, zero pretense.',
    image_url:            'https://source.unsplash.com/featured/?ramen,instant+noodles',
    cuisine:              'Quick & Easy',
    meal_time:            ['lunch', 'dinner', 'snack'],
    prep_time_mins:       5,
    effort_score:         1,
    is_recipe_of_the_day: false,
    tags:                 ['noodles', 'budget', 'quick', 'college'],
    ingredients_list:     ['1 pack Instant ramen', '2 cups Water', 'Optional: 1 egg, a pat of butter, hot sauce'],
    shopping_list:        [],
    recipe_steps:         ['Boil 2 cups of water in a small pot.', 'Add ramen noodle block; cook 3 minutes.', 'Reduce to low; stir in the seasoning packet.', 'Optional: crack a raw egg in and stir for protein. Add butter for richness.', 'Eat immediately — noodles get soggy fast.'],
  },

  // ══════════════════════════════════════
  // STEAKS & BBQ (5)
  // ══════════════════════════════════════
  {
    title:                'Pan-Seared Ribeye',
    description:          'Cast iron, butter, garlic, thyme. A perfect ribeye in 10 minutes flat.',
    image_url:            'https://source.unsplash.com/featured/?ribeye+steak,steak,cast+iron',
    cuisine:              'American',
    meal_time:            ['dinner'],
    prep_time_mins:       12,
    effort_score:         2,
    is_recipe_of_the_day: false,
    tags:                 ['steak', 'beef', 'dinner', 'high-protein'],
    ingredients_list:     ['1 Ribeye steak (1-inch thick)', '2 tbsp Butter', '3 cloves Garlic, smashed', '2 sprigs Fresh thyme', 'Kosher salt and black pepper', '1 tbsp Vegetable oil'],
    shopping_list:        [],
    recipe_steps:         ['Season steak generously with salt and pepper; let rest 10 min at room temp.', 'Heat cast-iron over high heat until smoking.', 'Add oil; sear 3-4 min per side for medium-rare.', 'Reduce heat; add butter, garlic, and thyme. Tilt pan and baste constantly for 1 min.', 'Rest 5 minutes on a cutting board before slicing.'],
  },
  {
    title:                'NY Strip Steak',
    description:          'Lean, beefy, and perfect with just salt and pepper. The everyday steak.',
    image_url:            'https://source.unsplash.com/featured/?new+york+strip,steak+dinner',
    cuisine:              'American',
    meal_time:            ['dinner'],
    prep_time_mins:       15,
    effort_score:         2,
    is_recipe_of_the_day: false,
    tags:                 ['steak', 'beef', 'classic', 'dinner'],
    ingredients_list:     ['1 NY Strip steak (12 oz)', '1 tbsp Vegetable oil', '2 tbsp Butter', 'Kosher salt and black pepper'],
    shopping_list:        [],
    recipe_steps:         ['Pat steak completely dry; season both sides heavily with salt and pepper.', 'Heat oil in cast-iron until nearly smoking.', 'Sear 3-4 min per side without moving.', 'Add butter; tilt pan and baste for 1 minute.', 'Rest on a cutting board 5-10 minutes; slice against the grain.'],
  },
  {
    title:                'BBQ Baby Back Ribs',
    description:          'Low and slow in the oven, then glazed with BBQ sauce. Fall-off-the-bone tender.',
    image_url:            'https://source.unsplash.com/featured/?BBQ+ribs,baby+back+ribs,pork',
    cuisine:              'American',
    meal_time:            ['dinner'],
    prep_time_mins:       30,
    effort_score:         3,
    is_recipe_of_the_day: false,
    tags:                 ['ribs', 'bbq', 'pork', 'weekend'],
    ingredients_list:     ['1 rack Baby back ribs', '2 tbsp Brown sugar', '1 tbsp Paprika', '1 tsp Garlic powder', '1 tsp Salt', '1/2 tsp Black pepper', '3/4 cup BBQ sauce (your favorite brand)'],
    shopping_list:        [],
    recipe_steps:         ['Preheat oven to 300°F. Peel silver skin off the back of the rack.', 'Mix brown sugar, paprika, garlic powder, salt, and pepper; rub all over.', 'Wrap tightly in foil; bake on a sheet pan 2.5-3 hours.', 'Unwrap; brush generously with BBQ sauce.', 'Broil 5 min until sauce caramelizes. Rest 5 min; slice between bones.'],
  },
  {
    title:                'BBQ Pulled Pork Sandwich',
    description:          'Slow cooker pork shoulder shredded into BBQ sauce, piled on a bun with slaw.',
    image_url:            'https://source.unsplash.com/featured/?pulled+pork,BBQ+sandwich',
    cuisine:              'American',
    meal_time:            ['lunch', 'dinner'],
    prep_time_mins:       20,
    effort_score:         3,
    is_recipe_of_the_day: false,
    tags:                 ['pork', 'bbq', 'sandwich', 'slow-cooker'],
    ingredients_list:     ['2 lb Boneless pork shoulder', '1 cup BBQ sauce', '1/2 cup Chicken broth', '1 tsp Garlic powder', '1 tsp Onion powder', 'Salt and pepper', '4 Hamburger buns', 'Coleslaw to serve (optional)'],
    shopping_list:        [],
    recipe_steps:         ['Season pork with salt, pepper, garlic powder, and onion powder.', 'Place in slow cooker; pour in broth. Cook LOW 8 hrs or HIGH 5 hrs.', 'Shred pork in the cooker with two forks.', 'Drain excess liquid; stir in BBQ sauce until coated.', 'Pile onto buns; top with coleslaw if using.'],
  },
  {
    title:                'Basic Grilled Steak',
    description:          'Any steak, screaming-hot grill, salt and pepper. Mastery through simplicity.',
    image_url:            'https://source.unsplash.com/featured/?grilled+steak,grill+marks,beef',
    cuisine:              'American',
    meal_time:            ['dinner'],
    prep_time_mins:       15,
    effort_score:         2,
    is_recipe_of_the_day: false,
    tags:                 ['steak', 'grill', 'beef', 'outdoor'],
    ingredients_list:     ['2 Steaks of choice (sirloin, NY strip, or T-bone)', 'Kosher salt', 'Black pepper', '1 tbsp Vegetable oil'],
    shopping_list:        [],
    recipe_steps:         ['Preheat grill to high (450-500°F).', 'Pat steaks dry; brush with oil; season both sides heavily.', 'Grill 4-5 min per side for medium-rare (adjust for thickness).', 'Transfer to a plate; rest 5 min before cutting.'],
  },

  // ══════════════════════════════════════
  // FROZEN & FRIED (4)
  // ══════════════════════════════════════
  {
    title:                'Frozen Chicken Tenders',
    description:          'Tyson oven-baked chicken tenders. A reliable crowd-pleaser from the freezer.',
    image_url:            'https://source.unsplash.com/featured/?chicken+tenders,fried+chicken',
    cuisine:              'American',
    meal_time:            ['lunch', 'dinner', 'snack'],
    prep_time_mins:       20,
    effort_score:         1,
    is_recipe_of_the_day: false,
    tags:                 ['frozen', 'chicken', 'comfort', 'quick'],
    ingredients_list:     ['1 box Frozen chicken tenders', 'Dipping sauce of choice (ranch, BBQ, honey mustard)'],
    shopping_list:        [],
    recipe_steps:         ['Preheat oven to 400°F.', 'Arrange tenders in a single layer on a baking sheet.', 'Bake per package directions — usually 15-18 minutes.', 'Flip halfway through for even crispiness.', 'Serve hot with your favorite dipping sauce.'],
  },
  {
    title:                'Frozen Fish Sticks',
    description:          "Gorton's fish sticks, crispy from the oven. A Friday-night staple since 1953.",
    image_url:            'https://source.unsplash.com/featured/?fish+sticks,breaded+fish',
    cuisine:              'American',
    meal_time:            ['lunch', 'dinner'],
    prep_time_mins:       18,
    effort_score:         1,
    is_recipe_of_the_day: false,
    tags:                 ['frozen', 'seafood', 'classic', 'quick'],
    ingredients_list:     ["1 box Frozen fish sticks (Gorton's or store brand)", 'Tartar sauce', 'Lemon wedges (optional)', 'Ketchup for dipping'],
    shopping_list:        [],
    recipe_steps:         ['Preheat oven to 425°F.', 'Place fish sticks in a single layer on a baking sheet.', 'Bake 14-16 minutes, flipping once, until golden and crunchy.', 'Serve with tartar sauce and a squeeze of lemon.'],
  },
  {
    title:                'Frozen Chicken Nuggets',
    description:          'Dino nuggets or Tyson nuggets — hot, crispy, dipped in something. Iconic.',
    image_url:            'https://source.unsplash.com/featured/?chicken+nuggets,nuggets',
    cuisine:              'American',
    meal_time:            ['lunch', 'snack'],
    prep_time_mins:       15,
    effort_score:         1,
    is_recipe_of_the_day: false,
    tags:                 ['frozen', 'chicken', 'snack', 'kids'],
    ingredients_list:     ['1 bag Frozen chicken nuggets', 'Ketchup, ranch, or BBQ sauce for dipping'],
    shopping_list:        [],
    recipe_steps:         ['Preheat oven to 400°F.', 'Spread nuggets in a single layer on a baking sheet.', 'Bake 12-14 minutes, flipping halfway through.', 'Let cool 2 minutes so you do not destroy the roof of your mouth.'],
  },
  {
    title:                'Fried Bologna Sandwich',
    description:          "Pan-fried bologna with mustard and American cheese. Don't knock it till you've tried it.",
    image_url:            'https://source.unsplash.com/featured/?bologna,fried+sandwich,lunch',
    cuisine:              'American',
    meal_time:            ['breakfast', 'lunch'],
    prep_time_mins:       5,
    effort_score:         1,
    is_recipe_of_the_day: false,
    tags:                 ['sandwich', 'budget', 'quick', 'classic'],
    ingredients_list:     ['2 slices White bread', '2-3 thick slices Bologna', '1 slice American cheese', '1 tbsp Yellow mustard', '1 tsp Butter'],
    shopping_list:        [],
    recipe_steps:         ['Score the edges of bologna slices with a knife to prevent curling.', 'Melt butter in a pan over medium-high heat.', 'Fry bologna 1-2 min per side until edges are brown and slightly crispy.', 'Lay cheese on top; let it melt.', 'Build sandwich with mustard on bread. Eat it.'],
  },

];

// ─── Main ──────────────────────────────────────────────────────
async function main() {
  console.log('');
  console.log('🍔  Food For You — Comfort Food Seed Script');
  console.log('─'.repeat(52));
  console.log(`📡  Supabase:  ${SUPABASE_URL}`);
  console.log(`🎯  Inserting: ${RECIPES.length} hardcoded comfort food recipes`);
  console.log('─'.repeat(52));
  console.log('');

  let inserted = 0;
  let failed   = 0;

  for (let i = 0; i < RECIPES.length; i++) {
    const recipe = RECIPES[i];
    const num    = `[${String(i + 1).padStart(2, '0')}/${RECIPES.length}]`;
    const spoons = '🥄'.repeat(recipe.effort_score);
    const label  = ['', 'Effortless', 'Easy', 'Moderate', 'Involved', 'Weekend'][recipe.effort_score];

    process.stdout.write(`   ${num}  ${recipe.title.padEnd(38).slice(0, 38)} `);

    const { error } = await supabase.from('recipes').insert(recipe);

    if (error) {
      console.log(`❌  ${error.message}`);
      failed++;
    } else {
      console.log(`✓  ${spoons} ${label}  ·  ${recipe.prep_time_mins} min`);
      inserted++;
    }
  }

  console.log('');
  console.log('─'.repeat(52));
  console.log(`🏁  Done!  ✅ Inserted: ${inserted}   ❌ Failed: ${failed}`);
  if (failed > 0) {
    console.log('');
    console.log('   Possible causes for failures:');
    console.log('   • A recipe with the same title already exists in the table');
    console.log('   • A NOT NULL column is missing (check the schema)');
    console.log('   • Check Supabase Dashboard → Logs for details');
  }
  console.log('─'.repeat(52));
  console.log('');
  console.log('   Pull-to-refresh the Home screen to see your new recipes!');
  console.log('');
}

main().catch((err) => {
  console.error('');
  console.error('💥  Unexpected error:', err.message || err);
  process.exit(1);
});
