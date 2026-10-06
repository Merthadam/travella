# Phase 13 source coverage and execution map

Status: planned; no production implementation or test pass is claimed by this audit. Source discovery is sufficient: 13-RESEARCH and 13-PATTERNS inspected the installed stack and current official Cognito operations; this planning session checked actual route/schema/repository/frontend/test seams. No new dependency or AI/model integration is proposed.

## Multi-source coverage audit

CONTEXT has descriptive locked bullets, not D-NN identifiers. C-01 through C-09 below are audit labels for those existing decisions, not invented user decisions.

| Source | ID | Required outcome / constraint | Plan and task | Status |
|---|---|---|---|---|
| GOAL | Phase 13 | Manage identity, reusable preferences and security in C with light/dark and durable explicit saves | 13-01–05 | COVERED |
| REQ | ACCOUNT-13-01 | Authenticated C route, inline/mobile editor, return, themes | 13-01-01/02; 13-05-02 | COVERED |
| REQ | ACCOUNT-13-02 | Every onboarding preference, clears, no interest minimum, revisions/idempotency, preserve completion | 13-01-01/02; 13-02-01/02 | COVERED |
| REQ | ACCOUNT-13-03 | Canonical names and safe verified email; no browser identity authority | 13-03-01/02/03 | COVERED |
| REQ | ACCOUNT-13-04 | Password, authenticator/recovery management, verification and privacy | 13-03-02; 13-04-01/02/03 | COVERED |
| REQ | ACCOUNT-13-05 | Canonical updates/clears inform suggestions, never mutate confirmed Plans | 13-02-03; 13-05-02 | COVERED |
| REQ | ACCOUNT-13-06 | Real HTTP+SQL and example-account Chrome/screenshots | Every task verify; 13-05-01/02 | COVERED |
| CONTEXT | C-01 | Selected C adjacent editor and grouped mobile selector | 13-01-01/02; approved UI-SPEC referenced | COVERED |
| CONTEXT | C-02 | Explicit light/dark control | 13-01-02; 13-05-02 | COVERED |
| CONTEXT | C-03 | First/last name and verified email changes | 13-03-01/02/03 | COVERED |
| CONTEXT | C-04 | Home/city/optional airport, multiple citizenships, food/accessibility, curated/custom interests | 13-01-01; 13-02-01/02 | COVERED |
| CONTEXT | C-05 | Optional removals and no five-interest minimum for existing account | 13-02-01/02 | COVERED |
| CONTEXT | C-06 | Real password/authenticator/recovery contracts | 13-04-01/02/03 | COVERED |
| CONTEXT | C-07 | Explicit Save/Cancel, dirty guards, real errors, preserved ordinary drafts, acknowledgement before success | 13-01-01/02; 13-03/04 sensitive state contracts | COVERED |
| CONTEXT | C-08 | Future suggestions use profile; confirmed Plan details remain | 13-02-03 | COVERED |
| CONTEXT | C-09 | Account deletion and sign-out-all excluded | Explicit exclusions in 13-03/04 and API table below | COVERED |
| CONTEXT | Design capture | Prototype branch retained, actual production source, planning evidence preserved | 13-01-03; 13-05-02 | COVERED |
| CONTEXT | Discretion/gates | Reuse auth/CRUD/mirror/catalogs; no cloud change or shared security mutation; real evidence, prior debt retained | All plans; 13-05 | COVERED |
| RESEARCH | R-01 | Browser drafts/theme separate from canonical Auth identity and CRUD preferences | 13-01/02/03 interface contracts | COVERED |
| RESEARCH | R-02 | Separate section mutation; strict values; preserve progress/completion and legacy fields | 13-01-01; 13-02-01/02 | COVERED |
| RESEARCH | R-03 | Subject lock, receipt-before-revision, changed replay rejection, bounded receipts and atomic SQL | 13-01-01; 13-05-01 | COVERED |
| RESEARCH | R-04 | Gateway route and CrudClient method allow-list both updated | 13-01-01 | COVERED |
| RESEARCH | R-05 | Names read/write from GetUser/UpdateUserAttributes, allow-list and canonical readback | 13-03-01 | COVERED |
| RESEARCH | R-06 | Email configuration unsafe; full safe flow while live initiation fails closed | 13-03-01/02; 13-05-02 | COVERED |
| RESEARCH | R-07 | Pending email bound to subject/session, exact confirmation/resend, obsolete intent and honest Cancel | 13-03-02 | COVERED |
| RESEARCH | R-08 | Canonical email in future sessions; reconcile session/recovery copies by stable subject | 13-03-02/03 | COVERED |
| RESEARCH | R-09 | Fresh current password and existing factor, same-subject token check, temporary token cleanup, fixed expiry | 13-03-02; 13-04 | COVERED |
| RESEARCH | R-10 | Provider/local split: committed intent, readback, repair and no false success | 13-03-02/03; 13-04-02 | COVERED |
| RESEARCH | R-11 | ChangePassword, safe actual policy, no reset substitution | 13-04-01 | COVERED |
| RESEARCH | R-12 | Access-token MFA setup without Session requirement, activation and canonical readback, honest disable | 13-04-02 | COVERED |
| RESEARCH | R-13 | Strong recovery codes, atomic hashes, count-only reads, one-time disclosure and explicit re-rotate after lost result | 13-04-03 | COVERED |
| RESEARCH | R-14 | Signed-out recovery remains separate unverified debt; no admin/IAM workaround | 13-03-03; 13-04/05 limitations | COVERED |
| RESEARCH | R-15 | Account route/auth refresh, preserve selected Plan, safe return/history and dirty guards | 13-01-01/02; 13-05-02 | COVERED |
| RESEARCH | R-16 | Device theme only, system fallback, storage errors and restore color scheme | 13-01-02 | COVERED |
| RESEARCH | R-17 | Canonical explicit clears beat stale mirror, bounded mirror failure and private projection | 13-02-03 | COVERED |
| RESEARCH | R-18 | Fix existing stale raw revision assertion; run explicit Agent tests | 13-01-01; 13-02-03; 13-05-01 | COVERED |
| RESEARCH | R-19 | Real HTTP/store/provider request shapes and PostgreSQL concurrency | 13-01/03/04 tests; 13-05-01 | COVERED |
| RESEARCH | R-20 | Existing middleware protections; STRIDE mitigations and sanitization tests | Every plan threat_model; 13-03/04 tests | COVERED |
| RESEARCH | R-21 | Existing encryption/expiry, no key/migration changes, source-container rebuild verification | 13-03/04; 13-05-02 | COVERED |
| UI-SPEC | Contract | Exact copy, nine settings, real map/fallback, responsive typography/colors, keyboard/focus, all interaction states | 13-01–04 implementation; 13-05-02 inspection | COVERED |

