# Single canvas implementation verification

Date: 2026-10-24. Source commit: `d85919e`, branch `feat/single-canvas-workspace`.

## Accepted design and scope

User selected the blended single canvas, then requested the places list/map in one card matching existing containers, with Flights and Stays retaining dedicated screens. Both stage progress and trip header scroll with the canvas. Real existing components and provider capability gating are retained. Approved prototype remains at `prototype/single-canvas-layouts-20261024` (`ca156b5`); its single-canvas preview route/code was removed from this production branch.

- [Approved desktop](plan/approved-desktop.jpg), [approved mobile](plan/approved-mobile.jpg).
- [Desktop dark](implementation/desktop-dark.jpg), [desktop light](implementation/desktop-light.jpg).
- [Mobile canvas](implementation/mobile-canvas.jpg), [mobile places after scrolling](implementation/mobile-places.jpg), [mobile chat overlay](implementation/mobile-chat.jpg).
- [Flights screen](implementation/flights-screen.jpg), [Stays screen](implementation/stays-screen.jpg).

All listed implementation screenshots were captured with Chrome DevTools and visually inspected. Card boundaries, text, controls and map attribution remain readable; no horizontal overflow at 390 × 844. Mobile map and list stack within the same card. Desktop was checked at 1440 × 1000. The earlier desktop-initial.jpg is an intermediate capture before the user requested a shared container.

## Automated checks

Executed:

```sh
npm test --prefix frontend -- src/PlansResume.test.jsx src/PlansApp.test.jsx src/design-system/components/DestinationMap.test.jsx src/features/plans/components/CanvasDestinationMap.test.jsx src/features/plans/components/PlanningCanvas.test.jsx src/features/plans/travel/CanvasTravelJourney.test.jsx src/features/plans/canvasViewState.test.js src/design-system/a2ui src/features/appearance
npm run build --prefix frontend
git diff --check
```

Result: **54 passed, 1 skipped**, eight test files passed. Build and whitespace check passed. The skipped test is the existing actual Python SSE fixture test, which requires `TRAVELLA_CANVAS_SSE_FIXTURE`. Vite reports the existing large bundle warning (main bundle approximately 1 MB); build succeeds.

New regressions were first observed failing for entering/reopening Canvas before first save, map filter/selection remount recovery, and Maps viewport remount recovery. Their fixes now pass. Coverage includes combined map/list selection, storage isolation/cleanup/invalid values, existing map loading failure/retry, theme handling, capability gating, travel preview recovery, generation and explicit save boundaries. An existing chat test raced the asynchronous A2UI card mount; it now waits for the complete workspace before typing and asserts the draft before collapsing chat.

## Authenticated browser journey

Canonical Docker app: http://localhost:5174, authenticated with the required example account using its local credential file. No credentials included in evidence. Rebuilt through `scripts/start-local-ready.sh`; authentication readiness passed. Final running-container SHA-256 content matches this checkout for PlanningCanvas.jsx, single-canvas.css, CanvasConversation.jsx and CanvasDestinationMap.jsx.

Created only the run-owned plan `a128dcee-be74-4298-b484-0ec74c8e83cd`, titled “Canvas verification — Lisbon”. Seeded explicitly confirmed Lisbon requirements and three test places through the real application APIs, including the normal canvas save challenge. Existing user plans were not modified. The first setup request used an invalid research-context shape and correctly returned 422; corrected StateChange-array input succeeded.

Observed:

1. Real Google Maps loads alongside the list. Food filter limits both, selecting Market opens its details and selects the pin. Keyboard pan/zoom updates the saved UI viewport.
2. Collapsed chat and scrolled to 340. Navigated through the actual My plans link, reopened the test plan and refreshed: Canvas, Food filter, selected Market, collapsed chat, scroll 340, center and zoom 16 returned exactly. Server snapshot still contained all three places.
3. Edited the Market note to “Visit for lunch after the riverside walk.” and budget to €1,900. Updated each draft explicitly, then clicked Save plan. Real GET readback confirmed both changes, all three preserved pins and workspace resume target. After reload, the DOM displayed the saved budget and note.
4. Account navigation and browser return retained Canvas. No Back to research/conversation link appears in the canvas.
5. Explore flights opens a full Flights screen, with the canvas hidden but mounted. Stays switches to its own full screen, with the existing dates, travelers and sandbox disclosure. Back to canvas restores the workspace. Final browser check confirmed identical viewport, selection and scroll before/after travel navigation. Unit coverage also confirms unfinished card edits and unsent chat survive both screens.
6. Final leave/reopen on the rebuilt app returned Canvas with identical map and selected place, scroll 46 matching saved scroll 46, and the saved Market note.
7. At 390 × 844, progress/title scroll away together (stage top −324 and title bottom −43 after scroll 390). Map/list stack in the card. Opening/closing chat overlays the existing canvas; it remains mounted and visible underneath. Empty chat composer is 48 px tall. No page horizontal overflow.
8. Light/dark appearance switches render both the actual map and shared card correctly. Existing empty research/websites and travel search states remain usable. No supplier checkout or live inventory transaction was performed.

## Console, network and cleanup

Final inspected local requests for session, profile, plan, destinations, canvas, research context, conversation and travel capabilities all returned 200. No application console errors. Existing warnings remain: Lit development mode and Google advanced-marker event API guidance. During container replacement, a transient session request failed; a reload after readiness recovered. It was not a failed credential or saved-data operation.

After evidence capture, deleted only the run-owned plan through prepare/commit with exact revision/challenge. Deleted-view GET returned lifecycle `deleted`; active-view GET returned 404. Removed its UI preferences and left the app on My plans. The ordinary seven-day recovery policy applies.

## Persistence boundary and limits

Canvas entry, filter, selected place, map center/zoom, chat visibility and scroll are per-plan **browser-tab preferences in sessionStorage**, not cross-device/account data. They survive leaving/reopening and refreshing that tab, and are cleared on sign-out and plan deletion. Pins, notes and trip details remain durable only after explicit Save plan through CRUD. Unsaved draft content is not copied into UI storage. No backend implementation changed. This verification does not assert completion of unrelated Phase 17 live-model acceptance.
