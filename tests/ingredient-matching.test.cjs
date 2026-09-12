const { test } = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript');
const Module = require('node:module');
const path = require('node:path');
function load(file) {
  const filename = path.resolve(__dirname, '..', file);
  const source = require('node:fs').readFileSync(filename, 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } });
  const mod = new Module(filename, module);
  mod._compile(compiled.outputText, filename);
  return mod.exports;
}
const { isRecipeBanned, recipeAffinityScore } = load('lib/types.ts');

const prefs = (dislikes = []) => ({ disliked_ingredients: dislikes, disliked_cuisines: [], liked_ingredients: [], liked_cuisines: [] });
const recipe = (ingredients, extra = {}) => ({ id: 'a', cuisine: null, ingredients_list: ingredients, tags: [], prep_time_mins: 20, effort_score: 1, ...extra });
for (const [name, dislikes, ingredients, expected] of [
  ['eggplant is not egg', ['egg'], ['roasted eggplant'], false],
  ['plural eggs are excluded', ['egg'], ['2 eggs'], true],
  ['ham does not match champagne', ['ham'], ['champagne vinegar'], false],
  ['vegetarian excludes seafood', ['vegetarian'], ['salmon'], true],
  ['vegan excludes shellfish', ['vegan'], ['shrimp'], true],
  ['vegan excludes honey', ['vegan'], ['honey'], true],
  ['named plant milk is not dairy', ['dairy'], ['almond milk'], false],
  ['additional dairy still counts', ['dairy'], ['almond milk and heavy cream'], true],
  ['nut butter is not dairy', ['dairy'], ['peanut butter'], false],
  ['specific nuts stay specific', ['coconut'], ['almonds'], false],
  ['empty dislikes do nothing', [' '], ['chicken'], false],
  ['plural anchovies excluded', ['vegetarian'], ['anchovies'], true],
  ['diet alias works', ['gluten-free diet'], ['spaghetti'], true],
]) test(name, () => assert.equal(isRecipeBanned(recipe(ingredients), prefs(dislikes)), expected));
test('likes use whole words', () => assert.equal(recipeAffinityScore(recipe(['eggplant']), { ...prefs(), liked_ingredients: ['egg'] }, []), 0));
