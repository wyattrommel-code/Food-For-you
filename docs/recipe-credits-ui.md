# Compact recipe credits

The recipe detail page now shows a collapsed **Sources & photo credits** control instead of the prominent recipe inspiration link. Expanding it reveals the recipe source and the complete photo attribution, including creator, license, modifications and serving-variation notes. Photo source and license URLs remain clickable. Recipes without either source or photo credits show no empty control. The disclosure resets when navigating to another recipe and announces its expanded state to assistive technology.

Known photo-credit suffixes are separated for presentation only; stored descriptions and attribution records are unchanged. Unknown description formats remain visible in full. TypeScript, three focused source/attribution tests, source credential scanning and whitespace checks pass.

This change was made after Android 1.0.2 (8) was published to internal testing and is **not included in that binary**. It requires a subsequent Android build and release. No additional cloud build was started for this change.
