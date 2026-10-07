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