No source item is missing. Explicit exclusions are not deferred accepted features: account deletion, sign-out-all control, device/passkey/SMS/email-factor management, administrative recovery redesign, cloud mutations and unrelated earlier-phase debt. Full email code support is planned; live activation remains unavailable under the observed unsafe policy.

## Cognito API coverage

This is the research-defined relevant account scope, not a catalogue of all Cognito APIs. Every new wrapper needs exact request-shape and sanitized-error coverage in test_cognito_adapter.py plus actual auth-handler/local-store integration where durable state changes.

| Cognito operation | Disposition and plan/test |
|---|---|
| GetUser | 13-03-01 canonical identity/subject/private projection; 13-03-02 email readback; 13-04-02 MFA activation readback |
| UpdateUserAttributes | 13-03-01 names; 13-03-02 gated email, exact attribute allow-list and failure/readback |
| GetUserAttributeVerificationCode | 13-03-02 email resend, bound pending intent and throttle |
| VerifyUserAttribute | 13-03-02 exact pending verified email, obsolete/replayed confirmation and reconciliation |
| ChangePassword | 13-04-01 current/new password request, wrong credentials/policy/unknown outcome |
| AssociateSoftwareToken | 13-04-02 access-token setup/replacement, no response Session requirement |
| VerifySoftwareToken | 13-04-02 successful status, invalid/expired code and partial-stage cases |
| SetUserMFAPreference | 13-04-02 enable/disable, policy guard and GetUser readback |
| InitiateAuth | Existing adapter reused in 13-03-02 fresh verification; no public login/session replacement |
| RespondToAuthChallenge | Existing adapter reused in 13-03-02 same-subject/session TOTP verification |
| GetTokensFromRefreshToken | Existing operation; 13-03-03 and 13-05 regressions preserve expiry ceiling/canonical identity |
| RevokeToken | Existing wrapper; 13-03-02 temporary verification token cleanup; logout regressions |
| ForgotPassword, ConfirmForgotPassword | Existing flows; 13-03-03 email-index/reset-invalidation regression only, no settings-page reset |
| SignUp, ConfirmSignUp, ResendConfirmationCode | Existing registration excluded from email-change implementation; unchanged auth regressions |
| GlobalSignOut | Existing reset side effect only; no new sign-out-all control |
| DescribeUserPool, DescribeUserPoolClient, GetUserPoolMfaConfig | 13-03-01 read-only capability reader; permission/unknown/unsafe state defaults unavailable; no IAM provisioning |
| AdminDeleteSoftwareToken | Explicitly excluded: lost-factor architecture/IAM work outside signed-in settings; earlier debt remains |
| AdminSetUserMFAPreference, AdminGetUser, AdminUpdateUserAttributes, AdminSetUserPassword, AdminResetUserPassword, AdminInitiateAuth, AdminRespondToAuthChallenge, AdminUserGlobalSignOut | Explicitly excluded: no administrative identity bypass |
| DeleteUser, AdminDeleteUser | Explicitly excluded account deletion |
| DeleteUserAttributes | Excluded: required identity attributes remain; optional travel removals belong to CRUD |
| SetUserSettings | Excluded in favor of SetUserMFAPreference |
| ListDevices, GetDevice, UpdateDeviceStatus, ForgetDevice, ConfirmDevice and admin equivalents | Explicitly excluded device management |
| StartWebAuthnRegistration, CompleteWebAuthnRegistration, ListWebAuthnCredentials, DeleteWebAuthnCredential; SMS/email/passkey MFA | Explicitly excluded; selected factor is authenticator TOTP |
| UpdateUserPool, UpdateUserPoolClient, SetUserPoolMfaConfig | Forbidden cloud mutations in this phase |

