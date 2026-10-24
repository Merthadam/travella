# Destination-only readiness with explicit flight confirmation

Verified 2026-10-24 on `prototype/canvas-globe-loading-20261023`, implementation commit `b97896d`, using the canonical local Docker stack at `http://localhost:5174`.

## Expected behavior

A traveler-confirmed destination unlocks draft review. Dates, traveler count, budget, accommodation and priorities are optional. If flights are not confirmed, review asks Yes/No and generation remains disabled until an explicit choice. Inferred destinations cannot unlock generation. Review, current revision, generation receipt, ownership and separate Save plan remain enforced.

The accepted production design was retained; this task corrects readiness and confirmation copy without another layout exploration.

## Automated checks

- `uv run --locked pytest -q -rs services/crud/tests/test_research_offers.py services/agent/tests/test_flight_generation.py services/agent/tests/test_research_offers.py services/agent/tests/test_research_offer_integration.py`: **83 passed, 1 skipped**. The isolated PostgreSQL migration test requires `TEST_DATABASE_URL` and was skipped. FastAPI persistence tests ran against their real SQLite test database; the live browser journey below exercised the local PostgreSQL stack. Dependency deprecation warnings only.
- `npm test --prefix frontend -- --pool=threads --maxWorkers=1 src/features/plans/components/CanvasGenerationReview.test.jsx src/features/plans/components/PlanningCanvas.test.jsx src/features/plans/components/PlanConversation.test.jsx src/features/plans/useResearchOffer.test.jsx`: **49 passed**.
- `npm run build --prefix frontend`: passed; existing bundle-size warning.
- `git diff --check`: passed.
- `bash scripts/start-local-ready.sh`: passed, including isolated example-account sign-in/session/sign-out. Representative frontend helper, confirmation component, shared readiness module and agent prompt SHA-256 hashes matched the running container.

## HTTP behavior and persistence

The FastAPI tests exercise actual handlers and database records. Destination-only context reads eligible; request_review succeeds with all other details unset. Confirm rejects unconfirmed flights (409). Explicit flight update produces a new revision; review and confirmation issue a receipt for that revision; a live lease consumes it successfully. Subsequent reads show only flights and their provenance changed; no canvas is implicitly saved. Existing tests cover missing destination, locks, stale revisions, replay, ownership, missing/deleted resources, invalid priority references, and cancellation. Agent tests reject missing, inferred or remembered destinations before workers run and retain explicit flight guards for all generation actions. Cross-service Agent→CRUD HTTP tests exercise the destination-only handoff without priorities or dates/travelers.

## Authenticated Chrome DevTools journey

Used the supplied example account with credentials read privately from the local credential file. Official Chrome DevTools MCP ran in an isolated headless Chrome session. Browser command/results are in [browser-results.json](browser-results.json); unrelated existing example-account preference text is redacted.

1. Created one verification plan and explicitly set Lisbon through the application API. No dates, travelers, budget, accommodation, interests or flight choice were supplied. Before rebuild, the old UI blocked review for timing, travelers and priorities. Captured and inspected [before](plan/before-extra-requirements.png).
2. After rebuild and reload, readiness was eligible with no reasons. The brief said “Ready to review a draft” at 1/6; its Review & create draft button was enabled. Captured [desktop brief](implementation/destination-only-ready-desktop.png).
3. Opened review through the UI. Both flight radios were unchecked and Confirm & generate was disabled. All optional fields displayed undecided. Captured [desktop confirmation](implementation/flight-confirmation-desktop.png) and [390px mobile confirmation](implementation/flight-confirmation-mobile.png).
4. Explicitly selected No, leave flights out on mobile, then clicked Confirm & generate. The real generation ran behind the approved globe loader; observed 0 then 5 items ready and eventual completion. Captured [mobile loader](implementation/destination-only-generating-mobile.png). No partial canvas was exposed.
5. Generated draft reported ready. Context still had empty dates, null travelers, empty budget and undecided accommodation, with only the explicit flight choice added. Clicked Save plan, read back a saved canvas at revision 2, reloaded and observed “Saved plan loaded.” Captured [reloaded saved canvas](implementation/saved-canvas-reloaded-mobile.png). Components contained map, links, themes, findings, essentials and accommodation; flights were absent.
6. Inspected network: review, context update, confirmation, generation streams, save and reload requests returned 200. One 404 came from an incorrectly shaped manual verification call (`/plans/undefined/research-offer`), corrected to the plan object; this was a harness error, not application traffic. Console contained the corresponding 404 plus the existing Lit development-mode warning, with no feature errors.
7. Deleted only the verification plan through its current revision/challenge API. Active read returned 404 and deleted read returned lifecycle `deleted`. Signed out the isolated browser session (200).

Screenshots were visually inspected. Desktop and mobile confirmation text and choices are readable; the existing scrollable brief/dialog handle content beyond their height, and the primary mobile confirmation is visible. Loader and saved-state layouts remain intact. No production deployment or push was performed. The isolated PostgreSQL migration test is the only skipped automated check; no migration changed in this task.
