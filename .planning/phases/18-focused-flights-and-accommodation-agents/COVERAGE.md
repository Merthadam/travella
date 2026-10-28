# Phase18 source and coverage audit

Status: COVERED for planning, not execution or acceptance. Current authority is18-CONTEXT.md D18-01–D18-10,18-WORKSPACE-SPEC.md and current18-UI-SPEC.md; technical detail is18-WORKSPACE-RESEARCH.md. Historical18-01–18-05 remain preserved. No source item is silently omitted. Planned tests/evidence are not reported as executed. See18-WORKSPACE-PLAN-INDEX.md for waves.

## Four-source audit

| Source | ID/item | Owning plan(s) | Status / evidence target |
| --- | --- | --- | --- |
| GOAL | Suitable accommodation/return flights inside existing trip, separate persistent discussions and compact saved brief | Historical01–05;06–12 | COVERED; main manual/assisted journeys with grounded provider facts |
| GOAL | Shared manual-first workspace correction with explicit exact unbooked choice | 06,07,08,09,10,11,12 | COVERED; full current WORKSPACE-SPEC and final runtime matrix |
| REQ | FOCUS-01 distinct topic histories/session scope | Historical01,03;06,11,12 | COVERED; recovery/navigation regression |
| REQ | FOCUS-02 current bounded saved brief/source versions | Historical01,04;07,11,12 | COVERED; private input and source-digest invalidation |
| REQ | FOCUS-03 bounded grounded accommodation research | Historical02;08,12 | COVERED; actual tool/worker and bounded live cases |
| REQ | FOCUS-04 bounded return-flight research/inspection | Historical03;08,09,12 | COVERED; carrier/fare evidence and live cases |
| REQ | FOCUS-05 primary manual workspace and separate sidechat | Historical01–03;06,07,10,12 | COVERED; manual-only flow and shared final effect |
| REQ | FOCUS-06 invalidation/Stop/idempotency/tabs | Historical01,04,05;06,07,08,11,12 | COVERED; deterministic deferred-event matrix and browser |
| REQ | FOCUS-07 shortlist/preferred/ready/review transitions | Historical04;10,12 | COVERED; exact review/confirmation/HTTP readback |
| REQ | FOCUS-08 capability/freshness/unknown/grounding | Historical02,03,05;09,10,12 | COVERED; card/comparison evidence and live labels |
| REQ | FOCUS-09 authorization/lifecycle/tool/privacy boundary | Historical01,04,05;07,08,11,12 | COVERED; cross-scope, checkpoint, account cleanup and existing lifecycle regression |
| REQ | FOCUS-10 attributed notes/corrections/bounds | Historical04;08,12 | COVERED; current instruction precedence and older-note regression |
| REQ | FOCUS-11 shared temporary manual state/precedence | 06,08,10,11,12 | COVERED; one reducer, draft/applied distinction and manual controls |
| REQ | FOCUS-12 bounded automatic host-validated batches | 07,08,12 | COVERED; post-commit projection, guards/idempotency and Undo |
| REQ | FOCUS-13 main comparison and exact manual choice | 10,12 | COVERED;2–3 references, draft preservation, model/history-independent review |
| REQ | FOCUS-14 observed carrier/source/scope facts | 09,10,12 | COVERED; full normalizer/schema/UI chain and observed live logos |
| REQ | FOCUS-15 recovery and accessible responsive flow | 11,12 | COVERED; bounded references,401 cleanup, keyboard/mobile/theme/zoom |
| REQ | FOCUS-16 actual integrated evidence/honest acceptance | 12 | COVERED; separate fixture/HTTP/browser/live/UAT verdicts |
| CONTEXT | D18-01 topic substages, histories and saved context | 06,07,11,12 | COVERED |
| CONTEXT | D18-02 primary manually complete shared frontend | 06,10,12 | COVERED |
| CONTEXT | D18-03 automatic bounded shared effects, no duplicate browser/import | 07,08,10,12 | COVERED |
| CONTEXT | D18-04 manual precedence, reversible dismissal, hard constraints | 06,07,08,11,12 | COVERED |
| CONTEXT | D18-05 factual2–3 comparison/structured discussion/preserved draft | 08,10,12 | COVERED |
| CONTEXT | D18-06 details/compare choose exact room/return fare, unbooked ready | 10,12 | COVERED |
| CONTEXT | D18-07 actual carrier logos/names/mixed fallback | 09,12 | COVERED |
| CONTEXT | D18-08 source/time/total scope/sandbox/expiry/unknowns | 06,09,10,12 | COVERED |
| CONTEXT | D18-09 Canvas dock/mobile/focus/drafts/Stop/Undo | 06,08,10,11,12 | COVERED |
| CONTEXT | D18-10 planning only, no auto-execution/booking expansion/acceptance | All follow-up objectives; index;12 | COVERED as workflow boundary, not implementation work |
| RESEARCH | One controller; normalized registry remains authority | 06,07 | COVERED; no second store/service/table |
| RESEARCH | Strict optional context and exact full references; instance/revision are concurrency only | 06,07,10 | COVERED; Pydantic/browser schemas and token-derived ownership |
| RESEARCH | Draft/applied distinction; dirty draft denies agent mutation; controls usable during cancellation | 06,07,08,11 | COVERED |
| RESEARCH | One final host batch after signed completion, matching input digest, no arbitrary patches | 07,08 | COVERED; real CRUD begin/complete and host envelope |
| RESEARCH | Request-local input/output; specialist graph projection seam; no parent checkpoint inventory | 07 | COVERED; explicit collector/reset and checkpoint assertions |
| RESEARCH | AgentResponse/SSE/terminal/plansApi/direct/runtime strict projection parity | 07,12 | COVERED; auth/runtime tests plus mounted batch journey |
| RESEARCH | Existing scoped search/inspection;10 total/3 rates/6 inspections,96KiB and deadline | 08,12 | COVERED; tool registration and invocation tests |
| RESEARCH | Bounded local operation count, typed view vocabulary and no supplier work for view edits | 08 | COVERED;12-local-action ceiling |
| RESEARCH | Current ordered comparison; provider ID versus durable evidence ID; exact room/rate | 08,10 | COVERED |
| RESEARCH | Stop/commit-wins, duplicate delivery, navigation and source-version races | 07,11,12 | COVERED |
| RESEARCH | One in-memory guarded Undo, original times and no durable mutation | 08,11 | COVERED |
| RESEARCH | Detached details retain original evidence; new inventory not silently merged | 06,08,10,11 | COVERED |
| RESEARCH | Tab recovery allowlists, owner/session/Plan/topic scope, expiry/restart and separate tabs | 11 | COVERED; includes concrete AccountApp401 cleanup |
| RESEARCH | Supplier marketing/operating identity/logo survives all strict boundaries | 09 | COVERED; observed safe URL, named/error/mixed fallback; no guessed vendor |
| RESEARCH | Historical cards/import supersession and General Trip compatibility | 06,10 | COVERED |
| RESEARCH | Deterministic model-free exact review + existing challenge/commit | 10 | COVERED; true active lease waits, history/model failures do not gate |
| RESEARCH | Current dependencies/runtime unchanged; no installs/services/schema changes | All plans | COVERED; no package install task |
| RESEARCH | Actual HTTP/database, Chrome example account, bounded live quality and redacted evidence | 12 | COVERED; prior Phase15/17/18 acceptance retained |
| RESEARCH | ASVS1, typed authorization, concurrency, safe image and logging threats | All plan threat models | COVERED; high severity blocking |

