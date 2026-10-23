# Research docking verification — 2026-10-23

Latest user placement: brief circle at the **top-right end of the progress bar**, composer at viewport bottom. Supersedes the earlier top-left suggestion. Desktop only; existing prototype C interaction retained.

## Evidence

- [Before](plan/before.png)
- [Temporary browser layout sketch](plan/top-right-docking-sketch.png), captured before source implementation; no data changes.
- [Implemented default](implementation/desktop-closed.png)
- [Open overlay](implementation/desktop-open.png)
- [Dragged overlay](implementation/dragged-open.png)
- [Long-history layout fixture](implementation/long-history-layout-fixture.png), temporary DOM-only messages, removed on reload.
- [1280 × 800 desktop](implementation/desktop-1280.png)

All implementation screenshots were visually inspected. The panel intentionally overlays content and scrolls internally; chat and composer do not reflow.

## Executed checks

- `npm --prefix frontend test -- src/features/plans/components/ResearchBriefOverlay.test.jsx src/features/plans/components/ResearchDraftOffer.test.jsx src/features/plans/useResearchOffer.test.jsx`: 16 passed.
- `npm --prefix frontend test -- src/features/plans/components/PlanConversation.test.jsx`: 14 passed.
- `npm --prefix frontend run build`: passed; existing large-chunk warning remains.
- `git diff --check`: passed.
- Isolated `travella-research17` stack rebuilt using `scripts/start-local-ready.sh`, following the local skill. Cognito precheck and temporary example-account sign-in/session/sign-out succeeded. SHA-256 comparison of changed overlay, progress component, and stylesheet against `/app/` in the running container: all match.
- Chrome DevTools, existing authenticated example-user session at localhost:5178. `/auth/account` returned 200; account match asserted as a boolean without recording account payload. `/auth/session` did not include the email, so the account endpoint verified identity.
- At 1440 × 1000, default circle and reserved progress anchor both x=1348, y=88, size=52. Composer bottom=1000. At 1280 × 800, circle matches its anchor, composer bottom=800, no horizontal overflow.
- Actual DevTools click opens panel; transcript/composer bounding rectangles unchanged. Escape closes and returns focus. ArrowLeft moves circle 12px without opening. DevTools pointer drag moves it without accidental opening or chat displacement. Opening after drag works.
- Twenty temporary DOM-only transcript entries force scrolling; composer remains at bottom. Reload removes fixture and restores default top-right position. No saved Plan edits or agent requests were made.
- Console: no errors; existing Lit development-mode warning. Network: session, account, profile, Plan, destinations, context, offer, messages and brief reads returned 200; no relevant failures.

## Limits

Desktop layout follow-up only. Mobile and live paid agent/generation execution were not retested. Saved theme remained dark even when OS light mode was emulated; screenshots document the actual dark theme. Prior phase 17 agent/generation acceptance remains pending as recorded in its UAT; this record verifies the new layout, not full-phase acceptance.
