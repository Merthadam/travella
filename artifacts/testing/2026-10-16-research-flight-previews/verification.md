# Research flight previews verification

Source: `1dce695`; additional race/empty tests: `d2f1723`. GSD quick task `261016-l5g`. Existing approved cards reused; earlier prototype decline retained.

## Behavior and boundaries

Research chat now routes explicit flight search requests and focused clarification replies to the existing private, flight-only provider gate. General research remains on its existing conversation path. Exact traveler dates or explicit Trip Brief dates, passenger allocation/ages, route and pricing country are required. Search results render through the existing allow-listed A2UI TravelPreviews catalog with no navigation callback or action button. No booking tools, supplier redirects, map additions or requirements changes are introduced.

Inventory is ephemeral: one current batch, Plan/generation validation, successful terminal publication only, expiration/replacement notices, invalidation on context edits/Stop/new turns/Plan switch, no restored inventory after reload. Graph channels and checkpoints exclude provider inventory; response schemas strip private provider fields. Existing Canvas navigation remains covered by its integration tests.

## Automated checks

- `uv run --locked pytest services/agent/tests/test_research_flights.py services/agent/tests/test_canvas_travel.py services/agent/tests/test_agent_checkpoint.py -q`: **209 passed**. Includes eight existing Canvas SSE→React journeys and the new Research SSE→React journey.
- Final `uv run --locked pytest services/agent/tests/test_research_flights.py -q`: **18 passed**, after adding frontend Plan-switch and empty-state coverage. The four-result case runs **11 React tests** from `ResearchFlights.test.jsx` against the actual generated Python SSE fixture. Covers three illustrated cards, expandable details, zero navigation buttons/links, stopped/interrupted/error terminals, wrong Plan/generation, unexpected private fields, late successful delivery after Stop, expiry, Plan switching and empty results.
- `npm test -- src/features/plans/components/PlanConversation.test.jsx src/features/plans/travel/CanvasTravelJourney.test.jsx`: **13 passed, 1 skipped**. The environment-gated SSE fixture case is exercised by Python integration rather than this standalone invocation.
- `uv run --locked pytest services/agent/tests/test_agent_turn.py services/agent/tests/test_agent_api.py -q`: **22 passed, 1 failed**. The known `test_profile_memory_sync_uses_verified_identity_and_safe_status` expects the old profile shape without optional fields. It already reproduced at preimplementation `aa4f16f`, as documented in `../2026-10-16-travel-previews/verification.md`; no profile code changed here. Broader API suite is not fully green.
- `npm run build`: passed. Existing large-chunk warning remains. Launcher also rebuilt final application source successfully. `git diff --check`: passed.
- Code review: inspected changed routing, flight-only tools, event projection, stop/plan-switch handling, strict schemas and navigation gating. No blocking findings.

## Authenticated Chrome checks

Used Chrome DevTools with the configured example account in an isolated browser context at http://localhost:5174. Credentials were entered from the owner-only account file without printing or tracking them; temporary input scripts were deleted. Test Plan: `faf06d05-bc19-46c6-987b-179944cd0cf4`. Existing user Plans were not edited.

1. Created test Plan through the UI; its Research screen was empty. Saved and inspected `plan/research-before.jpg`.
2. Read-only existing Cognito precheck and `bash scripts/start-local-ready.sh` passed. Sign-in/session/sign-out readiness passed. Representative backend, service, Research component and shared A2UI source hashes matched the running app container.
3. In Research, sent `Show flights from BUD to MXP; flight country: HU`: asked exact dates. Replied `2027-04-14 to 2027-04-21`: asked passenger allocation. Replied `all 3 adults`: no repeated question, no destination confirmation, actual LiteAPI sandbox search completed.
4. Observed **3 illustrated previews from 87 results**, correct BUD↔MXP dates, three-adult return-party prices, HU/EUR/economy and sandbox/freshness notices. DOM counted 3 cards, 3 flight illustrations, **0 buttons and 0 links inside the preview**. No manual search or booking page opened.
5. Opened Flight and fare details: outbound/return airport-local times, carrier/flight numbers, nonstop status and bag details were readable. Tested 1440×1000 and 390×844 viewport widths; document widths matched viewport widths, with no horizontal overflow. Inspected all screenshots; cards wrap and transcript scrolls normally.
6. Research context before/after remained the same empty fields with revision 1. Canvas snapshot remained null. Reload preserved conversation text and cleared transient inventory; the Plan activity revision advanced on revisit, not from a saved Canvas or requirements change.
7. All three search event streams and authenticated Plan/context reads returned 200. A session request returned 500 while the stack restarted; subsequent sign-in/session requests passed. After reload, console had no errors and only the existing Lit development warning; all recorded requests returned 200. No remaining feature transport errors.
8. Empty/unavailable provider and cancellation paths were tested deterministically through real HTTP/graph boundaries, not by disrupting the live provider. No CRUD implementation changed.

## Evidence

- `plan/research-before.jpg`
- `implementation/date-and-passenger-gates.jpg`
- `implementation/research-flight-previews-desktop.jpg`
- `implementation/research-flight-details-mobile.jpg`
- `implementation/research-flight-details-mobile-expanded.jpg`

Cleanup: deleted only test Plan faf06d05-bc19-46c6-987b-179944cd0cf4 through the UI. GET with view=deleted returned HTTP 200 and lifecycle=deleted; the active-list link was absent. Existing user records were preserved.
