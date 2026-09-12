/**
 * Normalizes grocery / recipe ingredient text into a short pantry name:
 * core food words only (no quantities, units, or prep descriptors).
 */

const PAREN_REGEX = /\([^)]*\)/g;

const STOP_TOKENS = new Set<string>([
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
  'few',
  'several',
  'some',
  'any',
  'lb',
  'lbs',
  'pound',
  'pounds',
  'oz',
  'ounce',
  'ounces',
  'cup',
  'cups',
  'tbsp',
  'tablespoon',
  'tablespoons',
  'tsp',
  'teaspoon',
  'teaspoons',
  'g',
  'kg',
  'gram',
  'grams',
  'kilogram',
  'kilograms',
  'mg',
  'ml',
  'l',
  'liter',
  'liters',
  'litre',
  'litres',
  'pint',
  'pints',
  'quart',
  'quarts',
  'gal',
  'gallon',
  'gallons',
  'can',
  'cans',
  'jar',
  'jars',
  'box',
  'boxes',
  'bag',
  'bags',
  'package',
  'packages',
  'pkg',
  'carton',
  'cartons',
  'bottle',
  'bottles',
  'stick',
  'sticks',
  'slice',
  'slices',
  'clove',
  'cloves',
  'strip',
  'strips',
  'piece',
  'pieces',
  'fillet',
  'fillets',
  'stalk',
  'stalks',
  'bunch',
  'bunches',
  'head',
  'heads',
  'sprig',
  'sprigs',
  'pinch',
  'pinches',
  'dash',
  'cube',
  'cubes',
  'sheet',
  'sheets',
  'packet',
  'packets',
  'boneless',
  'skinless',
  'bone-in',
  'diced',
  'minced',
  'chopped',
  'sliced',
  'grated',
  'shredded',
  'softened',
  'melted',
  'cooked',
  'raw',
  'frozen',
  'fresh',
  'dried',
  'canned',
  'whole',
  'ground',
  'peeled',
  'halved',
  'quartered',
  'cubed',
  'beaten',
  'separated',
  'divided',
  'unsalted',
  'salted',
  'plain',
  'large',
  'medium',
  'small',
  'thick',
  'thin',
  'thinly',
  'thickly',
  'roughly',
  'finely',
  'coarsely',
  'optional',
  'room',
  'temperature',
  'warm',
  'cold',
  'more',
  'plus',
  'about',
  'approximately',
  'approx',
  'each',
  'extra',
  'to',
  'taste',
  'needed',
  'serving',
  'servings',
  'garnish',
  'garnishes',
  'dipping',
  'topping',
  'toppings',
  'leaves',
  'leaf',
  'greek',
  'italian',
  'mexican',
  'style',
  'low-sodium',
  'low-salt',
  'low',
  'sodium',
  'reduced-sodium',
  'reduced',
  'fat-free',
  'fat',
  'free',
  'nonfat',
  'skim',
  'organic',
  'ripe',
  'firm',
  'packed',
  'lightly',
  'well',
  'very',
  'super',
  'jumbo',
  'baby',
  'young',
  'old',
  'pitted',
  'stoned',
  'seeded',
  'deveined',
  'trimmed',
  'cleaned',
  'washed',
  'drained',
  'rinsed',
  'patted',
  'dry',
  'thawed',
  'defrosted',
  'zested',
  'juiced',
  'juice',
  'into',
  'chunks',
  'crumbled',
  'crumbles',
  'cool',
  'soft',
  'hard',
  'boiling',
  'simmering',
  'hot',
  'iced',
  'smoked',
  'cured',
  'marinated',
  'seasoned',
  'unseasoned',
  'toasted',
  'roasted',
  'blanched',
  'steamed',
  'fried',
  'deep-fried',
  'breaded',
  'panko',
  'coated',
  'stale',
  'for',
  'to',
]);

const NUM_TOKEN = /^\d+(\.\d+)?$/;
const FRAC_TOKEN = /^\d+\/\d+$/;
const RANGE_TOKEN = /^\d+\s*-\s*\d+$/;

const PHRASE_FIXES: { pattern: RegExp; replace: string }[] = [
  { pattern: /\bchicken\s+breasts\b/gi, replace: 'chicken breast' },
  { pattern: /\bchicken\s+thighs\b/gi, replace: 'chicken thigh' },
  { pattern: /\bchicken\s+legs\b/gi, replace: 'chicken leg' },
  { pattern: /\bchicken\s+wings\b/gi, replace: 'chicken wing' },
  { pattern: /\begg\s+whites\b/gi, replace: 'egg white' },
  { pattern: /\begg\s+yolks\b/gi, replace: 'egg yolk' },
  { pattern: /\bbasil\s+leaves\b/gi, replace: 'basil' },
];

function postProcessPantryName(out: string, originalLower: string): string {
  const o = out.trim().toLowerCase();
  if (o === 'tomatoes') {
    if (/\bcrushed\s+tomatoes\b/.test(originalLower)) return 'crushed tomatoes';
    if (/\bdiced\s+tomatoes\b/.test(originalLower)) return 'diced tomatoes';
  }
  return out;
}

/**
 * Returns a single pantry-style ingredient name, or null if nothing usable remains.
 */
export function cleanIngredientLineForPantry(raw: string): string | null {
  const originalLower = raw.trim().toLowerCase();

  let s = originalLower;
  if (!s) return null;

  s = s.replace(PAREN_REGEX, ' ').replace(/\s+/g, ' ').trim();

  const commaIdx = s.indexOf(',');
  if (commaIdx !== -1) {
    s = s.slice(0, commaIdx).trim();
  }

  const dashMatch = s.match(/\s[-–—]\s/);
  if (dashMatch && dashMatch.index !== undefined) {
    s = s.slice(0, dashMatch.index).trim();
  }

  s = s.replace(PAREN_REGEX, ' ').replace(/\s+/g, ' ').trim();
  if (!s) return null;

  let tokens = s.split(/\s+/).filter(Boolean);

  tokens = tokens.filter((tok) => {
    const t = tok.toLowerCase();
    if (NUM_TOKEN.test(t) || FRAC_TOKEN.test(t) || RANGE_TOKEN.test(t)) return false;
    if (/^\d+$/.test(t)) return false;
    if (/^\d+\.\d+$/.test(t)) return false;
    if (/^\d+\/\d+$/.test(t)) return false;
    if (/^\d+[a-z]+$/i.test(t)) return false;
    if (/^[a-z]+\d+$/i.test(t)) return false;
    if (STOP_TOKENS.has(t)) return false;
    return true;
  });

  let out = tokens.join(' ').trim();
  if (!out) return null;

  for (const { pattern, replace } of PHRASE_FIXES) {
    out = out.replace(pattern, replace);
  }

  out = out.replace(/\s+/g, ' ').trim();
  out = postProcessPantryName(out, originalLower);
  out = out.replace(/\s+for$/i, '').trim();

  if (!out || out.length < 2) return null;
  return out;
}
