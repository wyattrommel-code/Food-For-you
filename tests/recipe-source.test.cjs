const { test } = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript');
const Module = require('node:module');
const path = require('node:path');
const file = path.resolve(__dirname, '../lib/recipeSource.ts');
const compiled = ts.transpileModule(require('node:fs').readFileSync(file, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
});
const mod = new Module(file, module);
mod._compile(compiled.outputText, file);
const { getRecipeSource } = mod.exports;
test('existing recipes without attribution remain supported', () => {
  assert.equal(getRecipeSource({}), null);
});
test('source links allow HTTPS and reject other schemes and embedded credentials', () => {
  for (const url of ['javascript:alert(1)', 'file:///etc/passwd', 'http://example.com', 'https://user:password@example.com', 'not a url']) {
    assert.equal(getRecipeSource({ source_url: url }), null);
  }
  assert.deepEqual(getRecipeSource({ source_url: 'https://example.com/recipe', source_name: ' Creator ' }), {
    url: 'https://example.com/recipe', label: 'Creator'
  });
});
