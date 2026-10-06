# Account settings verification

## Plan 13-01 — production needs tracer and navigation

Implementation tasks are committed. Browser delivery remains **unverified** until the explicit 13-05 Chrome DevTools gate. No shared-account credential/security changes or AWS mutations were made.

### Executed checks

| Command/check | Observed result |
| --- | --- |
| `uv run --locked pytest services/auth/tests/test_account_profile.py services/crud/tests/test_api.py -q` | **34 passed**, including the post-commit tracer rerun. Real Auth and CRUD handlers, actual SQLite transactions; only transport/provider fixtures are substituted. |
| `npm --prefix frontend test -- src/features/account/AccountSettingsPage.test.jsx` | **11 passed**: actual `/account` bootstrap/save, exact body, acknowledgment, retained drafts, dirty Cancel/mobile/desktop/My plans, repeated Back and Forward, themes/denied storage, conflict review, exact unknown-result replay, transient session failure and late response after expiry. |
| `npm --prefix frontend test -- src/AccountApp.test.jsx -t 'Account opens\|direct account'` | **2 passed**, 10 unrelated tests filtered. Confirms authenticated bootstrap, no enrollment mutation, hidden/inert mounted Plans view, and return to the same instance. |
| `npm --prefix frontend test -- src/PlansApp.test.jsx -t 'account suspension'` | **1 passed**, 9 unrelated tests filtered. Selected Plan and unsent composer survive account suspension; no extra Plan reload. |
| `npm --prefix frontend test -- src/AccountApp.test.jsx src/PlansApp.test.jsx src/features/account/AccountSettingsPage.test.jsx` (also run with JSON reporter for the final counts) | **21 passed, 12 failed**. All 12 failures predate this change: five legacy AccountApp onboarding tests and seven incomplete PlansApp API fixtures. See deferred-items.md; this is not a full-suite pass. |
| Pre-change baseline `git archive 49e6d526` into an independent `/tmp` directory, same installed dependencies, archived shared catalogs; run AccountApp and PlansApp tests | Original AccountApp: 5 passed / 6 failed. Original PlansApp: 2 passed / 7 failed. The directly changed enrollment-shortcut test was replaced and now passes; the other 12 failures remain unchanged. No repository checkout or working files were reverted. |
| `npm --prefix frontend run build` | **Passed** after all three tasks, including prototype removal. Existing >500kB bundle warning remains. |
| `git cat-file -e prototype/account-settings:frontend/src/prototypes/AccountSettingsPrototype.jsx` and corresponding stylesheet | **Passed**. Source remains on the prototype branch; selected C captures remain present. |
| `git diff --check 49e6d526..HEAD` | **Passed**. |

### HTTP and stored outcomes

- Update: PATCH `/v1/traveler-profile/sections` through authenticated cookie gateway saved trimmed `food_needs` and `accessibility_needs`; revision incremented once; GET matched the acknowledged response. A fresh SQL session confirmed the token-owned row and one private receipt.
- Replay: identical normalized request returned its saved response; changed replay returned `request_reused`; stale revision returned `revision_conflict`; neither changed the stored revision.
- Clear: both explicit empty strings persisted and were confirmed by GET. Unrelated home/citizenships, onboarding progress/completion and the existing Plan snapshot stayed equal.
- Create/read ownership: a valid isolated second identity created only its own profile with onboarding incomplete. The original identity still read `exists: false`; direct SQL confirmed no original-user row. Absent/invalid tokens and cross-origin writes were rejected.
- Invalid: supplied subject, boolean revision, unsupported section, unknown value field and >1000-character needs returned 422 `invalid_profile`, with no created profile.
- Test databases and identities are isolated pytest fixtures and are removed with their temporary directories. No account-delete operation was introduced.

### TDD evidence

