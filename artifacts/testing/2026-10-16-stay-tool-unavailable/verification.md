# Stay search activation verification

## Report and acceptance

The user's Canvas request “okay can you show me some accomodations in obertauern?” returned an unavailable-tool response with no missing-input guidance. Read-only inspection of that conversation confirmed the exact request. The same gate also rejected correctly spelled plural “accommodations” and “apartments”.

Acceptance: recognize these stay requests, use the concrete draft dates and destination, ask for missing room allocation/nationality through the authoritative gate, then call the provider and display previews with manual-page navigation. Search must not save or modify the Plan.

## Change

Source commit `f6c1724`: one shared stay vocabulary now drives tool activation, mode selection and clarification continuation. It accepts singular/plural accommodation and common spelling variants, apartments, lodging and guesthouses. Existing date/room/nationality validation, cancellation/reset boundaries and Plan authority remain enforced. No frontend or CRUD implementation changed.

## Automated checks

- Added eleven regressions through real HTTP → compiled graph → Canvas editor → SDK tool boundary with injected provider/SDK transports: six natural stay request/clarification/search sequences and five mixed flight/stay requests. All eleven failed against baseline.
- `uv run --locked pytest services/agent/tests/test_canvas_travel.py services/agent/tests/test_research_flights.py services/agent/tests/test_agent_checkpoint.py -q`: **220 passed** in 18.73s. Includes existing Canvas and Research real-SSE-to-React checks; provider fixtures are not live availability evidence.
- `git diff --check` passed. Reviewed the source/test diff; the shared vocabulary is used consistently at all three gates and all existing regression tests pass.

## Local startup

- Read and applied the Travella local skill. Read-only existing Cognito precheck passed.
- Rebuilt only Compose project `travella-research-preview` with frontend5175/auth8004/agent8104 and matching localhost origin. Both databases/volumes preserved; original5174 stack remained healthy and running.
- Startup sign-in → session → temporary sign-out smoke check passed.
- Running container SHA-256 for `services/agent/claude/canvas_travel.py` matched the checked source.

## Browser verification

Chrome DevTools, example account, isolated browser context at http://localhost:5175. User's Plan inspected read-only and never edited. Created test Plan `73afb6e1-5514-4944-a277-232ab074e0f0` via UI, then seeded its saved Canvas through the application API/challenge: Obertauern Austria, Feb1–7 2027, two travelers. Corrected two rejected fixture setup attempts (inconsistent card summary and invalid request ID); successful fixture setup saved revision2.

Before: `plan/before-keyword-gate.jpg` captures the same request against the old code; actual model prose asks freeform questions instead of using the authoritative host gate. The user's exact refusal is nondeterministic model prose, while baseline automated tests deterministically prove the disabled tool.

After rebuild: page briefly showed a transient reconnect error during restart; reload recovered the existing session and saved Canvas. The identical request immediately returned the host room-allocation question, preserving the dates and destination. Replied “1 room for 2 adults”. The configured saved nationality was reused without another question.


- Real SDK → connector → LiteAPI sandbox search returned **1 stay**, Sporthotel Cinderella, for Feb1–7 2027, one room/two adults. No browser fixture or mocked transport was injected. Provider inventory limits and sandbox label displayed honestly; this does not establish production booking availability.
- Photo successfully loaded (natural width3000); inspected `implementation/obertauern-stay-photo.jpg`. The side chat shows the property image/name, exact dates and total. `implementation/obertauern-stay-preview.jpg` shows the price, room summary and navigation button. Normal chat scrolling exposes the full card without overlap.
- Clicked **View all stays**: existing manual search page opened with Obertauern, Austria, Feb1–7 2027, Hungary nationality, EUR and one room/two guests preloaded, and the same one result. Inspected `implementation/preloaded-manual-stays.jpg`; fields readable and correctly populated. Navigation issued no new search request.
- Clicked **Back to plan chat**: preview and loaded photo retained.
- GET test Canvas returned revision2 and unchanged destination/dates/two travelers. Search/navigation did not save or change the durable Canvas.
- After the rebuild/reload, relevant session, context, capability and both agent-stream requests returned200. Browser console had no errors; only the existing Lit development warning. Earlier fixture errors and transient rebuild reconnect are accounted for above.
- No frontend layout changed; no new mobile layout or full unrelated test-suite revalidation is claimed. Existing empty/error/cancel/date validation paths pass in the focused suite.

Cleanup: deleted only test Plan `73afb6e1-5514-4944-a277-232ab074e0f0` through the UI confirmation. Subsequent GET view=deleted returned200, lifecycle=deleted; active-list test link absent. User Plan and both database volumes preserved.
