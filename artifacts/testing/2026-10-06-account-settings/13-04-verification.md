# Plan 13-04 security verification

Implementation and automated checks completed on 2026-10-06. **Production Chrome interaction, screenshots, responsive themes and console/network inspection remain unverified until plan 13-05.** No shared example-account password, email, MFA or recovery-code mutation occurred. No AWS/IAM configuration changed. Signed-out recovery remains inherited, separately unverified debt.

## Executed checks

| Command | Observed result |
| --- | --- |
| `uv run --locked pytest services/auth/tests/test_account_security.py services/auth/tests/test_cognito_adapter.py -q` after password task | 17 passed |
| `npm --prefix frontend test -- src/features/account/AccountSecurity.test.jsx` after password task | 2 passed |
| `uv run --locked pytest services/auth/tests/test_account_security.py services/auth/tests/test_api.py services/auth/tests/test_cognito_adapter.py -q` after authenticator task | 55 passed |
| Security component suite after authenticator task | 4 passed |
| `uv run --locked pytest services/auth/tests/test_account_security.py services/auth/tests/test_session_store.py -q` after recovery implementation | 24 passed |
| Security component suite after recovery implementation | 6 passed |
| Final `uv run --locked pytest services/auth/tests -q` | **139 passed**, 5.13 seconds; existing SQLAlchemy/Python datetime and LangGraph deprecation warnings |
| Final `npm --prefix frontend test -- src/features/account/AccountSecurity.test.jsx src/features/account/AccountIdentity.test.jsx src/features/account/AccountSettingsPage.test.jsx src/features/account/PreferenceSettings.test.jsx` | **30 passed**, 2.01 seconds |
| Final `npm --prefix frontend run build` | Passed, 832ms; existing bundle-size warning |
| `git diff --check` | Passed |

All three task RED records returned `RED_EVIDENCE_OK` before production implementation. They explicitly adapt observed pytest assertion identities/counts to the runtime's TAP-only parser. Initial failures were missing routes (404 instead of intended status) and missing Password controls, not load/fixture failures. Two additional regressions intentionally demonstrated a pre-MFA proof bypass and reload reconciliation failure before fixes.

## Actual HTTP and SQL outcomes

- Password POST requires a same-subject, same-session, single-use password-change proof and provider acknowledgement. Wrong password and provider policy errors return safe 400 responses without expiring the valid session. Wrong purpose, expired proof and another session return 403; anonymous requests return 401; extra subject/invalid body returns sanitized 422. Unknown transport outcomes return 503 and remain `result_unknown` on status/replay. Exactly one provider mutation is observed. Neither passwords nor password-derived digests appear in decrypted SQL journal rows.
- Authenticator start accepts an access-token provider response containing SecretCode without Session. Start/verify/disable use existing CSRF, body bounds and throttle protection. Setup and replacement require appropriate canonical state plus fresh proof; replacement verifies the current factor. VerifySoftwareToken SUCCESS precedes explicit enabled/preferred activation and GetUser readback. Missing activation, wrong code, expired enrollment and another session cannot produce success. Disable is blocked under required-MFA policy. Overlapping live enrollment and disable are refused. Legacy signed-in enrollment URLs delegate to the same guarded contracts and reject old proofless bodies.
- Failed readback after acknowledged MFA activation repairs from canonical GET or operation-status without repeating verification or preference writes. Unacknowledged operations retain unknown receipts. After an enrollment attempt expires, a new explicit, freshly verified operation can supersede it without rewriting its historic unknown outcome. No setup key is stored in the journal or returned by account/status reads. Proofs minted before MFA activation cannot bypass the newly required factor.
- Recovery rotation returns ten distinct 32-hex-character codes (128 bits each). Existing transaction helpers atomically consume proof, replace hashes and commit the event receipt before plaintext response. Old code fails; new code consumes once; other subject remains unchanged. SQL failure after hash write rolls back hash/proof/receipt together. Concurrent duplicate HTTP requests produce one 200 disclosure and one 409 `disclosure_unavailable`, with one receipt and ten current hashes. Replay carries safe account/count, never plaintext. Ordinary GET returns canonical count, including count decrement after consumption. Existing short legacy codes still consume once after store restart.
- Encryption checks inspect both raw and decrypted persistence. Passwords and enrollment/recovery plaintext are absent; recovery payload contains only canonical email metadata and digests. No new tables, migrations, dependencies or private provider payload projections were introduced.

## UI outcomes

Password matching is client-only; current/new/confirm values persist only through the active verification flow and clear on terminal results, cancellation, timeout and session expiry. Mismatch focuses the described invalid confirmation field. Current-factor challenge precedes the password mutation. Unknown results offer status checking and never replay the mutation.

Authenticator setup exposes a keyboard-accessible manual setup key, no external QR service. Replacement and disable carry explicit consequences before verification. Success waits for canonical On/Off acknowledgement. Recovery has zero/one/many/unknown copy, a real MFA setup link, replacement warning, selectable one-time codes, acknowledged clipboard copy, manual-copy failure, and the page-wide “Have you saved your recovery codes?” exit guard. Lost disclosure resolves safe count and offers explicit replacement without redisclosure. Session expiry hides private page content.

These are component/HTTP checks, **not real-provider sensitive mutation or Chrome passes**. Existing selected-C before-state screenshots remain at [desktop light](../2026-10-05-account-prototypes/plan/c-light.png), [desktop dark](../2026-10-05-account-prototypes/plan/c-dark.png), [mobile light](../2026-10-05-account-prototypes/plan/c-light-mobile.png) and [mobile dark](../2026-10-05-account-prototypes/plan/c-dark-mobile.png). Actual production screenshots remain the next plan's delivery gate. WINDOWS entry 3 remains open; the previously recorded unrelated broad frontend failures remain separate.

## Grounding and deviations

Context7 MCP and the ctx7 CLI were unavailable. Checked official [ChangePassword](https://docs.aws.amazon.com/cognito-user-identity-pools/latest/APIReference/API_ChangePassword.html), [AssociateSoftwareToken](https://docs.aws.amazon.com/cognito-user-identity-pools/latest/APIReference/API_AssociateSoftwareToken.html), [VerifySoftwareToken](https://docs.aws.amazon.com/cognito-user-identity-pools/latest/APIReference/API_VerifySoftwareToken.html) and [SetUserMFAPreference](https://docs.aws.amazon.com/cognito-user-identity-pools/latest/APIReference/API_SetUserMFAPreference.html) documentation; exact request shapes pass botocore Stubber.

The local Cognito client previously used `Config(retries={max_attempts: 1})`, which permits one retry beyond the original request. Changed it to `total_max_attempts: 1` so new sensitive operations cannot repeat at the SDK layer. This necessary `services/auth/app.py` edit extends the plan's file list; see [official retry semantics](https://docs.aws.amazon.com/boto3/latest/guide/retries.html). Existing SessionStore transaction/guard/hash APIs sufficed without production store changes. No blanket or whole-file deletions occurred; the old unguarded route bodies were intentionally replaced by guarded aliases.
