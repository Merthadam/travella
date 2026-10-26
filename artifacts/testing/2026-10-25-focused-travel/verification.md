# Focused travel execution evidence

Execution: 2026-10-25–26. Branch locrian-peacock, Phase 18. Implementation is available locally. Affected-journey verification passed with the limitations below; full phase acceptance remains open for the broader live-quality matrix and user UAT.

## Architecture and implementation

Separate disposable Claude Agent SDK workers run inside a private LangGraph subflow called by the existing Plan graph. The subflow has checkpointing disabled. CRUD owns topic histories, run leases, attributed notes, observed comparison records and explicit choices. The parent Trip receives only confirmed-choice summaries. Shared brief facts come from the saved trip, with an applicability digest; a title-only revision does not invalidate inventory.

User explicitly declined prototypes and later authorized implementation. The visual outline was rendered with isolated Chrome DevTools MCP because the shared profile was occupied. Desktop/mobile screenshots were visually inspected. See plan/workspace-desktop.png and plan/workspace-mobile.png.

## Executed automated checks

- `uv run --locked pytest -q services/agent/tests services/auth/tests/test_travel_proxy.py services/crud/tests/test_topic_conversations.py services/crud/tests/test_topic_gateway.py --tb=short`: **441 passed**, zero skipped. Covers real graph/CRUD HTTP integration, topic isolation, streaming, cancellation, provider scopes/budgets, signed comparison evidence and browser SSE cross-layer regressions.
- Dedicated PostgreSQL 17.6 database, `pytest -q services/crud/tests/test_topic_conversations.py services/crud/tests/test_topic_gateway.py services/crud/tests/test_migrations.py services/crud/tests/test_purge.py services/crud/tests/test_api.py`: **53 passed**, zero skipped. Migration 0012/backfill, real HTTP stored readback, exact choice review, replay/conflicts/ownership, notes after fourteen turns, soft-delete/restore/purge. Task-owned database container removed afterward; application volume preserved.
- Worker/provider focused suite: **68 passed**; detailed coverage in ../2026-10-26-focused-travel-agents/worker-verification.md.
- Frontend focused suite: **39 passed**, one pre-existing external Python-fixture dependent skip. Latest CSS/summary correction: **27 passed**. Production frontend build passed.
- Full frontend: **267 passed**, twelve existing skips, two untouched baseline failures (PlansResume old Account locator and TripBrief old staged-confirmation assumption).
- Broader PostgreSQL suite retained two failures reproduced at baseline commit 006b48e in an isolated checkout: destination deletion returns 409, and oversized-place constraint expects IntegrityError while PostgreSQL raises DataError. These are unrelated to travel topics.
- `git diff --check`: passed.

The old CanvasTravelJourney fixture was updated to use the existing Add preference editor while preserving its unfinished-draft assertion. The eight real Python-SSE-to-React paths then passed. A profile-memory expectation was updated for the already-existing profile fields.

## Running application and browser

`bash scripts/start-local-ready.sh` rebuilt the stack from this checkout, applied additive migration 0012 and preserved the database volume. One startup authentication check failed with HTTP 503 while Cognito DNS resolution failed. After connectivity returned, sign-in/session/sign-out passed. Source hashes were checked against /app copies; final rebuild verification is recorded below.

Chrome DevTools authenticated as the configured example account. Test-owned plan: 0355fb3e-acb1-438b-9177-ccccb1da588c, “Focused travel verification · Lisbon”. It was created through authenticated APIs with explicit Canvas confirmation, saved dates 12–17 May 2027, two adults, food/culture/quiet theme, and Belém Tower as a selected activity. No existing traveler plan was modified.

