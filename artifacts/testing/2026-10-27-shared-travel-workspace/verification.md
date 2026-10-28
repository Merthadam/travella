# Shared travel workspace — verification

Status: implemented and available for traveler review; remaining technical and acceptance limits are listed below. User authorization superseded the planning-only boundary after commit `608da14`. Traveler acceptance remains pending.

## Environment

- Checkout: `locrian-peacock`; local app: http://localhost:5174. The GSD isolation resolver selected sequential execution in this shared checkout. Other checkouts and database volumes were preserved.
- Mandatory testing and local-start skills applied. Read-only Cognito discovery passed; no AWS resources were changed. Rebuild command: `bash scripts/start-local-ready.sh`. Every tested rebuild passed health and example-account authentication checks.
- Authenticated Chrome DevTools MCP, isolated context `shared-workspace-20261027`, supplied example account. No credentials, tokens or raw provider payloads are recorded here.
- Test-owned Plan: `81a99feb-80d7-4514-9326-b0a7ddc5643e`, “Shared workspace verification · Lisbon”; dates 12–17 May 2027, two adults. Initial saved Canvas revision 3. Only this Plan may be cleaned up.
- Planning evidence: [layout sketch and inspected captures](../2026-10-27-shared-travel-planning/verification.md). These are planning evidence, not runtime proof.

## Automated evidence

Per-plan summaries record exact targeted commands and RED/GREEN commits. Current/prior regression command is retained in [python-command.json](python-command.json).

| Slice | Actual result |
| --- | --- |
| 18-06 | 46 frontend passed; one conditional Canvas fixture skip; 11 API/proxy passed |
| 18-07 | 42 frontend and 80 Python passed; actual graph/Agent/CRUD handlers, SQL readback and checkpoint projection exercised |
| 18-08 | 73 frontend and 264 adjacent Python checks passed, including actual SSE bridge |
| 18-09 | Provider normalization, schemas, catalog labels, carrier image/fallback checks; see 18-09 summary |
| 18-10 | 81 frontend, 25 actual HTTP/database, 8 Canvas SSE and 18 Research checks passed |
| 18-11 | Recovery/authentication/race/accessibility implementation and evidence complete; see18-11-SUMMARY.md and remaining native/browser limits below |
| Combined current/prior Python regression | 705 passed, 6 skipped, 1 failed in 50.94 seconds; 37 test files |

The one combined failure is `services/auth/tests/test_api.py::test_onboarding_and_profile_proxies_keep_identity_server_side`: an obsolete `/v1/agent/onboarding/events` assertion expects 200 but receives 404. The same assertion was independently reproduced against `78d4d6d` auth source before recovery changes. No assertion was weakened or skipped. The six isolated-PostgreSQL skips are enumerated below. Prior PostgreSQL migration evidence is retained; this work introduces no schema migration.

Procedural disclosure: 18-07 failing tests and RED commits preceded GREEN implementation, but its RED evidence normalizer was not run before GREEN. The 18-09 backend RED checker was also persisted late. TDD mode is disabled; actual test outcomes remain as recorded. Later slices ran their RED checker before GREEN.

## Authenticated browser and persistence

### Manual search and filtering

At the 18-06 rebuild, checkout/container hashes matched the controller, workspace and search files. With chat collapsed, actual BUD–LIS return-flight search returned 88 results (POST 200 and authorized registry GET 200). Direct-both-ways plus lowest-total sort narrowed 88 to 1 without another browser supplier-search request.

Manual Stays returned 28 properties. Selecting the actual Apartments catalog entry (ID 201) returned 27 properties. Later UI displays the catalog label rather than its ID. [Flight capture](implementation/manual-flight-step06.png) and [stay capture](implementation/manual-stays-step06.png) were inspected for readability and overlap.

DevTools network emulation made only the test page offline. Failed manual refresh retained the same results and original observation time, with an explicit retry notice. Online networking was restored. This is a controlled browser failure case, not a claimed provider outage.

### Carrier identity

