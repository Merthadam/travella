# Clickable plan cards — 2026-10-24

Source: `9b2563f`. Quick task: `261024-m18`.

The user's approved journal now opens a plan from its photo, details or empty card space. The name/editor, trash and provider-credit links stay independent. Both featured and ordinary CTA/footer sections were removed. A native anchor preserves keyboard access and modified-click browser behavior without nesting buttons inside a link. Featured cards use a shorter photo minimum height.

## Checks executed

- `npm --prefix frontend test -- src/PlansApp.test.jsx src/features/plans/components/PlanDrawers.test.jsx`: 24 passed.
- `npm --prefix frontend run build`: passed (578 modules), existing large-bundle advisory only.
- `git diff --check`: passed.
- Authenticated Chrome DevTools MCP, configured example account, canonical `http://localhost:5174`.
- Created two isolated verification plans through the actual API: one Research plan and one saved Canvas. Generated photo click opened the saved Canvas; ordinary card details opened Research. Keyboard Enter on the native link opened Research. Mobile photo click opened the saved Canvas.
- Browser hit tests confirmed card whitespace maps to the plan link in both featured and ordinary cards. No separate Continue research/Open canvas block remains.
- Inline rename stayed on `/plans`, saved and restored title focus. Rapid open/back caused an existing revision conflict; its explicit review-and-retry flow worked without navigation. The initial test assumed the Research screen showed its plan name; corrected the wait to its actual heading and verified the route. No source workaround was needed.
- Photo-credit links remained independently clickable. The offscreen mobile photo was lazy-loaded only after scrolling into view, as designed.
- Trash on the task-owned Research plan soft-deleted it without opening the plan. Readback confirmed deleted lifecycle and recovery deadline. The second task-owned plan was also soft-deleted and read back. Existing plans were not renamed or deleted.
- Desktop/mobile light/dark screenshots visually inspected for overlap, clipping and readable text. At 390px width there was no horizontal overflow. Final mobile screenshots use the original example plans after cleanup, without mutating them. Full-page capture was retaken at scroll position zero to avoid a sticky-header capture artifact.
- Console inspection: existing Lit development warning only, no errors. Final inspection of 85 preserved fetch/XHR/image requests found no failed responses.
- Read-only Cognito precheck, `bash scripts/start-local-ready.sh`, and sign-in/session/sign-out health check passed. SHA-256 matched both changed source files in the running container. Final browser restored to the full journal in light mode.

## Evidence

- [Before](plan/before-card-actions.png)
- [Desktop light](implementation/cards-desktop-light.png)
- [Desktop dark](implementation/cards-desktop-dark.png)
- [Mobile light](implementation/cards-mobile-light.png)
- [Mobile dark](implementation/cards-mobile-dark.png)

No backend code changed, no model calls, no push or merge. Modified-click behavior is preserved by native-link semantics; opening additional tabs was not separately exercised.
