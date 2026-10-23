# Research cleanup implementation verification

Executed 2026-10-23 on `feat/research-cleanup-17`, isolated Compose project `travella-research17`, canonical origin http://localhost:5178. Desktop scope only. Existing main stack and other worktrees were preserved. Prototype branch remains at `fb44c0b`; implementation restored the tested production baseline `0812adc` before rebuilding this design.

## Evidence boundaries

Actual production React/A2UI, auth gateway and FastAPI CRUD handlers ran against local PostgreSQL. Chrome DevTools CLI authenticated the supplied example account; credentials/tokens were never stored in evidence. Test records were created only in the new isolated stack. Conversation prose/offer proposals were deterministic fixtures submitted through actual authenticated CRUD handlers with locally signed test tokens; these are not live model responses. Browser reads, brief edits, review, defer, confirmation and persistence were real.

For final No/Yes flight confirmation, the browser temporarily rejected only outbound `canvas_action` generation requests. This exercised receipt passthrough, existing canvas loading/error preservation and no-auto-save without paid calls. The wrapper was removed by navigation. Separate Agent → real CRUD integration tests invoked deterministic generation and proved receipt consumption and duplicate/restart behavior. Successful live model generation, provider quality, and normal live chat stop/retry/source quality were not tested here; Phase15's earlier acceptance gaps remain open.

## Executed automated checks

| Command/scope | Observed result |
| --- | --- |
| Vitest overlay, offer card/hook, conversation, generation review, PlanningCanvas, PlansApp, plansApi | 66 passed after recovery fix |
| pytest Agent offer/integration/turn/flight generation plus auth gateway integration | 89 passed |
| pytest CRUD offers/migrations/flight confirmation/lifecycle with isolated PostgreSQL test DB | 49 passed, zero skipped |
| Production frontend build | Passed; existing chunk-size advisory |
| Source whitespace check | Passed |
| Local startup/Cognito precheck and one temporary sign-in/session/sign-out | Passed |
| Running container SHA256 vs source (conversation, stylesheet, hook, CRUD offer/shared policy, agent service, auth proxy) | All seven matched after rebuild |

Logs: [frontend](implementation/frontend-tests.txt), [agent and gateway](implementation/integrated-tests.txt), [build](implementation/build.txt). Backend command/operation matrix: [.planning CRUD summary](../../../.planning/phases/17-research-phase-cleanup/17-CRUD-SUMMARY.md). Final policy checks: [PostgreSQL/API log](backend-policy-pytest.txt).

Known unrelated baseline failures remain: Agent `test_profile_memory_sync_uses_verified_identity_and_safe_status` expects an old profile shape (broad run119 pass/1 fail); TripBrief inline confirmation test expects an already-absent confirmation path (extra run17 pass/1 fail). Neither source nor test for TripBrief changed against0812adc. These are not represented as a fully green repository suite.

## Actual Chrome observations

| Journey | Observed outcome |
| --- | --- |
| Empty Research | Full-width stages; draft stage/review disabled; circle opens the real A2UI brief with specific missing-detail guidance |
| Real brief add/finalize Lisbon | Agent forwarded A2UI edit persisted; reload retained destination; destination alone remained ineligible |
| Useful context,3/6 complete | Current-destination preferences + flexible timing + travelers produced committed inline offer; budget, accommodation and flights stayed undecided |
| Keep researching | Real action persisted; acknowledgement survived reload, application rebuild and unrelated traveler edit; no repeated active offer |
| Manual review after defer | Brief still opened canonical review; deferral stayed persisted |
| Explicit later request fixture | Current full request recreated an available committed offer; message metadata readback matched |
| Frozen stale review | Concurrent traveler edit caused confirmation rejection; no generation was accepted |
| Recovery after stale review | Edit trip details loaded latest A2UI and readiness; review reopened with4 travelers without page reload |
| Flights unresolved | Confirm disabled until explicit Yes/No choice |
| No and Yes flights | Real context edit persisted; confirm returned receipt; exactly one receipt-bound generation attempt each; deliberately failed generation kept details, saved_at remained null |
| Pointer drag/open/close | Actual Chrome drag moved circle; transcript and composer DOMRects remained exactly equal; panel clamped inside viewport |
| Keyboard | Escape closed and restored trigger focus; arrow movement and Enter toggle worked |
| Desktop layouts | 1440x1000 dark and1280x800 light inspected; no panel clipping/horizontal overflow; scroll exposes lower action |
| Zoom accessibility |720x500 CSS viewport at2x DPR exercised the layout equivalent of200% desktop zoom; panel fit and scrolled. Native browser zoom shortcut was not separately tested |
| Locked context | Real matching run lease disabled composer/brief; test lease explicitly cancelled afterward |
| Existing canvas boundary | Current canvas layout preserved; confirmation hands to existing canvas, Save plan separate. Existing saved-canvas flows covered by targeted regression tests, not a new live provider run |

