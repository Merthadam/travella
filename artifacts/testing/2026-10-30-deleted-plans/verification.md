# Recently deleted — journal list

Date: 2026-10-30

## Request and design

Use the My plans design for Recently deleted, with a uniform list and no highlighted first entry. User explicitly selected reuse of the existing design and additionally requested deleting the old view.

Acceptance: shared Google Maps destination photos and honest placeholders, Research/Canvas stage, title/destination/dates/saved-place summary, exact recovery deadline and remaining time, existing Restore confirmation, accessible navigation, loading/error/empty and pagination. No featured entry or obsolete grid/card markup remains.

The [intended list preview](plan/intended-list.png) is a browser-rendered sketch with illustrative content and inactive actions, captured before implementation. The [before screenshot](plan/before.png) records the old view. The implementation reuses DestinationPhoto, journal styles and summary helpers; it does not change backend lifecycle contracts.

## Implementation

- Recently deleted uses equal single-column journal rows; mobile stacks each photo and its details.
- Generated plans use actual Google Maps photos with contributor attribution. Research plans use the same placeholder as My plans.
- Restore keeps its confirmation, revision/idempotency handling and recovery details. Back to My plans is available directly in the heading.
- Removed old plan-grid, plan-card, plan-badge and plan-empty markup/styles, their responsive grid rule and obsolete theme selectors. Repository search confirms no references remain in frontend JSX/CSS. Shared restore-dialog and plan-opening status styles remain in use.

## Automated and runtime verification

Commands executed from `frontend/`:

- `npm test -- src/PlansApp.test.jsx src/PlansResume.test.jsx src/features/plans/components/DestinationPhoto.test.jsx` — 27 passed, covering lifecycle restore, restore-read retry, active cards, resume behavior and photo fallbacks.
- `npm run build` — passed; existing large-chunk advisory remains.
- `git diff --check` — passed.

The existing Cognito precheck and `bash scripts/start-local-ready.sh` passed. Local app health, example-account sign-in/session/sign-out passed. SHA-256 matches confirmed all four changed runtime files in the running Compose app container. The local app remains running at http://localhost:5174. Database volumes preserved.

## Chrome DevTools verification

Used the supplied example account in an isolated Chrome DevTools MCP browser because the default profile was already occupied. Screenshots were visually inspected; no clipped text, overlapping controls or horizontal page overflow was observed.

| Check | Observed result |
| --- | --- |
| Desktop 1440 × 1000, dark/light | Equal rows, no featured card; first three rows all x=140, width=1160, height=239.375px. |
| Real Google Maps photo | Saved Lisbon plan loaded an actual photo and contributor attribution; research entries kept their honest placeholder. |
| Mobile 390 × 844, dark/light | Equal 354px-wide rows at x=18, stacked photos/details; readable recovery dates, usable Restore button, no horizontal overflow. |
| Retired view | Zero old card/grid/badge elements and zero featured entries in Recently deleted. |
| Back navigation | Back to My plans returned to the current active journal; View recently deleted reopened the new list. |
| Pagination | Load more plans increased displayed rows from 25 to 30. |
| Restore cancel/keyboard | Cancel left the test Plan deleted. Escape closed confirmation and restored focus to the exact Restore trigger. |
| Real restore | Native Chrome click on Restore, then confirmation, restored the task-owned Plan and opened its Conversation. HTTP readback reported active; reload retained the active Plan and composer. It disappeared from Recently deleted. |
| Error/retry/loading | Browser-only simulated list 503 showed a readable error and Retry. Retry with a deliberately held response showed the loading message and aria-busy=true; releasing the real response recovered 25 rows with no error. |
| Empty | Browser-only simulated empty list showed “No recently deleted plans” and the seven-day explanation. Original fetch restored afterward. |
| Console/network | No console errors or failed same-origin resource requests on real paths. Only the existing Lit development-mode warning appeared. |

Task-owned fixture: `Deleted list verification · 30 October`, Plan `53929fce-9c19-43d1-9cb2-ed7246e0a909`. Created, named and soft-deleted through the real authenticated API solely for verification; restored through the actual UI and reloaded. Cleanup soft-deleted only this fixture and verified its deleted state. Existing Plans were read only. No model calls or bookings. Backend CRUD implementation is unchanged.

No applicable verification gates remain blocked. Simulated error/empty/loading states are explicitly distinguished above from real provider photos, pagination and persistent restore.

## Screenshots

- [Desktop light](implementation/desktop-light.png) · [Desktop dark](implementation/desktop-dark.png)
- [Mobile light](implementation/mobile-light.png) · [Mobile dark](implementation/mobile-dark.png)
- [Restore confirmation](implementation/restore-confirm.png) · [Restored after reload](implementation/restored.png)
- [Simulated error](implementation/error.png) · [Held loading state](implementation/loading.png) · [Simulated empty state](implementation/empty.png)
