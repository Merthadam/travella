# Travel studio onboarding verification

Executed 2026-10-05. Selected design: B. Scope: deterministic onboarding, canonical traveler profile saves, and existing memory projection. No automated tests or paid model calls were added/run.

## Environment and evidence

- Browser: Chrome DevTools, isolated context `phase12-production-verification`, canonical origin `http://localhost:5174`, authenticated example account.
- Real local stack: Docker Compose `travella-local-single`, PostgreSQL preserved. `travella-local` skill used for Cognito precheck and rebuild.
- `npm --prefix frontend run build`: PASS, 502 modules; existing main-bundle >500 kB warning remains. `git diff --check`: PASS.
- Real CRUD HTTP fixture: [53 passing observations](api-verification.md), including two identities, validation, concurrency, idempotency, explicit clears and legacy preservation. Fixture server/database removed afterward.
- [Approved prototype evidence](../2026-10-05-onboarding-prototypes/). The prototype entry and A/C implementations were removed from the production tree; retained in prototype commit history.

## Observed browser/API results

| Journey | Result |
| --- | --- |
| Initial login | Startup sign-in/session/sign-out check passed, then interactive browser login succeeded. |
| Home lookup | Live Google Budapest suggestion selected using ArrowDown/Enter; city country and five nearby airports rendered. BUD selected explicitly; PATCH200 and GET confirmed Budapest/BUD, revision1, home completed. |
| Airport catalog | Nearby results include cross-border airports; distances labeled approximate straight-line. Manual PRG search returned Václav Havel Airport Prague without airport-provider calls. |
| Required home | Continue disabled until city and country supplied. Manual Prague/CZ saved with source manual and null optional airport. |
| Save/resume | Reload after home resumed Citizenship with home retained and progress1/4. Needs save/readback retained earlier values. |
| Citizenship | Country search and add rendered Hungary/Austria passport cards and live preview. Subsequent retry journey saved Hungary and GET confirmed its code. Legacy free text remained visibly labeled for review. |
| Needs | Separate free-text needs saved and read back; Back displayed the saved text. |
| Interests | Four selections disabled completion; fifth custom interest enabled it; remove/restore toggled eligibility. Back retained the draft. Completion saved four IDs plus Rail journeys and navigated to Plans. |
| Completed routing | Reload stayed on Plans after completed_version2. Fresh sign-out/sign-in check has the separate limitation below. |
| Offline save | Deliberate offline PATCH failed with visible Retry and retained draft. Found/fixed existing background session-check bug: only401 signs out. Rerun including offline focus/session check kept draft; reconnection Retry returned200 and GET confirmed persisted citizenship. |
| Stale tab | Additional direct authenticated PATCH advanced revision. Stale UI Continue returned409, disabled further save and displayed explicit reload warning. Reload recovered the latest saved state and resumed Citizenship. |
| Legacy rollout | Synthetic legacy values temporarily seeded on the backed-up example profile. V2 opened despite old completion; ambiguous departure text was shown without guessing. Needs and citizenship prefilled, old interest prose displayed. |
| Skip | Skipped Citizenship, Needs and Interests; GET confirmed all skipped, v2 complete, legacy values unchanged; reached Plans with no structured interest selection. |
| Google unavailable | Offline loader produced city-search unavailable state and manual-entry action. Manual city path succeeded. Final loader recovery recheck recorded below. |
| Mobile | True390px emulation for needs/interests. Document scrollWidth390, no horizontal clipping. Mobile Continue and custom interest controls exercised. |
| Memory | Deterministic context/schema exercise retained structured values and explicit clears, excluded progress/revision. Actual profile mirror returned `synced` during legacy fixture and restoration. No paid conversation/model turn invoked. |

## Screenshots inspected

- [Home desktop](implementation/01-home-desktop.jpg)
- [Citizenship desktop](implementation/02-citizenship-desktop.jpg)
- [Needs desktop](implementation/03-needs-desktop.jpg)
- [Interests wide layout](implementation/04-interests-desktop.jpg)
- [Needs mobile](implementation/05-needs-mobile.jpg)
- [Offline error](implementation/06-offline-error.jpg)
- [Interests mobile](implementation/07-interests-mobile.jpg)

All feature screenshots were inspected for overflow, clipped controls and text. Wide interests screenshot used1440px with touch emulation retained to preserve the unsaved draft; mobile screenshots used390px. Fixture needs text is explicitly marked as verification data.

## Console/network

Observed auth/profile requests and profile PATCH200s; intentional offline failures and stale409 are explained above. No onboarding-agent endpoint was called. Initial unauthenticated session401 and Lit development warning are expected. Google loader timing optimization required a follow-up fix, documented below. Provider keys, cookies, raw auth responses and unrelated Plan data are excluded from evidence.

## Data restoration

Original example profile was backed up privately before mutation. After browser exercises its preference values and completion flag were restored and compared successfully. An authenticated empty PUT re-mirrored the restored canonical profile (`memory_sync: synced`); only revision/update timestamp advanced. Existing Plans, account credentials and database volumes were preserved. Private backup is untracked and excluded from commits.

## Limits and pending checks

- A second startup login check returned401 after rebuild, while the existing browser session continued to validate200. Read-only diagnosis confirmed matching Cognito configuration, enabled/confirmed account, valid client settings, JWKS200 and no material clock drift. The existing sign-in handler hides multiple provider/token failure causes behind401, so the exact cause is unknown. No password retry/reset was attempted, following `travella-local`. Fresh sign-in after the final rebuild remains unverified.
- Reduced-motion CSS was source-inspected; the OS/browser preference was not emulated. Full screen-reader and exhaustive keyboard coverage were not performed.
- Memory outage behavior and stale-mirror precedence were source-inspected and projections exercised, without inducing a live AWS outage. No paid model turn was used to verify later conversational behavior.
- PostgreSQL saves/readback and UI revision conflict were exercised; concurrent first-save race was exercised on SQLite, not PostgreSQL.
- Receipt eviction beyond64 events was source-inspected, not load exercised. Google stale-response timing and empty-result cases were not exhaustively induced.

## Final loader/build recheck

Final callback loader first-load check PASS: after fresh navigation, searching Prague returned five real suggestions without a lookup error. Initial ArrowUp selected the last option (`ts-city-option-4`); Enter resolved Praha, Slovakia with five nearby airports. This exercised disambiguation and the corrected keyboard path. No profile save was made during this check.

Final production build passed (502 modules, existing chunk-size warning); targeted Ruff and `git diff --check` passed. Container health was healthy; SHA-256 comparisons matched AccountApp, HomeStep, InterestsStep, onboarding stylesheet/flow, Places adapter, shared Google loader, profile schema and profile helper across final rebuilds. Final loader/schema/interest-file hashes were rechecked after their last changes.

Independent GSD source review identified and resolved the separate frontend Compose env-mount path and Unicode normalization mismatch. Final review status is clean. The final first-load loader path was exercised; offline loader Retry after this final patch was not completed. Earlier failure/manual fallback and direct adapter recovery were exercised. The separate multi-container Compose stack was source-reviewed but not started; canonical single-container stack was rebuilt.

The container remains running for user review. No further profile restoration is to be performed after the user begins testing. A final attempted offline check in the isolated context was abandoned when its captured element became stale; networking was immediately restored.