Task 1 initially returned 404 for the missing section endpoint (7 HTTP tests failed as intended) and rendered My plans at `/account` (2 UI tests failed). Task 2 initially failed the dirty/theme/reconciliation/history behavior assertions. Both RED records passed `gsd-tools.cjs check tdd-red-evidence` before implementation. The GSD validator accepts Node TAP summaries only, so the records explicitly derive summary counts from Vitest's actual TAP-flat result lines; this is a format adapter, not a fabricated test run.

### Retained design and remaining evidence

Selected C before-state: [desktop light](../2026-10-05-account-prototypes/plan/c-light.png), [desktop dark](../2026-10-05-account-prototypes/plan/c-dark.png), [mobile light](../2026-10-05-account-prototypes/plan/c-light-mobile.png), [mobile dark](../2026-10-05-account-prototypes/plan/c-dark-mobile.png).

Production Chrome screenshots, local rebuilt-container source hashes, example-account save/reload/readback/restoration, selected Plan return, keyboard, console/network and desktop/mobile/theme inspection have **not run in 13-01**. They are assigned to 13-05 and remain an open delivery gate. Identity/security rows and remaining preference editors are intentionally completed by 13-02 through 13-04, not simulated here.

## Plan 13-02 — all travel preferences and canonical clears

All three implementation tasks are committed. Required production browser verification remains **unverified, pending 13-05**. No live map/provider availability is claimed. No shared-account preferences, credentials, email or factors were changed during these fixture runs.

### Executed checks

| Command | Observed result |
| --- | --- |
| `uv run --locked pytest services/auth/tests/test_account_profile.py -q` after task 1 | **8 passed**; home/citizenship save, clearing, catalog rejection, legacy preservation and read-back |
| Same command after task 2 | **9 passed**; interests policy/normalization/clear and onboarding minimum |
| `uv run --locked pytest services/auth/tests/test_account_profile.py services/agent/tests/test_agent_turn.py services/agent/tests/test_agentcore_memory.py -q` | **28 passed**, 1.81 seconds reported by pytest |
| Final regression: same command with `services/crud/tests/test_api.py` included | **55 passed**, 4.11 seconds reported by pytest; existing library deprecation warnings |
| `npm --prefix frontend test -- src/features/account/PreferenceSettings.test.jsx src/features/account/AccountSettingsPage.test.jsx` | **17 passed** after final validation-focus fix; 1.90 seconds reported by Vitest |
| `npm --prefix frontend run build` | **Passed**, 791ms reported by Vite; existing >500kB bundle warning retained |
| `git diff --check` | **Passed** |
| Three `gsd-tools.cjs check tdd-red-evidence ... --raw` calls | **RED_EVIDENCE_OK** for each task before its production changes. Raw pytest results retained; TAP counts/identities explicitly adapted from actual pytest summary because the validator only parses TAP. |

### HTTP, SQL and memory results

- Actual Auth and CRUD FastAPI handlers plus isolated SQLite database: home and citizenship PATCH responses returned 200, fresh GET and SQL reads matched; airport null and citizenship empty array persisted. New free text and removed legacy citizenship were rejected with 422 without mutation. Existing citizenship text stayed until explicitly removed. Home remained required; invalid airport was rejected.
- Interests: zero and one selection accepted; duplicate IDs and case-insensitive custom labels normalized; custom whitespace collapsed; explicit clear produced empty structured arrays and empty derived `travel_interests`. Invalid catalog ID, >80-character custom label, >20 custom interests and combined >1000-character text returned 422 with unchanged GET. Onboarding Continue still rejected zero and one interest. Unrelated section saves preserved legacy interest text.
- Existing unauthenticated/invalid-token/cross-origin/supplied-subject boundaries and SQL ownership test passed. Missing profiles returned the established `exists: false`; section writes created only the authenticated subject's row. No delete endpoint was changed.
- Eight populated/clear section writes on an incomplete profile each reached the real bounded AgentClient adapter. Captured transport payloads matched the canonical advisory allow-list plus `updated_at`; full home address, identity, onboarding and receipt metadata were absent. The adapter retained its 10-second timeout. Simulated timeout returned `memory_sync: unavailable` while the canonical SQL write and read-back remained successful; no onboarding reset/completion was introduced.
- Snapshot comparison across every existing non-profile SQL table remained equal before/after account writes, including a populated Plan, PlanningBrief and DestinationPin. The current schema has no Selected Option table; no future selection-schema persistence is claimed.
- AgentTurnService received canonical null, empty strings and empty arrays instead of stale populated memory at both old and matching timestamps. Confirmed brief context stayed unchanged. AgentCore replacement-memory tests confirmed explicit clears and privacy projection.
- An existing Agent test expected empty accessibility text to be omitted. Updated this directly related assertion to the established clear-preserving contract; Agent production code was unchanged.

