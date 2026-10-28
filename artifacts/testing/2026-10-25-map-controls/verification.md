# Map control verification — 2026-10-25

## Result
The reset control is a floating button within the map. The desktop map fills the right column through the place-count row; the mobile map reclaims the former control strip. No durable Plan changes or model calls were made.

## Evidence
- [Original user screenshot](plan/user-before.png)
- [Layout sketch](plan/layout-sketch.png)
- [Desktop implementation](implementation/desktop.png)
- [Mobile implementation and keyboard focus](implementation/mobile.png)

The pre-implementation DOM sketch was created before production edits, but its screenshot failed: the DevTools server rejected workspace and /tmp output paths, and its initial capture timed out. After bringing the browser forward and using viewport emulation, captures succeeded as image responses and were saved locally. The layout sketch image was reconstructed afterward; it is not a successful pre-implementation capture. Element capture produced an incorrect crop, so desktop evidence uses a DevTools viewport capture cropped to the affected card. Screenshots were visually inspected.

## Checks
- Existing tests: `NODE_OPTIONS=--no-experimental-webstorage npm test -- src/features/plans/components/CanvasDestinationMap.test.jsx src/design-system/components/DestinationMap.test.jsx` — 14/14 pass. Initial run without the option failed 8 tests because host Node exposed undefined localStorage; no application change was needed.
- `npm run build` — pass, existing large-chunk advisory remains.
- Local Cognito precheck and `bash scripts/start-local-ready.sh` — pass; authenticated sign-in/session/sign-out verified. Stack rebuilt from the eight-marten checkout containing this change.
- Container SHA-256 matches checked for all three changed source files.
- Chrome DevTools used with the supplied example account, canonical localhost origin, and its existing Medellín plan. Only local view state changed; existing plan content was read for the screenshot context.
- Desktop 1440×1000: map measured 497px tall (formerly fixed at 390px), fills its column to the card's 24px bottom padding; floating control is inside the map.
- Food filter shows two pins. Show all places restores All places 3 and clears selection. Verified with actual browser clicks.
- Pin click opens LEYENDA URBANA details; reset clears them. An initial stale-marker click failed; fresh snapshot after rerender succeeded.
- Mobile 390×844: map is 364px high, button remains within map bounds, no horizontal page overflow. Google logo, attribution and camera controls remain visible.
- Keyboard Tab/Shift+Tab shows visible focus ring on reset button; Enter restores all three places from Food filtering.
- Reload through viewport emulation reopens the saved places and new map layout correctly.
- Console: no errors; existing Lit development-mode and Google advanced-marker event API warnings.
- Network: all 16 inspected fetch/XHR requests returned 200. No related failures.
- Empty/geocoding-error/retry behavior covered by existing component tests; live provider outages were not forced. Messages and preview details remain outside the map frame and were not modified.
- `git diff --check` — pass.

## Scope
Only map markup and layout CSS changed. No API, provider integration, database, or Plan mutation behavior changed. Prototype alternatives were offered; the user selected the requested layout.
