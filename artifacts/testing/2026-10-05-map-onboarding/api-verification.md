# Address API and privacy verification — 2026-10-05

Result: passed for the backend slice. No automated test files were added and no test suite was run. These were direct HTTP requests to the actual FastAPI CRUD handlers and manual inspection of the actual projection/adapter functions.

## Environment and scope

- Started the existing `/tmp/travella-phase12-api-server.py` fixture with this checkout's `.venv/bin/python` and `PYTHONPATH=.`, changing its listen port to `8127` and temporary directory prefix to `travella-map-address-api-`.
- The fixture used `services.crud.app.create_app`, the real SQLAlchemy repositories/models, and a new on-disk SQLite database. HTTP calls used `httpx` against `http://127.0.0.1:8127/v1/traveler-profile`.
- Two fixture-only identities exercised token-derived ownership. Their credentials and request authorization headers are omitted here. No example-account or other existing account records were modified.
- All address/profile values were synthetic. The local identity verifier was a fixture; Cognito/JWT validation and production PostgreSQL behavior were not retested.

## Executed HTTP checks

Each successful mutation was followed by a fresh HTTP GET with field assertions. Status and relevant fields were asserted in the one-off request session; no raw profile or authorization data was printed.

| Sanitized request / check | Expected and observed result |
| --- | --- |
| GET before first save | 200; `exists=false`, revision 0 |
| GET and PATCH without authorization | 401 |
| PUT synthetic citizenship, food/accessibility needs and interests | 200; fixture record created |
| PATCH `/onboarding`, home Continue with city/country/place/source, known IATA and padded full address | 200; GET returned the exact trimmed address and all home fields; legacy departure text remained city plus IATA |
| GET after home update | Unrelated fields, onboarding status and completion state preserved |
| Repeat identical event and payload | 200; exact original response and revision; no second write |
| Reuse event with changed address | 409 `request_reused` |
| New event with stale revision | 409 `revision_conflict` |
| GET with second fixture identity | 200; `exists=false`; no first-identity profile values |
| PATCH address of 501 characters | 422; safe generic error, stored profile/revision unchanged |
| PATCH address containing newline, tab, DEL or C1 control | Each 422; safe generic error, stored profile/revision unchanged |
| PATCH address of exactly 500 characters | 200; exact readback |
| PATCH explicit `address=null` and `default_airport=null` | 200; both clears survived GET; departure text became city only |
| PATCH explicit empty address | 200; empty string survived GET |
| PATCH legacy city-only request with no address key | 200; address returned as null |
| Read an actual persisted legacy JSON row with no address key | 200; default address null, remaining fields intact |

The legacy-row check removed only the address key from the isolated fixture JSON using SQLite, then read it through HTTP. All other mutations above used the actual HTTP API.

## Privacy boundary checks

- `profile_context` omitted `home_city.address`, retained the allowlisted city metadata, and produced a distinct nested home object without changing the canonical caller dictionary.
- Absent home keys stayed absent; explicit `home_city=null` and `{}` remained null and empty. Other empty strings, null airport values and empty citizenship lists were retained.
- `TurnContext.messages` and its bounded profile omitted the address. The city-derived legacy field contained no street address.
- Actual `AgentCoreMemory.sync_profile` serialization and retrieval were exercised with a local capture client: sync omitted the address; retrieval removed an address from a simulated old memory record. Timestamp and canonical input were preserved. This inspected the adapter boundary without calling AWS; it does not claim cloud memory persistence was verified.
- Reviewed existing request-context and turn-context callers: both use the shared sanitizer. CRUD errors return a generic message and do not echo the supplied address.
- `git diff --check` passed.

## Notes and cleanup

The first legacy-row fixture lookup assumed `/tmp`, while macOS selected its normal temporary directory. It was corrected to use `tempfile.gettempdir()` and the check then passed. Importing agent modules emitted an existing LangGraph pending-deprecation warning about a future `allowed_objects` default; the checks completed successfully.

The isolated HTTP server was stopped after verification. Its fixture database/directory was removed. Browser verification and the frontend build are owned by the parent task and are outside this backend record.

## Deployment compatibility follow-up: legacy event receipts

Read-only integration review identified that the new default `address=null` changes the normalized request hash for a city-only request saved before deployment. `services/crud/profile.py` now accepts the exact old digest when the home Continue request has a null/absent address. All remaining request fields still participate in the digest; non-null addresses cannot use this compatibility path.

Started a second actual FastAPI fixture at port 8127 with a fresh `travella-map-receipt-api-` SQLite directory. Saved a synthetic city-only home through HTTP, then changed only that fixture's persisted receipt and home JSON to the exact pre-address representation (including the old normalized digest and address-free receipt response). Executed direct HTTP PATCH/GET checks:

| Check | Observed result |
| --- | --- |
| Identical original city-only request with pre-address receipt | 200, original response/revision; no new write |
| Equivalent explicit-null address retry | 200 |
| Reused event with a full address, empty address, changed city, or changed airport | Each 409 `request_reused` |
| New address-bearing request at the next revision | 200, revision 2 |
| Retry of that current-version request | Exact original response |
| Retry of legacy event after the newer address save | Original revision-1 receipt returned; fresh GET snapshots before/after were exactly equal at revision 2 with the newer address |

An initial whole-response comparison between PATCH and GET flagged SQLite's existing UTC suffix formatting difference in `updated_at`; inspecting differing field names isolated this to the timestamp representation. Timestamp values matched. The persistence assertion was rerun with fresh GET snapshots on both sides of the retry and passed exactly.

No automated tests or commits were added. `git diff --check` passed. The second server was stopped and its isolated database directory removed.
