# Compact recipe credits

The recipe detail page now shows a collapsed **Sources & photo credits** control instead of the prominent recipe inspiration link. Expanding it reveals the recipe source and the complete photo attribution, including creator, license, modifications and serving-variation notes. Photo source and license URLs remain clickable. Recipes without either source or photo credits show no empty control. The disclosure resets when navigating to another recipe and announces its expanded state to assistive technology.

Known photo-credit suffixes are separated for presentation only; stored descriptions and attribution records are unchanged. Unknown description formats remain visible in full. TypeScript, three focused source/attribution tests, source credential scanning and whitespace checks pass.

Published in [Android 1.0.3 (9)](testing-release-1.0.3.md) on September 12, 2026. Google Play confirms it is available to internal testers. The successful Expo build used source commit `e6c572fa616f79dfba070a34af76b3b615f1cc87`.
