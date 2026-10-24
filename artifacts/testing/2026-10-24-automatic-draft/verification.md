# Automatic complete draft persistence — 2026-10-24

Status: implementation running; functional verification passed; required screenshot/visual verification remains incomplete.

## Behavior

The full seven-section canvas snapshot saves after committed user edits, explicit place additions, confirmed mock booking changes and settled user-requested generation. No Save plan button is required. Reads do not write; open editors/chat/generation defer writes. Writes are serialized and debounced; ambiguous failures retain the original idempotency key and payload for retry before queuing newer changes. Conflicts retain local edits and stop automatic retries. Finalization remains unimplemented.

Existing stored research failed its save challenge with HTTP 422 `canvas_evidence_invalid` after the local evidence key changed. CRUD now accepts an exact, previously validated finding plus its matching stored proof within the same authorized Plan. Modified claims, copied proofs, other Plans, unauthorized requests and stale revisions remain rejected.

## Executed verification

- `npm test -- --run src/features/plans/components/PlanningCanvas.test.jsx src/features/plans/usePlanningCanvas.persistence.test.jsx`: 26 passed. Coverage includes all sections, reload, idle reads, open editors/chat, generation completion, retries, concurrent checkout, and conflicts.
- `npm --prefix frontend test`: 218 passed, 12 skipped, 6 failed. The same six failures reproduce on unchanged HEAD in a temporary baseline checkout (five AccountApp onboarding tests and one TripBrief confirmation test); these are existing failures.
- `npm --prefix frontend run build`: passed; existing large-bundle advisory remains.
- `uv run --locked pytest services/crud/tests/test_canvas_evidence_rotation.py services/crud/tests/test_canvas_mock_booking.py services/crud/tests/test_api.py -q`: 39 passed. Actual FastAPI handlers, signed test JWTs and SQLite persistence cover create/read/update, key rotation, idempotency, invalid changes, missing resources, ownership and unauthenticated access.
- Chrome DevTools, authenticated example account: created a disposable seven-section Plan, changed travelers to four, added a preference, simulated one network save failure, retried successfully, changed budget to €2400 on mobile, and reloaded. Full server snapshot comparison was identical after reload; all seven sections remained, and the displayed status was Draft saved automatically. Save plan and Finalize controls were absent. No horizontal page overflow at 390px.
- Console: no application errors; existing Lit-development and Google-marker event warnings. Observed auth and canvas reads returned HTTP 200.
- Existing Plan recovery: preserved the three pending restaurant additions observed in the user's open draft alongside the three existing activities and all other sections. Provider identities were restored from unique Google results matching the observed map coordinates. Verified six places and seven sections persisted. The original tab reloaded with Draft saved automatically.
- Canonical localhost:5174 container is healthy. Example sign-in/session/sign-out passed. Container SHA-256 matches checkout for the canvas hook, canvas component and CRUD canvas repository.
- Temporary verification container removed. Only the disposable test Plan was soft-deleted; existing Plans and database volumes remain intact.

## Evidence limitation

Chrome DevTools rejected explicit screenshot file paths as outside configured workspace roots. Two inline captures timed out with `Page.captureScreenshot timed out`, including a reduced-motion 1440px viewport and bringing the page to the front. Screencast produced no useful visual evidence. A before-state and intended DOM preview were inspected, but screenshots could not be captured. The mandatory Travella skill requires screenshots and visual inspection; this gate remains incomplete, and the accessibility snapshot is not a substitute.

- Intended design: [preview.html](plan/preview.html)
- Browser functional evidence: [mobile-accessibility.txt](implementation/mobile-accessibility.txt)

No live paid model generation was performed; stream completion persistence was covered by focused frontend regression tests.

## Shipping follow-up

The screenshot tool blocker was resolved during shipment: the original HTML preview and integrated production draft were captured and inspected. See [shipping evidence](../2026-10-24-canvas-ship/verification.md). Historical before-implementation capture remains unavailable; these are honestly labeled ship-time captures.
