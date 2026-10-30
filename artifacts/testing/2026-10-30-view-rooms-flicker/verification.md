# View rooms flicker

Date: 2026-10-30

## Exact journey and acceptance criteria

The user's screenshot identifies **View rooms** on the Meliá Lisboa Aeroporto search result. This is separate from the earlier accommodation chat transition.

Open accommodation search in the example account, select Lisbon, run a provider-backed stay search, then click that hotel's View rooms button. Keep the dialog steady while refreshing. Do not expose provisional rooms or room actions that will be replaced by the refresh. Reveal the refreshed details and rooms together. On failure, clearly label original-offer fallback; retry and close must remain available. Historical exact-room views must remain immediate and must not trigger a refresh.

## Before evidence

Chrome DevTools MCP ran in an isolated session because its default profile is in use. The supplied example account was used with an existing verification Plan; no Plan content, selected option, or booking was changed.

The real View rooms click produced:

| Time | Rooms displayed | Photos | Refreshing | Dialog y / height |
| --- | --- | --- | --- | --- |
| 48 ms | 4 original rooms | 0 | Yes | 67.5 / 765 |
| 3459 ms | 20 refreshed rooms | 4 | No | 67.5 / 765 |

The modal did not close or move. Its provisional contents were replaced, with the gallery and description inserted above the room list. The earlier chat-scroll fix cannot prevent this separate content flash.

## Implementation

- Use one static, nonanimated loading placeholder while both detail requests resolve.
- Mark the dialog busy and withhold provisional room content/actions until ready.
- Reserve the live stay dialog height so loading, success, and fallback do not resize its outer frame.
- Preserve the original-offer fallback on refresh failure, exact refreshed references/tokens on success, and immediate historical observations.

The existing layout is retained. `plan/intended-loading.png` is a temporary DOM preview of the intended loading state; it is not a provider response or production verification.

## Automated verification

- The strengthened refresh regression fails against the original component because `original-room` appears during loading; it passes with the fix.
- `npm test -- src/features/plans/travel/TravelDetails.test.jsx src/features/plans/travel/TravelSearch.test.jsx src/features/plans/travel/TravelWorkspace.test.jsx`: 111 passed.
- Coverage includes coherent refreshed references and expiry, no premature room actions, failure fallback, auth expiry, retry to empty, abort/late failures, and historical no-refresh behavior.
- `npm run build`: passed; existing chunk-size advisory remains.

## Browser verification

Passed against the rebuilt local container at `http://localhost:5174`, authenticated as the example account. The Cognito precheck and local launcher's health, sign-in, session, and sign-out checks passed. The three changed runtime source files match the running container by SHA-256.

The exact hotel's View rooms button was exercised with real provider responses:

| Viewport | Loading frame | Completed frame | Geometry throughout |
| --- | --- | --- | --- |
| Desktop, 1440 × 900 | 36 ms: 0 rooms, 0 images | 3852 ms: 20 rooms, 4 images | y 67.5, height 765, width 780 |
| Mobile, 390 × 844 | 35 ms: 0 rooms, 0 images | 4141 ms: 20 rooms, 4 images | y 63.30, height 717.39, width 350 |

Both captures kept dialog scroll at zero and background scroll unchanged. The loading state withheld provisional room actions; refreshed rooms and hotel details appeared together. Saved screenshots were visually inspected for clipping, overlap, and readability. Mobile content remains scrollable with the close control visible.

- An isolated browser-only simulated hotel-detail 503 showed a refresh warning, Retry details, and four original room offers. Restoring real requests and retrying recovered to 20 refreshed offers with no warning.
- An isolated browser-only simulated empty response showed “No room offers are available for these dates.” Both simulations restored the original fetch implementation afterward; the happy-path checks used real provider responses.
- Escape closed the dialog and returned focus to View rooms.
- No console errors or failed same-origin resource requests occurred on the real desktop happy path.
- No backend CRUD behavior changed. No option was selected or booking made; no new Plan records required cleanup.

## Evidence

- [User-reported trigger](plan/reported-trigger.png)
- [Before dialog](plan/before-refreshed-details.png)
- [Before recording](plan/before-transition.mp4)
- [Before frame measurements](plan/before-frames.json)
- [Intended loading preview](plan/intended-loading.png)
- [Desktop loading](implementation/desktop-loading.png) and [completed details](implementation/desktop-loaded.png)
- [Desktop recording](implementation/desktop-transition.mp4) and [frame measurements](implementation/desktop-frames.json)
- [Mobile loading](implementation/mobile-loading.png), [completed details](implementation/mobile-loaded.png), and [frame measurements](implementation/mobile-frames.json)
- [Simulated failure fallback](implementation/simulated-failure.png) and [simulated empty result](implementation/simulated-empty.png)