Screenshots inspected: [open](implementation/ready-open-desktop.png), [moved](implementation/moved-desktop.png), [light1280](implementation/light-open-1280.png), [zoom/scroll](implementation/zoom-equivalent-scroll.png), [inline offer](implementation/ready-inline-offer.png), [deferred reload](implementation/deferred-reloaded.png), [manual review](implementation/manual-review.png), [stale guard](implementation/stale-review-blocked.png), [fresh recovery](implementation/fresh-review-after-conflict.png), [locked](implementation/locked-research.png), [confirmed generation outage](implementation/confirmed-generation-error.png), [Yes flight review](implementation/flight-yes-review.png). Early screenshots predate the final full-width connector correction; final desktop screenshots are captured below.

[Network confirmation](implementation/network-confirmation.txt) and [Yes-flight requests](implementation/network-flight-yes.txt) show public offer actions200 and no automatic canvas PUT. The one real agent stream in confirmation is the A2UI flight edit shortcut, not model generation. Console had only the existing Lit development warning; no new application error in the final paths. Expected stale conflict and intentionally injected transport outage are documented separately.

## Integration fixes discovered during execution

- Gateway allowlist lacked new routes; added only public GET offer and POST actions, with real gateway→CRUD persistence coverage. Consume/run remain unavailable from the browser gateway.
- A readiness retry retained its old error; successful retry now clears it.
- Stale review cancellation retained old A2UI revision; return now reloads canonical context before enabling review.
- Progress connector and nested brief labels inherited awkward spacing; scoped CSS now spans the desktop and removes inherited48px label gaps.
- Initial local build applied an unfinished0011 before its nullable priority-scope column was added. Only the new isolated development database was reconciled with that exact additive column. Fresh upgrade/downgrade was separately tested against disposable PostgreSQL; no user database/volume was reset.

## Final code-review corrections

Independent GSD review reproduced and execution fixed five cases before delivery:

1. Generic activity questions counted as priorities. Readiness now requires an explicit preference assertion or explicitly edited interest field; questions and quoted/source reports do not qualify.
2. A model-selected positive substring could override a negative full traveler message. Full-message intent now wins, preserving durable deferral.
3. Identical repeated preferences changed invitation fingerprint through message IDs. Semantic categories now provide stable identity while message IDs still enforce provenance/ownership.
4. Partial generation routes bypassed initial confirmation. All generation routes now require canonical existing-draft authority or the valid initial full-generation receipt; missing authority fails closed.
5. Requiring an accepted receipt at the same revision blocked existing unsaved-draft regeneration after flight edits. Any prior accepted entry establishes an existing draft; new receipt consumption still binds the exact reviewed revision/fingerprint.

Commits68b98ec/370fcd2. Final tests89 Agent/gateway and49 CRUD passed. Reviewer independently retested reproductions;17-REVIEW.md is clean with zero open findings. No model calls.

## Remaining acceptance

User desktop design/UAT and authorized live-model quality evaluation remain pending. Deterministic English priority recognition is intentionally conservative and can miss unusual or non-English preferences. No deployment or merge was requested/performed. Mobile remains deferred by explicit user scope.

---

# Planning evidence (preserved)

Planning only, desktop 1440×1000. Example account authenticated via Chrome DevTools. Existing chosen floating brief prototype remains the visual source at commit 1c3e236; see ../2026-10-23-floating-brief/verification.md.

Added an ephemeral, labeled DOM sketch to the existing mock conversation to show the newly agreed inline offer. Click Review & create draft opened the existing mock review; cancel returned to the sketch. Keep researching replaced its buttons with acknowledgement. Saved and visually inspected both screenshots, then reloaded to remove the sketch. No production source changes or Plan writes. Console only existing Lit dev warning; inspected network had no failed requests.

[Inline offer sketch](plan/inline-offer-sketch.png) · [Deferred sketch](plan/deferred-offer-sketch.png)

Known visual detail: the mock circle comes close to Send when the extra offer grows the transcript. Production UI contract explicitly requires safe default placement away from controls. At planning time no production persistence/agent timing/offer generation had been tested. Mobile deferred per user direction.

## Final running preview

[Research cleanup preview](http://localhost:5178/plans/f717203b-6f46-4203-834e-ac9dd8f1e2e5) is a clearly named deterministic test Plan retained for user review. Regression test Plan was soft-deleted through the real lifecycle API; its data/volume was not destroyed. No other Plan was modified.

Final rebuilt source was hash-checked and the real preview reopened/reviewed with no new errors: [closed desktop](implementation/final-desktop-closed.png), [open overlay](implementation/final-desktop-open.png), [confirmation](implementation/final-desktop-review.png), [source matches](implementation/source-hashes.txt), [final network](implementation/network-final.txt), [console](implementation/console-final.txt). All three final screenshots were visually inspected. The UI source has no new mock routes; the unrelated pre-existing TravelCardsPrototype import is outside this phase.
