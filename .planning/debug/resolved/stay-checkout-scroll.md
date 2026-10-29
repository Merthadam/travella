---
status: resolved
trigger: User cannot scroll the new stays checkout
---
## Symptoms
Expected: wheel/touch/keyboard scrolling reaches all room terms and actions.
Actual: checkout does not scroll after entering from the stays workspace.
Timeline: immediately after guided stays implementation.
## Current Focus
Hypothesis: hidden mounted travel workspace still matches :has(.travel-workspace), setting checkout container overflow:hidden.
Test: authenticated Chrome DevTools enter from Browse stays, inspect overflow, exercise user keyboard/wheel before and after scoped CSS correction.
## Evidence
Source keeps visited TravelWorkspace mounted while showing checkout. travel-workspace.css targets descendants regardless of hidden state.
## Resolution
Root cause confirmed: hidden workspace matched layout rule and blocked user scrolling.
Fix: constrain workspace :has selectors to direct non-hidden workspace children.
Verification: Chrome PageDown stuck at0 before; desktop reaches579px maximum afterward; mobile reaches1281px and PageUp returns549. Build/auth/runtime hash passed; screenshots inspected; test Plan cleaned up.
Evidence: artifacts/testing/2026-10-29-stays-scroll/verification.md
