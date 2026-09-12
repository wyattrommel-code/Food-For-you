const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');

test('lockfile links resolve to packaged source in a clean checkout', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const root = path.resolve(__dirname, '..');
  const lock = require('../package-lock.json');
  for (const [name, entry] of Object.entries(lock.packages)) {
    if (!entry.link) continue;
    assert.ok(entry.resolved && !entry.resolved.split('/').includes('node_modules'), `${name} points into installed dependencies`);
    const target = path.resolve(root, entry.resolved);
    assert.ok(target.startsWith(root + path.sep), `${name} points outside the packaged project`);
    assert.ok(fs.existsSync(path.join(target, 'package.json')), `${name} has no packaged source`);
  }
});

function isolated(code) {
  const result = spawnSync(process.execPath, ['-e', code], { cwd: require('node:path').resolve(__dirname, '..'), timeout: 5000, encoding: 'utf8' });
  assert.equal(result.error, undefined, 'Dependency check timed out: ' + result.error);
  assert.equal(result.status, 0, result.stderr);
}

test('query parsing preserves Unicode and handles hostile encoded input without hanging', () => {
  isolated(`const assert=require('node:assert/strict');
    const query=require('query-string');
    assert.equal(query.parse('name=cr%C3%A8me+br%C3%BBl%C3%A9e').name,'crème brûlée');
    assert.equal(query.parse('next=%2Frecipe%2F123').next,'/recipe/123');
    const malicious='%FF'.repeat(10000);
    assert.equal(query.parse('name='+malicious).name,malicious);`);
});

test('image-size rejects ICNS zero-length entries without hanging', () => {
  isolated(`const assert=require('node:assert/strict');
    const size=require('image-size');
    const data=Buffer.from('69636e73000000106973333200000000','hex');
    assert.throws(()=>size(data),/Invalid ICNS entry length/);`);
});

test('image-size rejects zero-length JXL and HEIF boxes without hanging', () => {
  isolated(`const assert=require('node:assert/strict');
    const size=require('image-size');
    const jxl=Buffer.from('0000000c4a584c200d0a870a00000010667479706a786c2000000000000000006a786c70','hex');
    assert.throws(()=>size(jxl),/Invalid image box length/);
    const heif=Buffer.from('00000010667479706176696600000000000000246d657461000000000000000869707270000000146970636f000000006973706500000000000000000000000000000000','hex');
    assert.throws(()=>size(heif),/Invalid image box length/);`);
});

test('image parser still reads ordinary PNG and valid ICNS headers', () => {
  const size = require('image-size');
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jvJkAAAAASUVORK5CYII=', 'base64');
  assert.equal(size(png).width, 1);
  const icns = Buffer.from('69636e73000000106973333200000008', 'hex');
  assert.equal(size(icns).width, 16);
});

test('patched build dependencies preserve their consumed APIs', () => {
  const project = require('xcode').project('unused.pbxproj');
  project.hash = { project: { objects: {} } };
  assert.match(project.generateUuid(), /^[A-F0-9]{24}$/);
  const css = require('postcss').parse('a { color: red }');
  assert.equal(css.first.first.value, 'red');
});
