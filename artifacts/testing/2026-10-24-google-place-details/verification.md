# Google place details — verification

Status: implementation and focused verification passed; local app running. Implementation commit: `bdec68a`.

## Scope and workflow

GSD quick 261024-kci executed inline. Mandatory Travella planning/testing skill followed; prior direct-implementation preference honored. Existing website enrichment is expressly requested by the user. No plan-finalization feature added.

- Saved cards fetch Google editorial summaries and website details using an exact match against the saved hashed Google Place ID. Similar names never qualify.
- Website and deduplicated Useful website persist through existing CRUD autosave. Existing URLs are preserved; removed pins are not recreated. Busy draft writes defer enrichment.
- Legacy description data remains compatible, but the Note editor and generated reason display are removed. New additions do not copy model reasons into the saved description.
- Chat and map previews display only optional, signed provider editorial summaries. Text is unchanged, attributed to Google Maps, and omitted when absent. Generative summaries and review summaries are never used.

## Evidence

- Plan: [design](plan/design.jpg), [user-provided before state](plan/before.png).
- Implementation: [SamPotei desktop](implementation/sampotei-website.jpg), [SamPotei mobile](implementation/sampotei-mobile.jpg).

## Executed checks

- `NODE_OPTIONS=--no-experimental-webstorage npm --prefix frontend test -- src/features/plans/components/CanvasPlaceDetails.test.jsx src/design-system/components/DestinationMap.test.jsx src/features/plans/components/PlaceWebsites.test.jsx src/features/plans/components/CanvasDestinationMap.test.jsx src/features/plans/usePlanningCanvas.persistence.test.jsx src/features/plans/components/PlanningCanvas.test.jsx`: **49 passed**.
- After the capacity-handling adjustment, the affected PlaceWebsites and persistence suites were rerun: **13 passed**.
- `uv run --locked pytest services/mcps/tests/test_place_websites.py services/crud/tests/test_place_websites.py -q`: **20 passed**. Includes actual FastAPI handlers with a test database, ownership, invalid URLs, create/update/read/delete/recovery, signed provider text and mutation rejection.
- `npm --prefix frontend run build`: **passed**, existing large-chunk advisory only.
- Initial frontend invocation encountered Node 24's experimental global localStorage rather than jsdom. Rerun disabling that Node feature passed; no test was skipped to hide a failure.
- `git diff --check`: passed.
- Existing unrelated full-suite failures documented in the preceding website task were not rerun; focused changes passed.

## Live authenticated browser and API

Chrome DevTools, authenticated example account, `http://localhost:5174`.

1. Opened the existing saved SamPotei card. Google exact-ID match returned `http://st-pote.sakura.ne.jp/` and no editorial summary. Card shows website and Remove, no generated Note.
2. API read-back confirmed the URL on the pin and a single associated Useful website. All other component sections and every pin's preexisting fields were unchanged.
3. Reloaded the app. The selected SamPotei card, saved website, Useful website, and map remained available. Network requests for session, canvas, context, Google search/details and map viewport returned 200. Console had only existing Lit development / Google marker advisory warnings; no errors after the stable deployment.
4. An isolated Milan test Plan exercised a previously saved Sforzesco Castle pin with no website. The browser fetched and displayed Google's original editorial text with attribution; its website and one useful link were saved. Live connector search separately confirmed the editorial projection exactly equaled Google's response.
5. Test Plan `3e299c31-8b70-4aa4-84c8-ac512a8287a6` cleanup: authenticated HTTP read 200; verified stored website and one useful link; deletion challenge 200; delete 200; subsequent canvas read 404; temporary session sign-out 200. No user Plan was deleted.
6. Desktop and 390×844 mobile screenshots captured and inspected. No horizontal overflow on mobile; website and Remove are visible. Desktop list is internally scrollable.

## Runtime and tooling

The local-stack skill's read-only Cognito discovery and `bash scripts/start-local-ready.sh` completed successfully. Sign-in/session/sign-out readiness passed. SHA-256 source comparisons matched the running app's changed React/hook files and the running map connector's map_server.py. Latest changes are deployed locally.

An intermediate auth/session 500 occurred while the container was being recreated; the final readiness and browser reload returned 200. Chrome DevTools screenshot capture stalled in the original managed tab, and Chrome reported an open extension UI blocking control. Closing that test tab and using a fresh authenticated tab restored captures. The stalled tab was closed; user tabs were preserved.

## Maps search investigation

The rendered map was healthy, but the user's visible chat reported failed Yakushima place discovery. Current direct Google geocoding returns HTTP 200 / OK. Current connector destination resolution returns ready, and restricted Yakushima nature search returns five places. The authenticated MapsClient → local MCP path also returns ready with five places. Historical failure cause is not established; these checks do not prove that the earlier failure was fixed by this patch. An actual browser chat retry in isolated Yakushima Plan `95349852-7294-4e9a-837e-3e3944d8ac4e` completed successfully and returned four suggested places, with no chat errors. Nothing was added until the test clicked Add to plan.


## End-to-end chat → preview → saved place

A real authenticated agent request in the isolated Yakushima Plan returned Yakusugi Land with its Google editorial description and website. The browser displayed the same unchanged text in the chat card and temporary map preview. Canvas read-back before Add contained zero pins. Clicking Add to plan in the map preview persisted one pin with website and blank legacy description, plus exactly one associated Useful website. The provider editorial text remains transient. The full page was reloaded to verify recovery.

Evidence: [chat and map description](implementation/chat-map-description.jpg). The Google map was still drawing tiles at capture time; the actual preview pin and both descriptions are visible. The subsequent saved-place check verified the description and website after reload. A fresh browser destination lookup offered ambiguous Yakushima choices; that existing map-selection UI is separate from the successful server-side place search.


[Mobile description after reload](implementation/google-description-mobile.jpg) shows the complete original Google summary, website and Remove without clipping or horizontal overflow. The latest session/canvas/context/provider requests returned 200, with no console errors (only existing Lit/marker warnings).

Second isolated Plan cleanup used the authenticated browser API: verified one saved pin with its exact website and one useful link after reload, obtained deletion challenge, deleted the Plan, and observed canvas 404. Both test-created Plans were cleaned up. SamPotei's requested website enrichment remains in the user's existing Plan.

Remaining limitation: the historical Maps search interruption could not be reproduced after the rebuild; no specific historical root cause or permanent outage fix is claimed. Current full-stack search is verified working. Screenshot tooling recovered; no verification gate remains blocked. Error/retry and absent-summary cases were covered by focused component tests; the live provider absence was verified with SamPotei.