## Dependency and ownership map

| Wave / plan | Needs | Creates / expands | Checkpoint |
|---|---|---|---|
| 1 / 13-01 | Existing profile/auth/onboarding and selected C evidence | Production account needs tracer; route/theme/guards; prototype cleanup | None |
| 2 / 13-02 | Section writer, account page/draft lifecycle | All preference sections and canonical-clear/mirror proof | None |
| 3 / 13-03 | Account page and completed profile contract | Canonical AccountOutput, personal details, proof/operation helpers and conditional email | None |
| 4 / 13-04 | AccountOutput, proof/operation helpers | Password/MFA/recovery settings and privacy/failure proof | None |
| 5 / 13-05 | All production settings and focused suites | PostgreSQL concurrency, actual Chrome screenshots and validation evidence | Agent-executed browser gate; blocked checks remain incomplete |

Shared account page/auth/store files force sequential waves. No same-wave file or mutable-resource conflict. Each plan owns only its frontmatter-listed edits during its wave; executors preserve unrelated changes. The thin tracer and closely connected slice tasks cross necessary bridge/test files; the parent approved exceeding the nominal file-count heuristic instead of introducing layer-only tasks or fake behavior. All plans remain 2–3 tasks with explicit verify commands.

Estimates use estimate-calibration factor 1, sample_count 0, confidence low. Commands are grounded in frontend/package.json, existing uv pytest paths and tests each task must create before running. Inherited build command is npm --prefix frontend run build. Plans introduce no package-install task, no dependency upgrade, no cloud provisioning and no AI-SPEC requirement.

## Verification interpretation

No test has been marked passing prospectively. Research's observed baseline was 59 passed and one stale revision assertion failed; 13-01 corrects that assertion. Chrome evidence is a delivery gate in 13-05; unit/HTTP fixtures and artifact existence are not substitutes. Identity/security successful mutations are tested with real auth handlers plus isolated provider fixtures and SQL, never the shared example account. Current email capability is unavailable; no live email activation or signed-out recovery assurance is claimed.

