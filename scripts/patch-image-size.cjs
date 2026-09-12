// Temporary bounds checks for GHSA-w3rx-r6r6-pgpr / GHSA-5p2g-fcmc-qvqq.
// The locked upstream 1.2.1 has no published fix. Fail if its code changes.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const lock = JSON.parse(fs.readFileSync(path.join(root, 'package-lock.json'), 'utf8'));
const packages = Object.entries(lock.packages).filter(([name]) => name.endsWith('node_modules/image-size'));
if (!packages.length) throw Error('Review image-size patch: dependency not found');
for (const [location, pkg] of packages) {
  if (pkg.version !== '1.2.1') throw Error('Review image-size patch before accepting upstream version ' + pkg.version);
  const folder = path.resolve(root, location);
  if (!folder.startsWith(root + path.sep)) throw Error('Unsafe dependency path');
  const patches = [
    ['dist/types/icns.js',
      '    const imageLengthOffset = imageOffset + ENTRY_LENGTH_OFFSET;',
      `    const imageLengthOffset = imageOffset + ENTRY_LENGTH_OFFSET;
    // Mealsolved security patch: each entry must advance past its header.
    if ((0, utils_1.readUInt32BE)(input, imageLengthOffset) < 8) {
        throw new TypeError('Invalid ICNS entry length');
    }`],
    ['dist/types/utils.js',
      '        if (box.name === boxName)',
      `        // Mealsolved security patch: callers must never receive a zero-size box.
        if (!Number.isSafeInteger(box.size) || box.size < 8) {
            throw new TypeError('Invalid image box length');
        }
        if (box.name === boxName)`],
  ];
  for (const [relative, before, after] of patches) {
    const file = path.join(folder, relative);
    const original = fs.readFileSync(file, 'utf8');
    const text = original.replace(/\r\n/g, '\n');
    if (text.includes(after)) continue;
    if (text.split(before).length !== 2) throw Error('Review image-size patch: unexpected source in ' + relative);
    fs.writeFileSync(file, text.replace(before, after));
  }
}
console.log('Applied image-size loop bounds checks to ' + packages.length + ' locked dependency installation(s).');
