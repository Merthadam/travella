# Session-scoped workspace recovery and lifecycle verification

Source through `6ea7341`, 2026-10-27. Execution authorized under plan18-11; parent owns integrated runtime and browser evidence. This record covers executed automated checks, not a claim that browser delivery gates are complete.

## Executed checks

| Check | Observed result |
| --- | --- |
| `npm --prefix frontend test -- src/features/plans/canvasViewState.test.js src/AccountApp.test.jsx src/features/plans/travel/TravelWorkspace.test.jsx src/features/plans/travel/TravelConversation.test.jsx src/features/plans/travel/TravelSearch.test.jsx src/features/plans/travel/SearchSelect.test.jsx` | 6 files, 118 passed. |
| `npm --prefix frontend test -- src/features/plans/travel/TravelWorkspace.test.jsx src/features/plans/travel/TravelConversation.test.jsx` | 67 passed after task03 source changes. |
| `uv run --locked pytest -q services/agent/tests/test_travel_workspace_journey.py services/agent/tests/test_travel_registry.py --tb=short` | 23 passed after task02. Actual graph, authorized registry and CRUD/store integration, not fabricated browser results. |
| `uv run --locked pytest -q services/agent/tests/test_travel_workspace_journey.py services/agent/tests/test_travel_registry.py services/auth/tests/test_api.py -k 'not onboarding_and_profile_proxies_keep_identity_server_side' services/auth/tests/test_session_store.py services/auth/tests/test_account_security.py --tb=short` | Final scoped run: 90 passed, 1 deliberately deselected known baseline failure. This is **not** a full auth-suite pass. |
| `git diff --check` | Passed. |
| `node /Users/adammerth/.codex/gsd-core/bin/gsd-tools.cjs check tdd-red-evidence artifacts/testing/2026-10-27-workspace-recovery/red-0N.json` for N=1,2,3 | All RED evidence accepted before corresponding GREEN implementation. Records retain actual commands and normalized named assertion failures. |

## Actual authentication HTTP and persistence checks

`services/auth/tests/test_api.py` exercises FastAPI TestClient with the actual encrypted SQLite SessionStore. Provider/token verification is isolated at the external identity boundary. No production account or credential was copied into evidence.

- `test_recovery_scope_is_random_session_partition_stable_on_refresh_and_rotated_on_login`: sign-in creates scope; GET /auth/session returns it; decrypted stored session readback matches. Repeated GET and successful refresh retain it. New sign-in rotates it. Response excludes known fixture cookie, token, email and subject. Supplying the public scope as the authentication cookie returns401. Sign-out followed by GET returns401 without scope.
- `test_existing_session_get_backfills_recovery_scope_once_without_extending_lifetime`: removes the fixture scope from an actual existing stored payload, calls GET, reads the new value back from storage, repeats GET, and verifies original session expiry is unchanged.
- `test_expired_session_does_not_reveal_recovery_scope`: advances fixture time past access expiry; GET returns401 with only `refresh_required` state. No new recovery namespace is exposed.
- Existing SessionStore/account-security regressions cover encrypted persistence, expiry/deletion and account-session invalidation. No new table, authorization path or identity resource was added. Public scope is a random storage partition only, never an authorization credential.

## Browser storage and concurrency observations from component tests

Actual sessionStorage JSON is inspected for strict version/owner/Plan/topic validation, byte limit32KiB, combined60-entry retention, and absence of inventory, checkout handles, run authority or Undo. Invalid nested shapes and foreign namespaces are rejected. Storage failure retains usable in-memory state. Plan forget and account exit clear travel children.

AccountApp tests exercise401 followed by a new sign-in, and authenticated200 with a changed server scope. Old private content is unmounted before the next profile resolves. Same-scope refresh retains recovery. Hook tests restore only draft/view/references, create a new instance, and resolve evidence through the authorized registry GET. Expired/foreign results are discarded with Search again; no supplier search runs automatically. Previous details remain quiet until explicit Reopen previous details.

Deferred-event tests cover previous-scope history401, topic changes during cancellation, failed Stop after commit, saved-brief changes, manual filter/sort/dismiss/compare precedence, duplicate/stale batches and manual fetch supersession. Committed conversation history may refresh without replaying an obsolete workspace batch. Existing shared server leases remain authoritative for durable choices.

Focus tests defer a real conversation reply, type into a separate manual input, then complete the reply and assert focus/value stay there. Result count has one live status despite top/bottom pagination. Manual dismissal focuses the next card. Comparison tests retain airport-local times and differing overnight dates, correct stop grammar, exact room totals and distinct room references at one property. Deferred room registry responses cannot reopen comparison after manual filter, inactive scope or explicit close.

## Known baseline failure

Initial complete auth command:

`uv run --locked pytest -q services/auth/tests/test_api.py services/auth/tests/test_session_store.py services/auth/tests/test_account_security.py --tb=short`

Observed66 passed,1 failed at that point. `test_onboarding_and_profile_proxies_keep_identity_server_side` expects200 from the obsolete `/v1/agent/onboarding/events` route; actual404. The later final scoped run deliberately deselected this same unchanged assertion; no test was skipped or weakened in source and the obsolete endpoint was not restored.

Exact baseline proof command (read-only baseline source loaded into the test process, no checkout changes):

```sh
uv run --locked python -c "import subprocess,sys,types,pytest;source=subprocess.check_output(['git','show','78d4d6d:services/auth/api.py'],text=True);m=types.ModuleType('services.auth.api');m.__package__='services.auth';sys.modules['services.auth.api']=m;exec(compile(source,'services/auth/api.py@78d4d6d','exec'),m.__dict__);raise SystemExit(pytest.main(['-q','services/auth/tests/test_api.py::test_onboarding_and_profile_proxies_keep_identity_server_side','--tb=short']))"
```

The baseline also failed with expected200/actual404. Parent retains the full broad-regression result separately (699 passed,6 skipped,1 known baseline failure), rather than treating the scoped run as broad success.

## Runtime delivery gate

Parent is running final build and authenticated Chrome DevTools checks after source freeze. Required desktop/mobile390px, light/dark,200% zoom, keyboard, collapsed chat, reload/expiry and screenshot/console/network inspection remain incomplete in this executor record. Integrated evidence belongs under `artifacts/testing/2026-10-27-shared-travel-workspace/`; existing visual plan evidence is under `artifacts/testing/2026-10-27-shared-travel-planning/plan/`. No screenshots or live outcomes are invented here. Parent owns final18-12 acceptance and shared defect/state registers.
