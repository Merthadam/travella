# Accommodation chat and map selection synchronization

Status: complete. Automated and live browser verification passed on 2026-11-04.

## Reproduction and correction

Inspected the affected example-account discussion. Requests to search near saved activities and restaurants, retain 1.5 km, and research again were repeatedly refused because the search form had pending edits. The existing workspace sent only a dirty flag, not those draft criteria. Prompt, tools, response delivery and frontend application all prohibited draft updates. A subsequent request also carried an expired result reference and failed before reaching the worker.

The chat request now captures a bounded, validated accommodation form, including the current map selection. Search tools may consume that submitted draft; view-only operations remain blocked until a successful search. Exact form dates have explicit workspace provenance. Current ownership, revision, run and trip-brief checks still apply, and later manual edits revoke old agent updates. Expired observations are omitted from new chat context; their form settings remain available for a new search. Saved places appear on the minimap before selection, with explicit Include/Remove actions.

The approved layout is retained: [design](plan/approved-layout.png). [Before state](implementation/before-draft-block.png).

## Executed automated checks

- Backend: `pytest -q --tb=short services/agent/tests/test_travel_workspace_journey.py services/agent/tests/test_specialist_tools.py services/agent/tests/test_stay_location.py services/agent/tests/test_specialist_worker.py services/auth/tests/test_travel_proxy.py` — 73 passed.
- Frontend: TravelSearch, TravelWorkspace, StayLocationFilters, canvasViewState and plansApi Vitest suites — 115 passed. Subsequent focused TravelWorkspace run: 65 passed; final StayLocationFilters and draft-validation run: 5 passed.
- `npm run build` passed; existing bundle-size advisory remains. `git diff --check` passed.
- New coverage: pending map draft crosses real graph/commit boundaries into a workspace result with authoritative coordinates; exact draft date provenance; no view-only changes before search; manual selection context; expired reference omission; later edit revocation; incomplete ages/nationality/dates stay invalid; direct map selection before a search. Existing flight behavior and foreign/expired evidence rejection tests pass.

No CRUD handlers or durable data model changed. Integration tests exercise existing real FastAPI/CRUD handlers and confirm no shortlist or preferred option is saved by the search.

## Live checks

Used Chrome DevTools MCP and the authenticated example account on http://localhost:5202, in the isolated `travella-stay-location` stack. Reused only the dedicated Lisbon verification Plan. The original approved layout is unchanged.

1. Started with no current results after recovery; cleared the prior location draft and disabled the hotel layer for direct activity inspection. All three saved places were available on the map before selection.
2. Clicked the real São Jorge Castle and Time Out Market pins, then Include in search. The sidebar showed exactly those two places and a pending draft. No manual Apply/search was performed. [Pending map selection](implementation/map-selection-before-chat.png).
3. Asked chat to search within 1.5 km of each selected place, using the current form dates, guests and nationality. The actual agent/LiteAPI sandbox search returned **22 properties**. Its reply explicitly identified the two chosen places and preserved 12–16 May 2027, two adults and Hungarian nationality.
4. Verified the shared location controls changed to `within_each` and `1500`, exactly the same two checkboxes remained selected, all 22 results appeared, and the pending-draft message cleared. Network inspection confirmed `stay_draft` in the chat request, HTTP 200 on the agent event stream and refreshed discussion, and no browser manual hotel-search POST. [Agent-applied desktop result](implementation/agent-map-results-desktop.png).
5. At 390 × 844, confirmed no horizontal overflow. Clicking the unselected Praça do Comércio pin exposed Include in search without dirtying the applied criteria. [Mobile inspection](implementation/map-selection-mobile.png).
6. Reloaded and recovered the same 22 results and 1.5 km controls; snapshot recovery returned HTTP 200. Final console inspection found no errors, only existing Lit development and Google Maps event API warnings. A recovery request aborted during manual editing was correctly superseded. Opening the app before rebuild readiness briefly required the existing Retry button; after readiness the exercised journey passed.
7. Visually inspected before/after and mobile screenshots. The rebuilt app matched host SHA-256 hashes for nine representative changed source files. The local launcher also passed example sign-in/session/sign-out readiness checks.

The original draft-blocking path is now verified end to end. No remaining feature verification blockers. Distances remain straight-line; provider results remain sandbox observations and non-exhaustive. The local preview is left running for review. No booking, deployment or merge performed.
