# Android 1.0.9 (15)

Published September 25, 2026 at 3:46 PM America/Denver to the existing internal testing track. Google Play confirms **Available to internal testers**. This is not a public production release.

Changes: compact Home actions, Help Me Decide with one filter sheet for meals/proteins/cuisines/time, three choices with compatible holds preserved during refresh, and dislike controls inside recipe details rather than discovery cards.

Signed EAS build: `70b45dd1-0101-4473-9e71-c68c45b766cf`; source commit `9423149850444c38ba577ee991d6b1b29eed9541`. AAB size 50,159,316 bytes. SHA-256 `4feb6fff7b3c86af6e6d2e7a73e74354265e64b7bbdb974ab6bd338e6a64b3c9`.

Validation: 132 tests passed; TypeScript passed; production Android Hermes export passed. ZIP integrity verified. Embedded app.config confirms version 1.0.9, Android code 15, correct package and production backend. Bundle JWT roles contain only anon; fixture and SMTP credential markers absent. Play reports no device support loss, no errors, and the existing optional deobfuscation-file warning.

No Android phone was connected, so installation over 1.0.8 and physical-device smoke testing remain for a tester. Existing browser regression coverage is documented in help-me-decide.md.

Expo billing before build: $7/$45 used, $38 remaining; subscription canceled effective September 28; upcoming bill $0. No subscription renewal or paid upgrade performed.

Tester opt-in link: https://play.google.com/apps/internaltest/4701571696443292910

Play says availability on phones can take about an hour or occasionally longer. GitHub main contains the released application change and launch kit. The launch kit itself is documentation and social artwork, not an additional native app change.