Historical migrations/lifecycle implementation stays in01–05, with regression coverage where affected. Deferred ideas and out-of-scope features below are exclusions, not unplanned requirements.

## Explicit WORKSPACE-SPEC edge coverage

| Edge | Plan(s) | Deterministic and runtime evidence target |
| --- | --- | --- |
| Manual form edit while agent searches | 06,07,11,12 | TravelWorkspace deferred completion; typed unsubmitted values/old applied criteria preserved |
| Manual search while agent searches | 06,07,11,12 | Search enabled during delayed/failed cancellation; newest generation wins |
| Sort/dismiss/compare during turn | 08,10,11,12 | Revision revoke; scroll does not revoke |
| Stop/topic switch/Plan switch | 07,11,12 | Run/epoch/owner/topic/instance/brief guards; no replay |
| Provider failure/empty results | 06,07,12 | Prior time/evidence kept on failure; empty success keeps constraints/recovery |
| Compare unavailable/expired evidence | 10,11,12 | Main facts usable; stale confirmation blocked; deliberate retry/search |
| Different dates/party/currency | 09,10,12 | Explicit incomparable scope rather than like-for-like price ranking |
| Exact room versus cheapest property price | 08,10,12 | Full reference, deterministic review, real CRUD readback |
| Dismiss saved option | 08,10,12 | Visibility/Undo only; zero choice mutation/readiness change |
| Missing/broken/mixed carrier logos | 09,12 | Normalizer/schema/component cases plus real observed supported image |
| Mobile/chat collapsed/keyboard | 10,11,12 | Complete main flow, mounted state/draft, independent scroll/composer and focus |
| Cross-owner/Plan/topic/forged references | 07,08,10,11,12 | Server denial before lookup; actual HTTP boundary tests |
| Reload/registry expiry/restart | 11,12 | Authorized reference resolution, no automatic supplier request/replay; durable history/choice survives |

## Current UI Considerations

