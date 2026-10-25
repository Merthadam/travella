# Clickable travel cards — verification

## Result
The complete Flights and Accommodation card surface opens its existing travel screen. The redundant Explore text, arrow, divider and dedicated action row are removed. Booking status, trip details, and provider/sandbox disclosure remain. The existing native button fills the card, retains its accessible name and disabled state, and preserves the existing return-focus selector.

## Evidence
- [Before](plan/before.png)
- [Pre-implementation layout sketch](plan/layout-sketch.png)
- [Desktop implementation](implementation/desktop.png)
- [Mobile implementation](implementation/mobile.png)

Chrome DevTools captures were cropped to affected cards and visually inspected. The user's existing choice to skip design alternatives was honored.

## Executed checks
- `NODE_OPTIONS=--no-experimental-webstorage npm --prefix frontend test -- src/features/plans/components/PlanningCanvas.test.jsx`: 21/21 pass, including travel navigation, preservation of unsent edits, omitted flight modes, mock booking and reload scenarios.
- `npm --prefix frontend run build`: pass; existing bundle-size advisory remains.
- `git diff --check`: pass.
- Existing Cognito precheck and `bash scripts/start-local-ready.sh`: pass; authenticated sign-in/session/sign-out cycle verified.
- Container hashes match TravelEntry.jsx and components.css from this checkout.
- Chrome DevTools as the example account, localhost:5174, existing Medellín plan; no durable Plan edits or bookings.
- Desktop 1440×1000: Flights button covers the entire inner card (472×268.6px within the 474×270.6px border). Header, corner padding and lower body hit tests all target that button. Visible Explore text is absent.
- Browser click opens Explore flights. Back returns to canvas and restores focus to the Flights card button. Enter opens flights again.
- Accommodation card opens Explore stays; Back restores its card focus.
- Tab/Shift+Tab reveals a solid full-card focus outline with -4px inset, avoiding clipping by rounded card overflow.
- Mobile 390×844: no horizontal overflow; Flights and Accommodation remain readable, whole-card controls are 226px/252px tall. Browser activation opens Flights and returns correctly.
- Console has no errors; existing Lit dev-mode and Google marker API warnings only.
- All 17 inspected fetch/XHR requests returned 200.
- Loading/error/empty card handling and provider/disabled gating were not modified; generic Card renders the target only in its existing ready-state children. No new layout-mirroring unit tests added.

## Scope
Two source files changed. No API, database, Plan persistence, or provider behavior changes. Local stack remains running with this change.
