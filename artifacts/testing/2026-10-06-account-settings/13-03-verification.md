# Plan 13-03 verification — canonical account identity

Implementation verified by isolated HTTP/SQL and component tests on 2026-10-06. Browser delivery remains incomplete until 13-05. No AWS resources, IAM policies or shared example-account email/password/factors were changed. No live identity mutation is claimed.

## Executed checks

| Command | Observed result |
|---|---|
| `uv run --locked pytest services/auth/tests/test_account.py services/auth/tests/test_cognito_adapter.py -q` after task 1 | 13 passed, 0.71s |
| Same command after task 2 | 18 passed, 0.92s |
| `uv run --locked pytest services/auth/tests/test_account.py services/auth/tests/test_api.py services/auth/tests/test_crud_client.py services/auth/tests/test_session_store.py services/auth/tests/test_cognito_adapter.py services/auth/tests/test_account_profile.py -q` | 87 passed, 4.14s before final refresh serialization |
| `uv run --locked pytest services/auth/tests/test_account.py services/auth/tests/test_api.py services/auth/tests/test_crud_client.py services/auth/tests/test_session_store.py -q` after refresh serialization | 70 passed, 2.73s |
| `npm --prefix frontend test -- src/features/account/AccountIdentity.test.jsx src/features/account/AccountSettingsPage.test.jsx src/features/account/PreferenceSettings.test.jsx` | 22 passed, 1.98s |
| `npm --prefix frontend run build` | Passed, 852ms; existing bundle-size warning |
| `git diff --check` | Passed |

All timings are tool-reported elapsed durations. No token/harness usage estimate is implied.

## Actual handler and persistence evidence

- GET account reads only validated same-subject provider names/email, real MFA availability and stored recovery count. Private canonical identity fields are explicit; tokens, provider username and subject are absent from output. Missing/malformed/denied capability reads leave names available and email initiation refused before any provider update.
- PATCH name trims and validates only given/family names, compares canonical expected names, persists an encrypted event journal and requires exact readback. Tests cover stale expectations, changed-body event replay, lost/mismatched readback and one provider write for identical retries. GET subsequently reads the new provider name.
- Fresh verification calls the canonical provider username, never the sign-in route; wrong password, subject, purpose, session, expired/reused proof and bypassed current TOTP cannot authorize email. Temporary refresh credentials are revoked where minted and never stored in the journal; the existing session/cookie and expiry ceiling survive.
- Safe fixtures exercise email intent creation, reload resume, resend, verify and exact canonical completion. Pending old email remains current until verification. Wrong/noninitiating subjects cannot inspect or operate on the intent. Concurrent HTTP clients produce one update and one conflict.
- Actual encrypted SQL assertions verify all same-subject session email copies, the recovery row index and encrypted recovery email change together; recovery hashes, unrelated subjects and session expiries stay intact. Fault injection after provider completion returns `result_unknown`; GET repairs from the persisted intent without repeating provider update/verification. A separate store restart test proves journal persistence and expiry.
- New login stores canonical GetUser email rather than a submitted alias. Reset repairs pending canonical indexes before invalidating sessions. Login and refresh serialize under the same subject guard; the login-versus-email-completion race test confirms no old email is recreated.
- Origin rejection and invalid-input tests retain shared middleware and sanitized errors. Wrong step-up verification does not clear the valid session cookie. Error/log checks exclude provider text, submitted password and canonical provider username. Tests use disposable databases and synthetic identities only.
- Component tests exercise canonical name acknowledgement, honest unsafe capability, explicit password/factor/new-email/pending/resend/completion states, invalid code, pending resume and uncertain-result readback. Existing preference save/clear/dirty/revision tests pass with the new account GET distinguished from mutation calls.

## TDD evidence and corrected intermediate failures

The three task RED records (`13-03-01-red.json`, `13-03-02-red.json`, `13-03-03-red.json`) each returned `RED_EVIDENCE_OK` before implementation. The records adapt observed pytest target assertions into the validator's TAP format. First task: absent account endpoint; second: absent verification endpoint; third: submitted alias persisted and reset retained stale sessions. A cookie-selection fixture error was corrected before accepting task 3 RED evidence.

An existing challenge-expiry test intermittently compared a float clock against microsecond-rounded SQL timestamps. Its fixture now uses an integer-second instant, matching its token fixture; application expiry semantics were not weakened. Four preference tests assumed zero reads before Save and indexed the first request as a write; they now assert only PATCH requests. These intermediate failures are resolved in the passing runs above.

## Remaining delivery gates

- Current research found an empty AttributesRequireVerificationBeforeUpdate list. This implementation fails closed; safe email completion is fixture evidence only. No new live configuration probe or live email activation was performed here.
- Chrome DevTools authenticated canonical identity reads, selected-C responsive/theme screenshots, console/network inspection and source-container freshness belong to 13-05 and remain unverified. Existing selected-C planning captures are linked in [verification.md](verification.md).
- Password/authenticator/recovery mutation controls intentionally remain unavailable until 13-04. Signed-out recovery's pre-existing live assurance debt remains unchanged. Existing unrelated full-frontend failures are recorded in the phase deferred-items file; no full frontend pass is claimed.
- PostgreSQL advisory-lock integration is still the 13-05 gate. This plan's concurrency test runs real HTTP handlers and encrypted SQLite under the documented single-worker limitation.

## Documentation consulted

Context7 MCP/CLI were unavailable. Used official Boto3 documentation for [client write-attribute defaults](https://docs.aws.amazon.com/boto3/latest/reference/services/cognito-idp/client/describe_user_pool_client.html), [verification-before-update behavior](https://docs.aws.amazon.com/boto3/latest/reference/services/cognito-idp/client/update_user_attributes.html), [verification](https://docs.aws.amazon.com/boto3/latest/reference/services/cognito-idp/client/verify_user_attribute.html), and [resend](https://docs.aws.amazon.com/boto3/latest/reference/services/cognito-idp/client/get_user_attribute_verification_code.html). Exact new adapter calls are validated with botocore Stubber, without network access or new packages.