At the 18-09 rebuild, carrier/search/backend hashes matched the running container. A fresh actual search returned 56 offers. Nuitée Air, Lufthansa, Austrian and Brussels images loaded with nonzero natural width from observed `assets.nuitee.flights` URLs; the mixed Lufthansa/Austrian fare displayed both marks. [Inspected carrier capture](implementation/live-carriers-step09.png). Missing/error image fallbacks have deterministic coverage; final browser fault check pending.

### Shared agent operation and Undo

Runtime `6745718`: a real focused SDK turn was asked to use current flight results, filter direct both ways and sort by lowest total, with no new search or saved choice. The host-completed batch visibly changed 56 results to 1, checked Direct and selected price sorting. Undo restored 56, original ordering and the original observed/expiry times (22:01:40 / 22:11:40). [Inspected Undo capture](implementation/workspace-undo-step08.png).

The browser resource count remained one manual flight search. This does not establish the server's exact tool-call count; safe server logs did not expose those metrics. Manual Dismiss/Restore changed visibility only. A new composer draft was lost during this intermediate runtime; 18-10 adds the regression fix, with the final browser rerun passed (new composer draft and date-field focus preserved).

A second live turn received a dirty departure draft (13 May versus applied 12 May). The worker declined to change the view until those edits were submitted/discarded. Typed date, provider order and 56 results remained unchanged. Missing checked-bag evidence was correctly described as unknown.

### Flight comparison and choice with history unavailable

Runtime `78d4d6d`, verified against container hashes. Chrome intercepted only this Plan's Flights topic-history GET with 503; all other API calls remained real. Manual search with chat collapsed returned 54 offers.

Selected three results; a fourth was disabled. Main comparison stayed usable while its discussion failed locally, without opening chat. [Inspected comparison](implementation/flight-comparison.png). Choosing Nuitée Air showed [explicit unbooked confirmation](implementation/flight-confirmation.png).

Actual HTTP readback after explicit actions:

| Action | Persisted outcome |
| --- | --- |
| Confirm Nuitée Air EUR 802.94 return-party total | Revision 4; ready; preferred fare matched; shortlist 1 |
| Replace with Lufthansa/Austrian EUR 680.62 | Revision 5; ready; preferred fare matched; shortlist 2 |
| Remove preferred choice | Revision 6; researching; no preferred option; original shortlist item retained |
| Dismiss the saved Nuitée result | Revision still 6; shortlist still 1; Undo restored temporary visibility |

The fault interceptor was removed. No booking or payment endpoint was called.

### Exact accommodation room

Runtime `78d4d6d`: manual Apartments search returned 27 properties. LSA Restauradores by Numa details/rates returned 20 room offers. Selected the second room, Studio (1 Queen Bed), EUR 710.09, rather than the property minimum EUR 669.35. Confirmation displayed its exact room, non-refundable terms, excluded city tax and unbooked boundary. [Inspected exact-room confirmation](implementation/stay-exact-room-confirmation.png).

Actual HTTP 200 readback: revision 7; ready; shortlist 1; preferred reference includes `room_id`; price label EUR 710.09 stay total; `unbooked=true`. A room comparison showed an unavailable/search-again notice and retained the old results. Later fresh-evidence reproduction identified a client metadata parsing mismatch; the earlier failure must not be attributed to expiry.

The first live Stays SDK sample interrupted with safe error code `ValueError`; it did not change the saved room choice. Backend diagnosis is in progress. This is not counted as a model-quality pass.

## Final validation matrix

The dated final sections below record the rebuild, responsive/focus/recovery checks, review findings and per-edge verdicts; they supersede intermediate execution status. Prior Phase 15/17/18 acceptance and full live-quality gaps remain open.

## Resumed checks — 28 October 2026

Runtime6ea7341 was healthy and hashes matched Search, Workspace, recovery store, auth API and specialist diagnostics. Reauthenticated privately after the overnight session expired. Saved exact-room choice remained ready and unbooked after reopening.

Fresh manual stay search returned28properties. Recovery stored one1,182-byte record with only the version/owner/Plan/topic, draft/applied criteria, search ID, view and detail reference whitelist. Reload and reopen restored28results and12–17May dates through one authorized registry GET and **zero** browser hotel-search calls. Saved choice remained ready.

