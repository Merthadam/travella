# Generation-context HTTP verification

Date: 2026-10-07

Actual requests ran against the rebuilt local FastAPI CRUD service at port 8001 in `travella-local-single-app-1`. Authentication used a temporary example-account session through localhost:5174 and its server-validated Cognito access token. No credentials or token values were printed or saved.

Fixtures: two newly created Plans (one example-owned, one synthetic other-owner), with synthetic non-personal conversation messages. PostgreSQL fixtures were setup/cleanup only; every endpoint result below came from real HTTP handlers. Existing Plans were not modified. No automated test suite or model calls ran.

| Manual check | Result | Observed response / stored outcome |
|---|---|---|
| Unauthenticated read | PASS | status=401 |
| Missing Plan read | PASS | status=404 |
| Other-owner Plan read with real example-user token | PASS | status=404 |
| First authorized page | PASS | status=200, messages=20, cutoff=55 |
| Stable cutoff across pages despite newly appended message | PASS | page_statuses=[200, 200, 200], total_returned=55, earliest_sequence=1, last_sequence=55 |
| Stale expected Plan revision rejected | PASS | status=409 |
| Cursor beyond cutoff rejected | PASS | status=400 |
| Oversized page request rejected | PASS | status=422 |
| Exactly 500 messages remains readable | PASS | status=200, total_messages=500, returned=50 |
| 501 messages explicitly blocks incomplete coverage | PASS | status=200, total_messages=501, returned=0, coverage_incomplete=True |
| Original bounded span survives later history growth | PASS | status=200, total_messages=55 |
| Only temporary fixture Plans/messages cleaned up | PASS | remaining_plans=0, remaining_messages=0 |
| Removed fixture read | PASS | status=404 |

## Request sequence

- `GET /v1/plans/{fixture}/generation-context` without credentials, with an unknown Plan, and with the other-owner fixture.
- Read `limit=20`; append one synthetic message after the first page; continue using the original `cutoff_sequence=55`, returned cursor and expected revision. Verified exact sequences 1–55, including early history beyond the normal 12-message chat window.
- Send a stale expected revision, an out-of-range cursor and `limit=51`.
- Seed exactly 500 then 501 messages and inspect coverage flags and returned messages. Re-read the original 55-message cutoff after growth.
- Delete only this run’s temporary Plan rows; verify their Plan/message row counts are zero, then verify HTTP returns 404.

Temporary login session signed out: True.

This evidence covers generation-history reads and their boundaries. Canvas CRUD/browser/model checks are reported separately.

## Canvas HTTP ownership and missing-record boundaries

Follow-up verification on the rebuilt container used two fresh disposable Plans and a fresh temporary example-user session. Each write request supplied a valid-shaped `snapshot: null`, `context_revision: 1`, fresh Idempotency-Key, If-Match: 1 and a nonempty placeholder challenge header. Thus malformed request shape did not mask ownership enforcement. No new account was provisioned.

| Actual HTTP request | Result | Observed response / stored outcome |
|---|---|---|
| Unauthenticated: GET /canvas | PASS | status=401, code=unauthenticated |
| Unauthenticated: POST /canvas/challenge | PASS | status=401, code=unauthenticated |
| Unauthenticated: PUT /canvas | PASS | status=401, code=unauthenticated |
| Unauthenticated: DELETE /canvas | PASS | status=401, code=unauthenticated |
| Missing Plan: GET /canvas | PASS | status=404, code=not_found |
| Missing Plan: POST /canvas/challenge | PASS | status=404, code=not_found |
| Missing Plan: PUT /canvas | PASS | status=404, code=not_found |
| Missing Plan: DELETE /canvas | PASS | status=404, code=not_found |
| Other owner: GET /canvas | PASS | status=404, code=not_found |
| Other owner: POST /canvas/challenge | PASS | status=404, code=not_found |
| Other owner: PUT /canvas | PASS | status=404, code=not_found |
| Other owner: DELETE /canvas | PASS | status=404, code=not_found |
| Denied requests made no fixture mutations | PASS | plan_revisions=[1, 1], canvases=0, challenges=0, initial_create_receipts=2 |
| Boundary fixtures and their create receipts cleaned up | PASS | remaining_plans=0, remaining_receipts=0 |

Temporary follow-up session signed out: True.
Existing example-account Plans were not modified. No automated test suite or model calls ran.