### Component results and remaining gate

Home is the default; Save sends only its section, airport clearing stays local until Save, dirty Cancel preserves saved home, and validation failure preserves text and focuses the error. Citizenship removal, search/re-add and explicit clear work through the mobile selector. Interests support keyboard Add/remove, duplicate feedback, zero/singular/plural counts, 20-custom maximum and 60-character new input. Existing receipt reconciliation, revision conflicts, expiry, theme and navigation tests remain passing.

The shared home/map components gained optional account presentation props: account saves say Save changes, and legacy city-only homes can clear an airport without inventing a full street address. City/country validation remains required. Manual/catalog fallback and obsolete lookup cancellation are reused. These are component checks, **not** external map or Chrome passes.

The selected-C planning captures linked above remain the before-state evidence. No new production screenshots were captured in 13-02. Chrome authenticated save/reload, restore-only-test-changes, real maps/fallback, console/network, keyboard, dark/light and responsive inspections remain the explicit 13-05 delivery gate. The 12 previously recorded unrelated frontend failures remain unchanged and no full-suite pass is claimed. WINDOWS entry 4 now records preference completion while keeping later identity/security work open; entry 3 remains open for browser verification.

## Plan 13-03 — canonical identity and conditional email

See [13-03-verification.md](13-03-verification.md) for executed commands, real handler/encrypted SQL persistence checks, TDD evidence and isolated-provider limitations. Expanded backend run: 87 passed; final account/API/store regression after refresh serialization: 70 passed. Account components: 22 passed. Production build passed. Chrome and live email activation remain unverified; security controls continue in 13-04. No shared credentials, factors or cloud configuration were changed.

## Plan 13-04 — password, authenticator and recovery codes

See [13-04-verification.md](13-04-verification.md) for real HTTP/encrypted SQL checks, exact provider request shapes, all three TDD gates, concurrency/privacy assertions and live-operation limits. Final auth suite: **139 passed**; account UI suites: **30 passed**; production build passed. Required Chrome production screenshots and interactions remain **unverified pending 13-05**. Security row stubs are replaced; WINDOWS entry 3 retains the browser gate. No shared account credentials/factors or cloud configuration were changed.

## Plan 13-05 — executed database and regression checks

The disposable `travella_account_verify_1305` database was created in the existing local PostgreSQL container. The existing guarded fixture rejects the application database. A temporary localhost TCP forwarding process connects the host's locked pytest tooling to that database; credentials are loaded privately from container configuration and never printed. No application tables or volumes are cleaned by these tests.