Final frontend regression before review fixes:21files,228passed,12conditional fixture skips; actual SSE fixture tests also executed via the Python bridge suites. Production build passed, with the existing large-chunk warning. Reviewer discovered three exact-room/manual-review integration defects; follow-up RED/GREEN fixes and renewed verification are tracked in18-REVIEW.md and the28October integration evidence.

### Final runtime and UI checks

Final sourcefe3c78c rebuilt through local-ready; health/authentication passed and Search/Workspace/worker/prompt container hashes matched. Rebuild interrupted the isolated page session; reauthentication cleared all prior recovery records before the new session mounted. Other Docker stacks and volumes remained intact.

At390×844, Browse is the default and the light-theme form has no horizontal page overflow. [Inspected Browse](implementation/mobile-browse-light.png). One-tap Chat, Browse, Chat preserved an unsent draft; composer rectangle remained692.5–740.5 within844px height, with no page overflow. [Inspected Chat](implementation/mobile-chat-light.png). Theme change used the app's real storage-event handler in the isolated context.

Fresh room comparison revealed a fourth integration defect: manual registry snapshots have empty draft_facts while the Canvas schema requires five fields. Actual registry response200 failed client parsing, despite fresh exact-room evidence. A focused normalization fix and regression are in progress.

Native zoom shortcuts in headless Chrome did not change innerWidth/devicePixelRatio/visualViewport.scale; native200% zoom is not claimed passed.

## Edge-case verdicts

“Deterministic pass” denotes executed component/actual HTTP/database coverage, not live-model quality or a browser race simulation.

| Required edge | Executed verdict and evidence | Remaining scope |
| --- | --- | --- |
| Manual form edit while agent searches | Deferred completion tests pass; live dirty-draft sampleC preserves the new date and refuses mutation | Browser mid-search timing race not repeated |
| Manual search while agent searches | Generation/cancel-failure tests pass; main manual search works with failed chat | Deliberately timed concurrent live search pending |
| Sort/dismiss/compare during turn | Revision/final-batch tests pass; real local view/Undo and saved-option dismissal pass | Full live timing combinations pending |
| Stop/topic/Plan switch | Deferred epoch, cancellation, commit-wins tests pass; real topic navigation exercised | Cross-tab commit-wins/network-loss browser matrix pending |
| Provider failure/empty | Actual offline refresh retains results/time; empty-success fixture passes | Real supplier empty/outage not induced |
| Unavailable/expired comparison | Strict expiry/reference tests pass; parser defect caught and fixed separately | Passed after4a283d0: restart notice/no auto search and fresh two-room comparison |
| Different dates/party/currency | Actual comparison component incompatibility tests pass | Native browser mixed-scope sample pending |
| Exact room versus cheapest property | Actual EUR710.09 choice persisted over EUR669.35 minimum; actual worker/CRUD two-rate comparison tests pass | Passed: two same-property exact rooms displayed and discussed |
| Dismiss saved option | Actual revision6/shortlist1 unchanged; Undo restores visibility | Passed |
| Missing/broken/mixed logos | Actual observed logo images and mixed identity loaded; unsafe/missing/error component tests pass | Browser image-error injection not repeated |
| Mobile/chat closed/keyboard | Actual390px Browse/Chat, retained draft, visible composer, no horizontal overflow; manual choice with history503; keyboard catalogs/focus pass | Native200% zoom blocked by headless shortcut behavior |
| Forged/cross-owner/Plan/topic references | Actual HTTP/registry/CRUD denial tests pass before reference use | Additional browser identity not provisioned |
| Reload/expiry/restart | Actual reload restores28results through one registry GET, zero automatic supplier searches; new session clears old recovery | Passed: restart unavailable notice preserves dates/choice, zero automatic supplier searches |

## UI consideration verdicts

