# Flight confirmation verification

Date: 2026-10-16. Checkout: bottled-alley, baseline 1454a54. Scope: flights only.

## Expected behavior

Research asks whether flights are needed. A traveler answer or direct edit must confirm the need; inference does not qualify. Generation review requires Yes/No before proceeding. Confirmed Yes includes flights; confirmed No omits the component. Other undecided trip details remain allowed. Generation and saving remain separate actions.

## Automated checks

- `uv run --locked pytest -q services/crud/tests/test_flight_confirmation.py services/agent/tests/test_flight_generation.py services/crud/tests/test_canvas_mock_booking.py services/agent/tests/test_agent_turn.py`: **38 passed**.
- Frontend `npm test -- --reporter=dot src/features/plans/components/PlanningCanvas.test.jsx src/features/plans/components/PlanConversation.test.jsx src/features/plans/components/CanvasGenerationReview.test.jsx src/features/plans/travel/useFlightBookingSync.test.jsx`: **34 passed**.
- Frontend `npm run build`: passed; existing large-chunk advisory remains.
- Ruff on changed Python files and new tests: passed. `git diff --check`: passed.

Coverage includes undecided/inferred/confirmed mapping; all generation actions rejecting unconfirmed needs before worker invocation; Yes/No component assembly; failed confirmation and retry; cancellation without writes; generation using the new context revision; No removing old flights; Yes adding flights after essentials edits; absent-flight editing/save/reload; ignored late mock-flight updates; travel navigation without flights.

## FastAPI persistence checks

Tests use actual CRUD handlers, signed test identities, and an isolated SQLAlchemy SQLite database.

| Operation | Expected and observed |
| --- | --- |
| GET research context | 200; new Plan starts with flights undecided. |
| PATCH flight choice | 200 for needed/not-needed; context revision advances and provenance is user_edit; GET confirms persistence. |
| Duplicate PATCH | Same request returns the committed result without applying twice. |
| Stale PATCH | 409; confirmed choice remains unchanged. |
| Agent context-run completion | Inferred flight choice returns 400 without changing flights. Explicit answer with verbatim quote returns 200 and persists user_explicit provenance. |
| Invalid choice | 400; context remains undecided. |
| Unauthenticated / foreign / missing Plan | 401 / 404 / 404 respectively; no mutation. |
| Canvas challenge and save | 200 for both confirmed choices; GET reads the exact saved snapshot, including absent flights for No. |

No delete operation changed. Existing mock booking persistence regression tests pass.

## Browser and local runtime

The configured Chrome DevTools MCP could not launch because its shared browser profile was occupied. Verification uses the same Chrome DevTools MCP package through an isolated process with the workspace root registered. No existing user browser was stopped. Authenticated with the required example account using the ignored credential file; no credentials were written to evidence.

The local skill's Cognito precheck passed. `bash scripts/start-local-ready.sh` rebuilt this checkout; sign-in, session check, and temporary sign-out passed. SHA-256 comparisons of the running container's changed review component, canvas hook, trip context, and chat prompt match this checkout. Canonical origin: http://localhost:5174.

Observed browser checks:

- Live research for a new Vienna test Plan asked “Do you need flights for this trip?” while leaving flights undecided.
- Review showed neither flight radio selected and disabled Confirm & generate.
- Selecting No and confirming persisted not-needed/user_edit before generation.
- Full live generation completed without errors and without a flight component.
- Explicit Save plan succeeded. Backend readback and page reload preserved the snapshot without flights.
- Accommodation search remained usable; its navigation omitted Flights.
- At an emulated 390×844 mobile viewport, the radio controls and confirmation buttons were usable. Dialog scrolling exposes the footer without horizontal overflow.
- Changing No to Yes persisted needed/user_edit; full live generation completed successfully. Explicit Save and backend readback preserved the flight component. Reload showed Saved plan loaded and exactly one flight card.
- A concurrent context update advanced revision 4 to 5 while review remained open. Confirming the stale No selection displayed an error and retained the review; backend readback remained needed at revision 5. No generation began.
- Final successful reload: all 11 fetch/XHR requests returned 200; no console errors, only the existing Lit development-mode warning. An earlier container rebuild interrupted a session (500); reauthentication and both complete journeys subsequently passed.
- Screenshots were visually inspected: readable controls, no overlap or horizontal overflow. Mobile dialog content scrolls vertically.
- Cleaned up only the Plan created for this run through the existing delete challenge/commit API; readback confirmed lifecycle deleted. Other Plans were untouched.

Screenshots are deliberately scoped to review/travel controls so unrelated example-account profile details are not captured.

## Baseline failures

Broader adjacent checks found two pre-existing failures, both reproduced from a temporary `git archive HEAD` checkout:

- `TripBrief.test.jsx`: expects a separate inline confirmation for the old sidebar need buttons; current baseline applies those buttons directly. This change adds confirmation to generation review and does not change sidebar controls.
- `test_agent_api.py::test_profile_memory_sync_uses_verified_identity_and_safe_status`: expects a profile without the newer default fields.

These do not fail the focused flight-confirmation checks. The baseline reproduction changed no working-tree source.

## Evidence

- [Intended review sketch](plan/review-sketch.png), [before review](plan/before-review.png).
- [Required flight choice](implementation/01-flight-choice-required.png).
- [Narrow review viewport](implementation/02-flight-choice-narrow.png).
- [Saved No travel section](implementation/03-no-flights-saved-travel-section.png).
- [Mobile confirmation at 390px](implementation/04-mobile-confirmation.png).

- [Confirmed flight card](implementation/05-confirmed-flight-card.png).
- [Stale confirmation error](implementation/06-stale-confirmation-error.png).