Observed:
- Real Claude SDK calls used the private MCP/LiteAPI sandbox. Initial provider/catalog failures produced honest unavailable answers without invented options. Their precise initial cause was not established; subsequent calls succeeded.
- Stays retried with apartment criteria and compared Montebelo (EUR1030.65), Lisbon Colours and LSA. Private-kitchen and noise claims were qualified; uninspected reviews were explicitly unknown. A live room mismatch (kitchenette EUR734.60 vs loft card EUR663.21) was fixed by requiring observed room/rate IDs, with price and terms derived from that same room.
- Flights compared Nuitée Air direct EUR802.94, KLM EUR636.10 and Air France EUR633.98 return party totals. Fare verification returned the same direct amount. The reply compared layovers/baggage, asked about the cost tradeoff and declined to invent an airport transfer time.
- Both topics retained their own discussion after navigation, mobile reload and a fresh authentication session. The other topic receives confirmed choice facts, never its full discussion.
- Browser shortlist confirmation persisted one stay while readiness stayed researching. Explicit preferred confirmation made Stays ready/unbooked. The Flights preferred choice likewise survived reload. Expanded confirmation shows room/fare facts, unknowns, provider and observation time.
- Browser removal of the preferred stay returned Stays to researching and removed the choice from the shared brief; the flight stayed preferred. Real authenticated API change of the test trip from two to three travelers retained the flight and changed readiness to needs_review; reload displayed the three-person brief and warning. Test party restored to two afterward.
- A second rich accommodation search reached the original shared24KiB evidence ceiling. Specialists now have a96KiB hard ceiling and compact search previews, retaining ten provider calls/three rates/six inspections. A realistic regression confirms three rich refinements or two searches plus room inspection; ordinary Trip remains24KiB.
- Desktop1440×1000 and mobile390×844 were exercised. Mobile document width matched390px with no horizontal overflow. The outer travel screen scrolls to the complete composer; comparison and exact review dialog are readable. Screenshots were visually inspected.
- Final clean-navigation console inspection showed only existing Lit development-mode and GoogleMaps marker API warnings. Relevant auth, Plan, topic GET and event stream requests returned200. An earlier auth/session500 occurred during a rebuild/session reset; explicit sign-in and subsequent clean reload returned200.

Final focused command (same six topic/worker/gateway suites described in the execution log): **49 passed**, zero skipped, after room-binding, accepted-choice-fact and evidence-budget fixes. Final frontend focused suite: **33 passed**, zero skipped (TravelConversation, TravelContextSummary, PlanningCanvas, plansApi). Frontend production build passed; existing chunk-size warning remains. The existing broader-suite baseline failures listed above were not hidden or skipped to claim green.

## CRUD operation coverage

Actual FastAPI handlers and SQL persistence were used, with PostgreSQL migration/lifecycle checks in an isolated test database. Topic begin/create→GET checks user status and owner; complete/update→GET checks paired messages, attributed notes and validated comparisons; cancel→GET checks interrupted status and unlocked lease. Choice challenge→commit→new GET checks shortlist, preferred, replacement and removal with preserved unrelated fields. Plan soft-delete denies topic access, restore recovers topic state, and hard purge removes topic/state/run rows. Tests also cover invalid topic/input, missing Plan/evidence, unauthenticated and foreign owner, stale revisions, altered event/challenge replay, source changes, expired runs and signed-evidence rejection. The application database volume was preserved; only the task-owned isolated test database was removed.

## Limits and remaining acceptance

Full user UAT and the entire live AI-SPEC case matrix are pending. The bounded sample used sandbox inventory, not live purchasable offers. Changed-price fare verification, guest-review injection, ambiguous airports/child ages, long-discussion correction and simultaneous-tab/network-loss scenarios are not all live-model/browser evaluated; deterministic coverage is described separately in agent-evaluation.md. Light-mode/native-zoom combinations have not been exhaustively checked. These are remaining acceptance work, not claimed passes. Earlier Phase15/17 acceptance is unchanged. No reservation, payment or supplier checkout operation was called.

## Evidence

Planning: plan/workspace-desktop.png, plan/workspace-mobile.png; preserved starting Canvas: plan/canvas-before.png.
Implementation: implementation/flights-selected-desktop.png, implementation/choice-review-mobile.png, implementation/flights-needs-review.png, plus the earlier loading/empty/mobile composer captures. Final accommodation evidence is appended after the rebuilt live check.

Final rebuild: `bash scripts/start-local-ready.sh` succeeded, including example-account sign-in/session/sign-out. SHA256 comparison matched7representative running files: Canvas observer/tools, specialist worker/service, CRUD topics, TravelWorkspace and scoped Canvas CSS.

Final Stays live result: the rebuilt SDK produced two observed comparison cards. Lisbon Colours734.60EUR and its exact kitchenette room agree with the reply; Montebelo1030.65EUR likewise agrees. The current selection remained unset until explicit review. Screenshot implementation/stays-room-comparison-desktop.png was captured and inspected.

The exact kitchenette choice was then confirmed in the browser and persisted as ready/unbooked. A subsequent live research request was stopped using the UI: readback showed an interrupted user message, no partial assistant reply, unlocked Plan lease and unchanged preferred choice. Mobile reload retained the chosen room andready status. Screenshot implementation/stays-selected-mobile.png was captured and inspected. Final clean reload had no console errors (only existing Lit/Maps warnings); all listed Plan/topic/auth requests returned200.