- `uv run --locked pytest services/crud/tests/test_account_postgres.py -q` with guarded `TEST_DATABASE_URL`: **2 passed**. Concurrent first writes yield one 200 and one 409, one revision/receipt; identical-event concurrent replay returns the same canonical result with one increment. Foreign subject has separate data/receipts, and the original Plan snapshot is unchanged. Two independent PostgreSQL-backed Auth stores concurrently rotate recovery codes: exactly one disclosure, one durable receipt, old hashes invalid, new hash usable once, other subject untouched. Stored ciphertext and decrypted journals contain no recovery plaintext; foreign-session proof/receipt access is rejected.
- Full prescribed Python selection (account PostgreSQL, auth, CRUD, explicit Agent turn/memory tests): **203 passed, 2 failed, 1 error**. Existing PostgreSQL Plan deletion test expects removal without the now-required confirmation (409), migration test expects old head 0008 instead of 0009, and its environment handling makes the subsequent constraints test trip the database URL guard. Standalone constraints test additionally expects IntegrityError for PostgreSQL VARCHAR overflow, which actually raises DataError. These unchanged pre-phase tests remain debt; no full-suite pass is claimed.
- Full `npm --prefix frontend test`: **48 passed, 17 failed**, seven unhandled old `researchContext` mock errors. The previously recorded 12 AccountApp/PlansApp failures remain; four PlanConversation tests use the same stale mock and TripBrief expects the former inline confirmation behavior. Those additional five tests and their production sources are unchanged from pre-phase commit 49e6d526.
- `npm --prefix frontend run build`: **passed**, existing bundle size warning retained.
- After the live startup failure below was fixed, `uv run --locked pytest services/crud/tests/test_account_postgres.py services/auth/tests/test_session_store.py -q` against isolated PostgreSQL: **6 passed**. One intermediate run overlapped the app restart used by the TCP tunnel and returned 503; it was rerun only once the app was healthy.

Two execution fixes were necessary. The disposable fixture omitted `research_contexts`, leaving that table behind between tests; cleanup now includes it. More importantly, real example-account login returned 500 because the new reconciliation scan decrypted legacy sessions encrypted with a different key. A committed failing regression (`13-05-red.json`, RED_EVIDENCE_OK) proves this case. Reconciliation/account-record scans now ignore unreadable unrelated ciphertext without deleting or modifying it. Valid current-key sessions reconcile normally; targeted regression and live startup now pass. No encryption keys were changed.

The account concurrency additions are tests of already implemented behavior, so they passed on first valid execution; no artificial failing production behavior was introduced. The actual login regression followed RED → GREEN.

## Plan 13-05 — real Chrome delivery gate (2026-10-06)

**Passed.** Used the installed Chrome DevTools MCP server with its isolated headless Chrome profile via a local stdio bridge. The already-open default Chrome profile was left alone. This was the real application at `http://localhost:5174/account`, authenticated as the required example account with credentials read privately from its configured file. No alternate browser, screenshot-only substitute, cloud mutation or live identity/factor change was used.

### Build freshness and local readiness

The local skill's read-only AWS pool/client precheck passed. `bash scripts/start-local-ready.sh` rebuilt the checkout and exposed the mixed-key login defect recorded above. After the fix, the same command passed sign-in → session → temporary sign-out and reported the canonical localhost origin. Compose `ps -q app` identified the running container. SHA-256 comparisons matched all four representative files: `frontend/src/features/account/AccountSettingsPage.jsx`, `frontend/src/features/account/AccountSecurity.jsx`, `services/auth/session_store.py`, and `services/crud/profile.py`. Application volumes remained intact. The disposable PostgreSQL test database was dropped after the test run.

### Executed interactions and persistence

