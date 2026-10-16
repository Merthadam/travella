# Travel follow-up loop verification

## Before fix

- User screenshots preserved under plan/: reported-passenger-loop.png and reported-context-loss.png. They show explicit all-three-adults answer rejected, followed by loss of active search context.
- Root inspected the reported existing Canvas read-only. Exact Canvas dates were 2026-10-23 through 2026-10-26 and total 3 travelers. No user Plan state was modified.
- Authenticated a separate Chrome context with the configured example account; credentials were never printed and temporary owner-only input script was removed immediately.
- Created isolated test Plan 02ac9b00-3d86-4323-844e-e96672247ada. This is the only record eligible for cleanup in this debug run.
- Actual production Canvas input: Find flights from BUD to MXP from 2027-04-14 to 2027-04-21; flight country: HU (with ordinary spaces). Agent asked passenger question. Reply “all 3 adults” repeated the identical question; zero previews. Captured and inspected plan/reproduced-passenger-loop.jpg.
- Follow-up what are you doing produced live model prose acknowledging the answer but still asking whether children/infants are flying. No flight search occurred.

## Acceptance

Natural unequivocal adult-only answers must resolve passengers, survive a short troubleshooting exchange, and permit a real search once remaining inputs are available. Missing or ambiguous ages/dates/airports/pricing country must still clarify; assistant suggestions cannot authorize provider criteria or durable changes. No frontend layout, CRUD schema, checkout or booking behavior is requested.

Before-fix continuation “yes look for those flights” then asked for dates again despite exact dates in the original user message. Browser requests all returned200; the issue is input/history handling, not transport. Initial isolated signed-out session401 and subsequent sign-in/session200 are expected.

## Fix and automated verification

- Source commit: e498b8a. Natural adult allocations now resolve passengers; bounded, host-anchored traveler replies survive a short repair/apology exchange. Assistant prose never supplies missing fields. Prompt explicitly separates search readiness from durable destination confirmation.
- `uv run --locked pytest services/agent/tests/test_canvas_travel.py services/agent/tests/test_agent_checkpoint.py -q`: 191 passed in 16.19s. Final focused run after cancellation narrowing: 16 passed. Tests cover real HTTP/graph/editor boundaries with injected SDK/provider transport, natural replies, missing ages/country/airports, reset/cancel boundaries, and exact-date recovery.
- Source-only revert/reapply proved both original regressions fail on baseline and pass with the fix. Root independently reviewed the source, prompt and tests; no blocking findings.
- Existing Cognito read-only precheck and `bash scripts/start-local-ready.sh` passed. Temporary sign-in/session/sign-out check passed. SHA-256 checks matched all three changed runtime files between checkout and running app container.

## Authenticated Chrome verification after rebuild

- App: http://localhost:5174. Used the configured example account in an isolated Chrome context. Existing user Plan was not edited.
- The rebuild reloaded the unsaved test tab into Research. An initial follow-up there produced a generic assistant answer and an interrupted provider error. This was outside the Canvas search route; it is recorded as a separate observed limitation, not a successful search or a fixed Research issue.
- Reopened Planning Canvas and sent only “yes look for those flights” in the SAME existing broken conversation, including the extra Research interruption. Actual SDK and LiteAPI sandbox search completed: 63 results, 3 displayed previews, BUD–MXP return, 2027-04-14 through 2027-04-21, 3 adults, HU pricing country, EUR, economy. No repeated passenger/date/destination-confirmation question. No fixtures injected into this browser search.
- Three flight illustrations rendered in side chat. Inspected `implementation/fixed-flight-preview.jpg`: readable route, dates, fare and three-adult labels; no clipping or overlap within cards. The side chat scrolls normally.
- Clicked View all flights: existing manual search form opened with BUD, MXP, original dates, HU, EUR, economy and 3 adults preloaded; 63 existing results displayed. Navigation caused no additional search request. Inspected `implementation/preloaded-manual-flights.jpg`: populated fields, party summary and results visible without layout issues.
- Clicked Back to plan chat: Canvas and previews retained without leave confirmation.
- Read `/v1/plans/{test-id}/canvas`: HTTP 200, revision 1, snapshot null, saved_at null. Search/navigation did not save or change the Plan.
- Relevant Canvas/auth/search HTTP requests returned 200. Chrome console had no errors and only the existing Lit development-mode warning. The earlier Research application error arrived over HTTP 200; no claim is made that Research was fixed.
- No frontend or CRUD implementation changed; no new responsive layout was introduced. Full unrelated suites were not rerun; this debug record supplements the earlier Phase16 baseline rather than claiming revalidation of that entire phase.

## Evidence

- Before: `plan/reported-passenger-loop.png`, `plan/reported-context-loss.png`, and inspected `plan/reproduced-passenger-loop.jpg`.
- After: `implementation/fixed-flight-preview.jpg` and `implementation/preloaded-manual-flights.jpg`.
- Cleanup: deleted only test Plan 02ac9b00-3d86-4323-844e-e96672247ada through the UI. Subsequent GET with view=deleted returned 200 and lifecycle=deleted; its active-list link was absent. No other records were deleted.

