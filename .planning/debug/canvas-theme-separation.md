---
status: resolved
trigger: "paln canvas isnt user friendly dark and light mode arent seperate yet fix that first"
created: 2026-10-09
updated: 2026-10-10
---

## Symptoms
Expected: distinct readable light and dark Plan canvas, consistent with the saved appearance preference, usable controls.
Actual: user reports canvas is unfriendly and modes are not separated. Existing canvas/chat CSS contains many fixed light colors.
Reproduction: open Plan canvas and switch account appearance between light/dark.
Timeline/errors: visual problem reported after sandbox checkout delivery; no runtime error reported.

## Current Focus
hypothesis: design-system canvas tokens and fixed component colors override application appearance tokens.
next_action: compare computed styles and screenshots in both modes; repair theme mapping and control contrast within existing approved layouts.

## Scope
Continue existing selected canvas/layout design, fixing theme behavior rather than opening a new structural prototype decision. Preserve Plan data. Execute GSD debugging inline.
Verify desktop/mobile, theme switching and reload persistence, editors/chat/map/search surfaces, console/network, production build. Evidence: artifacts/testing/2026-10-09-canvas-themes/.

## Resolution
Confirmed fixed DS tokens and hardcoded light component surfaces caused the mismatch, including unreadable chat Markdown. Connected shared tokens, themed all canvas surfaces, added shared persisted controls and map color-scheme recreation preserving viewport. Improved helper text and centered dialogs.
Verification: 13 focused tests, production build, Chrome DevTools desktop/mobile theme switching, reload persistence, editors, search, empty/loading/offline recovery, sampled contrast and console/network checks passed. Evidence: artifacts/testing/2026-10-09-canvas-themes/verification.md.
