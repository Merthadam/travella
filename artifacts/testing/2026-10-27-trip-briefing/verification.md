# Production trip briefing verification

Implemented on `feat/trip-briefing`: research c8bf67c, UI ec205d0. Approved compact prototype D remains archived on `prototype/trip-essentials-20261026` at d30d672. [Approved design](plan/approved.png).

## Delivered

One real Planning Canvas card replaces the separate themes, research and website cards. The overview uses current trip data, followed by three sourced findings. Read more preserves the remaining findings, links, saved-place/date/budget context and preference editing. Refresh keeps the existing confirmation, generation and automatic-save contracts. Old snapshots require no migration.

The existing bounded Claude SDK research worker now receives canonical saved-place names/categories as well as trip context and themes. Authenticated CRUD reads are checked against the Plan revision; places from another destination are excluded. Generation asks for concise destination/transport/trip-specific resources, including direct resort/rental resources for skiing when relevant. At least two distinct observed source URLs are required unless failed page reads justify a labelled partial result. Exact quote/source validation remains mandatory. No extra model worker or unbounded generation loop was added.

## Executed checks

- Frontend: `npm test -- src/features/plans/components/TripBriefing.test.jsx src/features/plans/components/PlanningCanvas.test.jsx src/features/plans/usePlanningCanvas.persistence.test.jsx` — **35 passed**. Covers keyboard disclosure, safe links, uncertainty, empty/loading/failure states, preference editing, navigation and existing persistence.
- Agent: `uv run --locked pytest services/agent/tests/test_flight_generation.py services/agent/tests/test_research_offers.py services/agent/tests/test_trip_briefing.py -q` — **76 passed**. Includes city/ski inputs, saved destination isolation, authenticated reads, revision mismatch, forged source IDs/quotes/URLs, distinct resources and labelled partial results.
- CRUD regressions: `uv run --locked pytest services/crud/tests/test_canvas_evidence_rotation.py services/crud/tests/test_canvas_mock_booking.py -q` — **12 passed**, using real HTTP handlers and storage. No CRUD contracts or migrations changed.
- `npm run build` and `git diff --check` passed. Existing bundle-size and dependency deprecation warnings remain.
- Local stack rebuilt through `scripts/start-local-ready.sh` with isolated Compose project `travella-briefing`, using port **5193**. Cognito sign-in/session/sign-out check passed. SHA-256 comparisons confirmed the changed component, CSS, prompt, worker, contracts and service matched the running container. Other stacks and database volumes were preserved.

## Browser and live generation

Authenticated with the supplied example account. Chrome DevTools protocol through isolated Chrome was used because the earlier MCP screenshot transport timed out. No credentials or session tokens are included in these artifacts.

- Live Claude research generated four findings and two distinct official resources (Lisbon tourism and Metro), rendered three highlights and saved through the real application. Reload retained the generated content. [Sanitized result](implementation/live-generation.json).
- A first completed run repeated one broad tourism page. Source diversity validation and prompt constraints were tightened, then live generation was rerun successfully. A previous automation attempt timed out at the browser protocol layer; no success is claimed for that attempt.
- Keyboard expansion/collapse, source opening in a new tab, cancelled replacement confirmation, preference editing and reload passed.
- Temporarily saved an empty briefing on the isolated test record, checked its empty state, and restored the original generated snapshot through the normal API.
- Aborted the refresh stream before it reached the backend. Existing highlights remained, retry appeared, and reload recovered the saved snapshot.
- Desktop dark/light and 390px mobile screenshots inspected. Mobile footer scroll clearance was added for the floating Plan chat button. [Browser checks](implementation/browser-checks.json), [mobile layout check](implementation/mobile-layout-check.json).
- No JavaScript page errors. Expected pre-login session 401 and favicon 404 remain. **Travel capability requests return 503 in this isolated environment**, so travel search was unavailable and is not claimed verified. This did not prevent briefing generation, source browsing or saving.

## Visual evidence

- [Desktop](implementation/ready-desktop.png), [light](implementation/ready-light.png), [expanded desktop](implementation/expanded-desktop.png).
- [Mobile](implementation/ready-mobile.png), [expanded mobile top](implementation/expanded-mobile-top.png), [expanded mobile bottom](implementation/expanded-mobile-bottom.png).
- [Empty](implementation/empty-desktop.png), [generating](implementation/generating.png), [failed refresh preserves content](implementation/failed-refresh.png).

Preview: http://localhost:5193/plans/ec345f34-0687-4e7c-9af1-3169105fe155 . This is an isolated example-account test plan; existing user plans were read but not mutated. An initial fixture save was correctly rejected for inconsistent travel-card fields and corrected before generation. Prototype routes/switchers were removed from the implementation branch; no merge to main was performed.

Live source quality was checked for Lisbon. Ski-specific input propagation and instructions were tested without an additional paid ski generation; particular destinations and supplier availability remain subject to the sources the worker can actually read.
