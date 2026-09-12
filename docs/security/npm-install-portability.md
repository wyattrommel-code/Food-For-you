# Portable installation of the patched URL decoder

On September 12, 2026, EAS build `a271a4b7-569c-489c-b7ea-89860cc27231` failed during JavaScript bundling because `query-string` could not resolve `decode-uri-component`. No app bundle was produced.

The npm 11-generated lockfile pointed the local override at `node_modules/query-string/vendor/decode-uri-component`, even though its checked-in source lives at `vendor/decode-uri-component`. The existing Windows junction pointed at the correct source, which masked the bad lock entry during earlier local checks. Expo's npm 10.9.3 install/prebuild sequence exposed the mismatch.

The decoder is now an explicit root `file:` dependency, and the override references that root specification with `$decode-uri-component`, following [npm's documented override references](https://docs.npmjs.com/cli/v10/configuring-npm/package-json/#overrides). The regenerated lock links to `vendor/decode-uri-component` and records that package's metadata. No decoder logic, upstream license or security guard was removed; no other dependency version changed.

Validation used a fresh temporary checkout with npm 10.9.3: `npm ci --include=dev`, Expo Android prebuild, a second `npm install --include=dev`, the regression suite and Android export. The resulting Hermes bundle matched the previously validated app bundle. A new regression check rejects lockfile links into installed dependencies or outside the packaged project and verifies that linked source packages exist in the checkout.