| Consideration | Verdict |
| --- | --- |
| Manual completion | Passed in actual Flights and exact-room Stays, including failed history |
| Shared view | Actual flight filter and stay sort host batches/Undo passed |
| User precedence | Deferred races and actual dirty-form refusal passed |
| Quiet assistant | Final new draft and date-field focus survived actual reply; mobile pane toggle preserved draft |
| Logo fallback | Deterministic fallback passed; actual supported images/mixed carriers loaded |
| Reversible narrowing | Actual dismissal/Undo leaves saved shortlist/revision unchanged |
| Mobile and zoom |390px light Browse/Chat inspected; desktop dark prior captures inspected; native200% remains unverified |

## Automated result at final source

- Python current/prior regression:705passed,6skipped,1known baseline onboarding404failure in50.94s. The six skips require an isolated TEST_DATABASE_URL: two account PostgreSQL tests, three migration tests and one research-offer PostgreSQL test. No migration/schema change was introduced; earlier PostgreSQL evidence is retained.
- Frontend prior/current regression and build are recorded in the final summary after the parser correction. Conditional standalone SSE fixture skips are exercised by the actual Python→React bridge suites, which were included in the Python run.
- Safe diagnostic and exact-rate backend tests passed; no arbitrary provider/model exception text is logged.
- Static schema gate passed; codebase-drift check is advisory-skipped because STRUCTURE.md is absent. UI static gate passed, but it does not replace the browser evidence.

Full AI-SPEC quality coverage and traveler suitability acceptance remain pending. The initial Stays ValueError is not causally explained; a bounded retry succeeded. No deployment, merge, push, booking or payment was performed.

### Final exact-room browser pass

Runtime4a283d0 rebuilt successfully; CanvasTravel, Search and Workspace hashes matched the container. After the server restart, reopening showed “Previous results are no longer available. Search again” with dates retained, preferred choice still ready, and zero automatic supplier searches. A fresh explicit search returned28stays.

Opened Meliá Lisboa Aeroporto details and compared Double, Standard and Twin, Standard from two actual rate observations. Both exact offers appeared side by side at EUR943.54, with the same excluded EUR40.26 city tax and cancellation penalties. [Inspected comparison](implementation/two-room-comparison.png). An ordinary composer message sent structured discussion context with2references,2distinct room IDs and no raw inventory. The actual SDK correctly described the two rooms, matching totals/terms and unknown bed/amenity details; it did not search or alter the saved choice. Readback retained revision7/ready/preferredEUR710.09 and2distinct room references in comparison.

Choosing the second comparison offer opened the exact Twin, Standard confirmation with its own observation time and replacement warning. [Inspected review](implementation/exact-room-review-final.png). Clicked Keep researching; no new durable choice was confirmed. The notice above comparison is subsequently clarified byfeb7ecd to “Separate search observation” because a room-rate lookup can be newer than the main search.64focused tests passed after this wording-only correction; final image reflects the immediately preceding wording.

Console review: existing Lit development warning and Google Maps listener warning, plus the expected409from the restart/expired registry recovery case. Successful search, details, exact comparison and review requests were real. No new application exception was observed.

Final frontend suite:236passed,12conditional fixture skips across21files. After final parser changes, actual Python→React bridge suites were rerun:215passed in21.31s. Production build passed with the known large-chunk warning. No new production migration or dependency was added. The isolated verification Plan is retained for review; no unrelated Plan data was modified or removed.


## Final runtime handoff — source feb7ecd

`npm --prefix frontend run build` passed in1.29s with the existing large-chunk warning. `bash scripts/start-local-ready.sh` rebuilt the canonical stack and passed health plus example-account authentication. Compose-resolved app-container SHA-256 comparisons matched TravelComparison.jsx, TravelWorkspace.jsx, useTravelWorkspace.js and CanvasTravel.jsx. The isolated browser reopened the test Plan authenticated and opened Accommodation. The stack remains running at http://localhost:5174.

The final dedicated goal verifier reported no new defect in its bounded source inspection but was interrupted before writing a report after an extended run.18-VERIFICATION.md records the orchestrator's requirement reconciliation and this limit; independent exhaustive verification is not claimed.