| Journey | Observed result |
|---|---|
| Direct authenticated `/account` and reload | Selected-C layout loads; Home base is default; canonical home map and airport render. Theme persists across reload and viewport changes. |
| Needs edit and dirty navigation | Temporary synthetic values entered through real controls. Keep editing retained the draft; Discard changes restored the saved values. Real Save acknowledged; HTTP canonical readback and page reload showed both temporary values. |
| Home, citizenship and interests | Optional airport cleared with Save and readback. Citizenship clear+Cancel retained saved citizenship, explicit empty Save persisted. Zero interests saved without the onboarding minimum. Home/interests clear+Cancel preserved originals. Needs clear persisted empty fields and was restored. |
| Pending/error/conflict | **Simulated transport only:** held one save response to inspect disabled controls, released 422 and observed retained draft/useful focus. Injected 409 displayed conflict review; Review latest details fetched canonical values without overwriting the draft. Screenshot explicitly documents this simulated conflict. |
| Unknown-result reconciliation | **Simulated response loss after a real server commit:** fetch completed the ordinary save then threw. UI showed uncertainty and disabled a new Save. Check saved details replayed the identical event and read current canonical state; saved synthetic value was confirmed. |
| Restoration and Plan isolation | Original preferences/Plan snapshots stored privately outside evidence. Before restoration, canonical profile exactly matched the last test result. Each of four restoration PATCHes carried a fresh event and current expected revision. All original profile fields and onboarding state matched afterward (revision/timestamp legitimately advanced). All five Plan and brief snapshots were exactly equal before/after preference edits. A later needs clear/restore used the same revision guard and rechecked original fields. |
| Existing Plan return/history | Opened an existing Plan through My plans, entered Account, returned to the same Plan, and used browser Back/Forward successfully. Normal Plan-open activity bookkeeping occurs; preference saves did not change Plan/brief snapshots. |
| Nine settings/security | Visited all nine rows. Canonical name, email and factor/recovery states loaded. Email correctly says unavailable. Only client password mismatch validation was submitted; focus moved to confirmation and zero sensitive HTTP writes were made. Cancel discarded the dummy form values. Provider success is established by isolated fixtures, not this shared-account journey. |
| Responsive/keyboard | 1440×1050 desktop and 390×844 mobile in both themes; every setting also selected at 320px without horizontal page overflow. Mobile selector contains three groups/nine options. Tab reaches editor controls. Native modal initially focuses Keep editing, excludes background controls, and Escape keeps the draft; Chromium may visit browser chrome between modal tab cycles. |
| Console/network | Inspected Chrome DevTools console and fetch/XHR requests. Final application console has no errors, only the existing Lit development-mode warning. Relevant canonical reads, ordinary saves/replays/restores and Plan requests returned 200. Injected 422/409/lost-response states are the simulated checks above. No raw auth payloads, private URLs, tokens or credentials were retained. |

### Inspected screenshots

All seven final files were opened with the image viewer after capture, not merely checked for existence. Text, focus indicators, contrast, button states and selected-C hierarchy are readable; no clipping or overlap was observed. Full-page images may exceed viewport height naturally. Mobile images use synthetic needs values; the email capture masks only the rendered email text, leaving tested server state unchanged. No original home address, personal needs, credentials or recovery secrets are included in the final captures.

- [Desktop light](implementation/account-desktop-light.png) and [desktop dark](implementation/account-desktop-dark.png): 1440px, saved synthetic preference summary.
- [Mobile light](implementation/account-mobile-light.png) and [mobile dark](implementation/account-mobile-dark.png): 390px, grouped selector and full summary/actions.
- [Real save and reload](implementation/account-save-reload.png): persisted synthetic values after reload.
- [Simulated dirty conflict](implementation/account-dirty-conflict.png): retained draft, focused explanation and explicit review action.
- [Live unavailable email capability](implementation/account-security-unavailable.png): safe unavailable state with email masked.

The pre-implementation [selected-C planning evidence](../2026-10-05-account-prototypes/verification.md) and prototype branch remain available. The plan's exact Python seven-file existence check also passed, after interaction and image review. The mandatory testing skill was re-read before completion. WINDOWS entry 3 is fixed; unrelated regression debt stays open.

### Honest limits

The current managed-identity pool does not enable safe email-before-update verification; live email change remains unavailable by design. Password, factor replacement, recovery rotation and successful email verification were not performed on the shared account. Their successful/error/ownership states are covered by actual HTTP handlers, encrypted SQL and isolated provider fixtures. Earlier signed-out recovery remains unverified and unchanged. Full broad Python/frontend suites are **not green** for the baseline failures documented above; account-specific checks, build, isolated concurrency and this required browser gate passed.
