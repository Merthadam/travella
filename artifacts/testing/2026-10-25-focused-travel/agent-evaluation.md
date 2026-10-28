# Focused-agent evaluation

Executed2026-10-26 using real Claude Agent SDK calls and LiteAPI sandbox through the private MCP transport. This is a bounded sample, not acceptance of every AI-SPEC case.

| Case | Observed evidence | Verdict |
| --- | --- | --- |
| Quiet apartment/private kitchen near selected BelémTower | Exact saved dates12–17May2027,2adults,1room,HU/EUR; apartment catalog used. Kitchen property description vs room guarantee and unknown noise were distinguished. No guest reviews were inspected in this sample. | Partial pass; guest-report quality still pending |
| Exact room vs cheaper property rate | Initial prose kitchenette734.60/cardloft663.21 mismatch discovered. Host now requires observed room_id and binds terms/total; deterministic reproduction passes. | Corrected; rebuilt live followup recorded below |
| Return timing/layovers/baggage | Direct802.94 vs KLM636.10 vs AirFrance633.98. Bothleg times and party total; directpersonalitemonly vs connectingcabinbag. Asked whether direct convenience justified cost. | Pass for sample |
| Fare verification | Direct fare rechecked, unchanged802.94; no reservation claim. | Unchanged-fare case passed; changed-fare livecase pending |
| Provider unavailable | Initial tool failures produced no invented prices and required deliberate retry. | Pass for sample; initial transient cause unknown |
| Shared accepted choice | Flight assistant used accepted Montebelo; explicitly lacked airport transfer evidence. No kitchen transcript injected into Flights. | Pass for sample |
| Rich refinement budget | Live secondsearch reached24KiB. Specialist budget corrected to96KiB with compact search evidence; deterministic3search regression passes. | Rebuilt live followup below |
| Readiness and ownership | Exact confirmed browser/API choices; shortlist research, preferredready/unbooked, removalresearch, changedpartyneeds_review. | Pass; not a booking |

Deterministic coverage additionally includes own-topic histories, current canonical dates/party, cross-topic tools denied, unobserved option/room references rejected, expired flight evidence removed, combined call/byte budgets, notes attribution/corrections after12turns, event reuse/conflicts, cancellation and stale source commit denial. Tests do not prove subjective recommendation quality.

Not executed as live-model cases: adversarial guestreview instructions, changed verified fare, ambiguousairport/childage clarifications, preference correction after12actualSDKturns, provider-disabled interface, all multi-tab/disconnect races. These remain pending; no blanket100% quality claim is made.

Final rebuilt live check: a fresh apartment-filtered search returned27properties. Lisbon Colours' exact “Apartment,1Bedroom,Without Lift Access,Kitchenette(1QueenBed)” was shown at734.60EUR in both prose and persisted comparison, with non-refundable/room-only terms and excludedtax warning. Montebelo1030.65EUR was the second card. No loft substitution occurred. The assistant explicitly left private-kitchen/noise evidence unknown and described this as research only. This closes the observed room-card mismatch. The new byte ceiling was present in the running service; this live turn used one filtered search, so three refinements remain deterministically tested rather than live-demonstrated.
