# CommonJS compatibility backport

Source: https://github.com/SamVerschueren/decode-uri-component/tree/v0.5.0

The original MIT license is retained in `license`. `index.cjs` is upstream v0.5.0 `index.js`, with the single `export default function decodeUriComponent` declaration changed to `module.exports = function decodeUriComponent`. This supplies the patched decoder to query-string 7, whose CommonJS caller expects a function from `require()`.

The local package is private and is not published. Keep the upstream version and attribution accurate. Remove this backport once Expo's supported navigation stack consumes a patched decoder natively. Regression coverage is in `tests/dependency-security.test.cjs`.