| Consideration | Owning plan(s) | Acceptance proof |
| --- | --- | --- |
| Manual completion | 06,10,12 | Chat closed/failed through exact confirmed choice |
| Shared view | 06,07,08,12 | Identical applied criteria/order/visibility/identity |
| User precedence | 06,07,11,12 | Typed unsubmitted input and new filters survive late effect |
| Quiet assistant | 07,08,10,12 | No import click, mobile pane/focus/scroll takeover or draft replacement |
| Logo fallback | 09,12 | Readable name/leg/mixed identity with missing/error image |
| Reversible narrowing | 08,12 | Dismiss/Undo leaves saved records untouched |
| Mobile and zoom | 11,12 |390px,200% zoom, Browse default, persistent draft/composer and readable comparison |

## Prohibition coverage

Structured plan prohibitions use status resolved to mean their formulation and verification assignment are resolved; execution remains unverified. Python/Vitest checks are not mislabeled as Node-test enforcement descriptors.

| Prohibition | Required property | Plans |
| --- | --- | --- |
| Chat-only primary search | Entire manual journey works with chat closed/unavailable | 06,10,11,12 |
| Uncontrolled agent updates | Only validated current scope/version/run/source batch applies | 06,07,08,11 |
| Hidden durable changes | Exact explicit existing CRUD confirmation required | 08,10,12 |
| Fabricated identity/source | Observed carrier/source/room/price facts and safe links | 08,09,10,12 |
| Unbounded autonomy | Existing provider/evidence/deadline plus local-operation bounds; no background loop | 08,11,12 |
| False verification | Sketch is planning-only; production/live/UAT claims require actual evidence | Index,12,VALIDATION |

## Approved API/tool coverage and justified opt-outs

This is a correction of the existing integration, not a full LiteAPI implementation. Public manual requests continue through the authenticated Agent travel route; specialist tool names below are the current host allowlist. No Connector service exposure to the browser is added.

| capability | decision | reason |
| --- | --- | --- |
| Provider capabilities | INTEGRATE | travel_capabilities — 06,08,12; unavailable mode hidden, honest errors |
| Stay destination search | INTEGRATE | search_destinations — 06,08,12; existing bounded lookup |
| Hotel-type/facility catalogs | INTEGRATE | get_stay_filter_catalog — 06,08,12; actual IDs and all/any semantics |
| Stay rates/search | INTEGRATE | search_stays; hotels/search — 06,07,08,12; primary manual and bounded agent search |
| Property details | INTEGRATE | get_stay_details — 08,10,12; observed properties only |
| Guest reviews | INTEGRATE | get_stay_reviews — 08,10,12; untrusted evidence, no instruction authority |
| Exact room rates | INTEGRATE | get_stay_rates — 08,10,12; exact scope/room terms and confirmation |
| Airport lookup | INTEGRATE | search_airports — 06,08,12; clarify ambiguous origin/route |
| Return-flight rates | INTEGRATE | search_flights; flights/search — 06,07,08,09,12; complete party/return scope |
| Fare inspection | INTEGRATE | verify_flight_offer — 08,10,12; observed fare changes, no hold |
| Normalized observation recovery | INTEGRATE | research/snapshot — 06,07,10,11,12; authorized scoped registry only |
| Local workspace operations | INTEGRATE | update_workspace_view (internal SDK tool) — 08; no new public provider endpoint or provider call |
| Exact unbooked choice | INTEGRATE | Existing intent review + prepareTravelChoice/commitTravelChoice — 10,12; model-free host review and explicit CRUD confirmation |
| Documented airline/logo fields | INTEGRATE | Existing flights-rates response marketingCode/marketingLogo/operatingCode/operatingLogo — 09,12; metadata enrichment only |
| Airline directory decoration calls | OPT-OUT | Observed flight segment already supplies approved metadata; no extra endpoint/tool/budget expansion |
| Native SDK filesystem session resume/fork | OPT-OUT | Application-owned topic history and disposable workers are locked |
| Flexible-date matrix, room Q&A, exhaustive multi-provider inventory, routing-minute estimates | OPT-OUT | Outside agreed one-destination/return-flight research correction; no invented coverage/distances |
| Booking/payment/reservation, loyalty/admin, generated full-provider MCP catalog | OPT-OUT | Explicitly excluded by scope and tool authority; existing unrelated sandbox checkout remains separate |
| New service/database/search-document/dependency | OPT-OUT | Existing controller/registry/graph/CRUD contracts support scope; no installation/migration tasks |

## Planning verification status

All rows above have explicit owners. Runtime acceptance is pending. The current session only authors/reviews planning artifacts and the parent's inspected static sketch evidence; it does not run application tests, model/provider calls, deployment or user UAT. No SOURCE MISSING item remains.
