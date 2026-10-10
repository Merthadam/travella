# Places design A — implementation verification

Date: 2026-10-10. Branch: arrow-mask, based on main 201fd74 and selected prototype 606d3a5.

## Scope and approval

User selected A and explicitly requested production implementation and cleanup. Approved reference: [A](plan/approved-a.png). Earlier before-state and alternatives remain in `../2026-10-10-places-list-map/plan/`; all runnable alternatives are preserved on `prototype/places-list-map` at 606d3a5. The implementation branch removes only sketch 005's executable files/vendor assets, retaining its decision record.

The real Planning Canvas now starts with a compact places list. List/Map share saved-place search and category filters. Conventional 28×36px pins replace text pills. Find places opens/focuses the existing conversation. Provider suggestions remain previews until explicitly added. Notes, confirmed removal, and Undo remain draft changes until Save plan. Undo restores the original order. No backend or durable schema changes.

## Environment

Isolated Compose project `travella-places`, app http://localhost:5574, auth 8503, agent 8504. Existing stacks and volumes preserved. Existing Cognito pool/client validated read-only through the repository local skill; secrets retrieved into ignored files. Launcher sign-in/session/sign-out check passed. Chrome DevTools MCP ran in an isolated browser and authenticated as the supplied example account. Password/token values were never recorded.

A fresh local test profile was initialized through authenticated onboarding API calls; one test Plan was created. Milan was added and selected through Trip Brief UI. A malformed setup-only trip-context request was rejected before using the UI; no production regression. No external booking or supplier action was performed.

## Executed verification

- `NODE_OPTIONS=--no-experimental-webstorage npm --prefix frontend test -- --run src/design-system/components/DestinationMap.test.jsx src/features/plans/components/PlanningCanvas.test.jsx src/features/plans/components/CanvasDestinationMap.test.jsx`: **19 passed**. Covers view/filter/search without mutation, note identity preservation, confirmed removal/undo/order/dedup, editor locks, preview during an unfinished edit, Find places focus without sending/saving, map framing, stale geocodes, retry, appearance/view preservation, and travel navigation.
- `npm --prefix frontend run build`: **passed**. Existing large-chunk advisory remains.
- Full frontend suite: **96 passed / 17 failed**, plus 7 unhandled errors. All 17 failures reproduced against unchanged HEAD 606d3a5 in a separate temporary checkout (4 failing files: AccountApp, PlansApp, PlanConversation, TripBrief). Failures include stale onboarding expectations, missing researchContext test mocks, and an existing brief-state expectation. This change does not claim the full suite is green. Node's experimental webstorage was disabled so jsdom owns storage.
- Chrome DevTools: Find places reopened the closed conversation and focused the composer without sending. Sent one live request for Sforzesco Castle, Piazza del Duomo and Parco Sempione. Agent returned three real Google-backed suggestions. Preview showed a 28px pin with **zero** places added. Explicit Add to plan from preview added one; explicit buttons added the other two.
- Edited castle note to “Meet at the castle gate at 10.” Confirmed removal was required; cancel/Escape preserved the place; removal and Undo worked. Save plan returned Saved. Authenticated GET canvas and reload both showed all three places and the edited note.
- Injected a temporary Google Maps importLibrary rejection in the browser to exercise provider failure: error and Retry map appeared, List still contained all three places. Restored the provider and retried; all three real markers returned. This was deliberate failure injection, not a production provider outage.
- Desktop dark screenshots inspected. 390px phone list/note/dialog/conversation exercised: no document horizontal overflow, Escape closed the dialog, Find places switched to the conversation and focused the composer.

## Final verification pass

**Passed on implementation commit 54312da.** All 14 changed frontend runtime files matched SHA-256 hashes inside the rebuilt app container. Health and the example-account readiness check passed again.

Final authenticated browser checks: real Pinacoteca di Brera suggestion preview left the three saved places unchanged; returning to List dismissed the preview; clicking the real castle map pin opened its details; Show all was disabled while editing its note. Undo returned the first place to the first row. Removing every place produced the real empty draft; leaving with explicit discard and reopening restored all three saved places and the castle note. Temporary provider latency showed the loading state and recovered. Search with no matches followed by Show all reset the query and restored all markers without dirtying the plan.

Inspected desktop light/dark and 390px phone captures for text clipping, row shape, search-field width, dialog fit, and horizontal overflow. Initial passes exposed inherited label margins and pill-shaped rows; corrected and recaptured. The phone composer receives focus when opened from Find places.

Final DevTools network inspection: no failed requests in the recorded current navigation (224 listing lines). Console: no errors; existing Lit development-mode and Google AdvancedMarker legacy listener advisories only. Earlier temporary HTTP connection failures occurred while rebuilding the local container, then disappeared on the fresh healthy run.

Screenshots:
- [Desktop list, light](implementation/desktop-list-light.png), [dark](implementation/desktop-list-dark.png)
- [Desktop map, light](implementation/desktop-map-light.png), [dark](implementation/desktop-map-dark.png)
- [Unsaved provider preview](implementation/desktop-preview.png), [empty draft](implementation/desktop-empty.png)
- [Phone list and saved note](implementation/phone-list-note.png), [map](implementation/phone-map.png), [remove dialog](implementation/phone-remove-dialog.png), [conversation](implementation/phone-conversation.png)
- [Map loading](implementation/map-loading.png), [injected map failure](implementation/map-error.png) (failure capture predates final spacing refinements)

The local test Plan is retained at `/plans/71a16749-5e78-46bd-9fc2-e1665e4d0ce5` for review. It contains only the three explicitly saved Milan places. Temporary removals and the Brera preview were not saved. The old prototype HTTP server was stopped; its source remains on the reference branch. The app remains running at http://localhost:5574 and was opened in the system browser.

## Limitations

No backend change, so no new backend CRUD test gate applies. Existing frontend suite failures are documented above. Provider suggestions/photos are ephemeral; saved place identity, position, category, and note persist through the existing canvas contract. Broader canvas cards retain their existing design.
