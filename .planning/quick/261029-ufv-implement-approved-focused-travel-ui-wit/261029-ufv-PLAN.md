---
mode: implementation-plan
status: completed
created: 2026-10-29
scope: production UI integration
---
# Focused travel navigation with editable trip defaults

## Outcome and approved design

Implement the approved direction D in the real Flights and Stays workspaces, combined with maple-cake's editable defaults. The existing Planning Canvas remains the main trip surface. Programmes stay there; maps remain available through the existing canvas/main chat. This plan does not add a programmes workspace or LangGraph node.

In either focused view, one top bar contains “← Back to canvas” on the left and the topic chat toggle on the right. Remove the Stays/Flights picker and the stacked application bar. Keep all current search fields and controls visible. Trip context and provider/test-inventory labels belong inside the workspace content. The chat starts open on desktop; collapsing it expands the results area, and reopening uses the same top toggle. On narrow screens the same toggle switches between the search/results pane and chat while the back link remains available.

Keep the production canvas's components, map, programmes, layout, editing, scroll restoration and main chat. The prototype's miniature canvas and Account placeholder are navigation examples only. Move the real Account menu to the bottom of the existing Plans drawer in the plan workspace. Plans navigation is available on the canvas/main Plan view; focused Flights/Stays use the back link to reach it. Preserve account access on the Plans list and account pages; do not remove their only account trigger.

## Sources and integration boundary

- Approved prototype: `prototype/travel-header-20261028`, source `8d2481c`, evidence `artifacts/testing/2026-10-29-focused-travel-header/verification.md`.
- Visual references: `artifacts/testing/2026-10-29-focused-travel-header/plan/flights-desktop.jpg`, `stays-desktop.jpg`, `flights-chat-collapsed.jpg`, and `plans-drawer-account-desktop.jpg`, plus mobile captures in the same directory.
- maple-cake feature: `6b77473` (`feat(travel): prefill editable city-wide search defaults`); recorded verification at `d6914b7`. It includes frontend profile propagation AND connector/agent validation for city-wide airport groups. Integrate the complete coherent change, not only its visible form code.
- maple-cake has unfinished destination-country work in `travelDefaults.js`, `travelDefaults.test.jsx`, and `useTravelWorkspace.js`; planning task `261029-u9c`. Treat this as an explicit follow-up dependency until its committed implementation and verification are available. Preserve the sibling worktree and its uncommitted edits.
- Observed local main is `c53745d`; prototype and maple-cake forked from `c1eba7d`. Refresh refs at execution time and record actual bases. This plan captures the inspected state, not a claim that these tips will stay current.

Execution authorized. Actual baseline: origin/main c1eba7d. Local main c53745d is an older divergent line; initial cherry-pick was aborted without edits. Integrate both verified defaults features: 6b77473 and d5ee569. Implementation branch: feat/focused-travel-integration.

## 1. Establish the production baseline

Create a clean implementation branch from the current agreed main, leaving the full prototype branch as a design source. Check whether the maple-cake feature or equivalent has already landed. If absent, integrate `6b77473` with its tests and backend route-validation changes; avoid importing prototype routes, fixture data, switchers or global prototype CSS. Keep the current auth-to-workspace `travelerProfile` propagation when adapting headers.

Before integrating destination-country work, recheck maple-cake's HEAD/status and its verification record. Integrate its finished commit if ready. If it remains unfinished, proceed with the verified defaults and navigation work, and explicitly retain destination-country prefilling as pending rather than copying the working tree or reporting it complete.

Done: a recorded baseline with one copy of the defaults implementation, no prototype dependencies, and no modified sibling-worktree files.

## 2. Compose one top bar without moving domain state

Affected files: `frontend/src/PlansApp.jsx`, `frontend/src/components/AppHeader.jsx`, `frontend/src/features/plans/components/PlanningCanvas.jsx`, and their existing styles.

Provide one header host at the plan-shell level, with scoped content from the currently active workspace. The canvas/main Plan view supplies its normal navigation. A focused travel workspace supplies back and chat controls. Use a small scoped header-content contract/slot; search results, auth/profile data, conversations and recovery state stay with their existing owners. Ensure inactive mounted workspaces cannot replace the active header and clear scoped content on navigation/unmount/Plan changes.

Remove the old `travel-navigation` mode picker. Move provider honesty labels into the search/results content without weakening sandbox, stale-result, truncation or unavailable-state wording. Avoid changing form structure or hiding secondary fields. Keep the existing account and checkout page headers working in their own contexts.

“Back to canvas” uses the existing stop/switching safeguards. Preserve `stopTravel`, registered stop handlers, disabled/busy feedback, history unwinding and return focus. Cover both direct canvas entry and results imported from main chat: the named destination is the main canvas, without losing the main-chat history or imported result references. Unavailable recovered results still offer the back action. Preserve browser Back/Forward behavior and checkout deep links.

Done: exactly one shell top bar in Flights/Stays, with no Plans picker, no Stays/Flights tabs and no second global header. Canvas navigation and deep-link recovery still work.

## 3. Connect the real chat controls and retain workspace state

Affected files: `TravelWorkspace.jsx`, `TravelConversation.jsx`, `travel-workspace.css`, and shared chat controls only if needed.

Keep `chatOpen`, the narrow-screen pane, and `openChat`/`closeChat` owned by each `TravelWorkspace`. Render its toggle through the shared top-bar slot. Remove duplicate collapse buttons/mobile navigation/reopen rails for focused travel once the top toggle provides the same functions. Preserve a visible replying indication and the ability to reopen the composer and stop an active reply. Collapsing chat changes presentation; it does not discard messages or stop a reply. Returning to the canvas retains existing stop semantics.

Keep visited Flights/Stays mounted with their stable Plan/mode keys. Preserve draft criteria, current results, shortlist/comparison context, form values and unsent chat while visiting canvas or the other focused view. Preserve existing stored recovery semantics across reload; do not introduce persistence for unsent messages just for this UI change. “Discuss this option” still opens the relevant chat and focuses its composer.

Use topic-specific accessible labels, `aria-expanded`, stable `aria-controls`, keyboard operation and focus return to the top toggle. Hidden panes must be absent from focus and accessibility navigation. On a narrow viewport, reopening chat must actually reveal its pane, rather than leaving it far below the search form.

Done: collapse/reopen, Discuss, canvas return, and Flights ↔ Canvas ↔ Stays preserve the proper state and target the correct conversation.

## 4. Put Account at the bottom of the Plans drawer

Affected files: `PlanDrawers.jsx`, `PlansApp.jsx`, `AccountMenu.jsx`, `account-menu.css`, and drawer styles.

Reuse the real AccountMenu callbacks and keyboard behavior, with a drawer-appropriate trigger and menu opening upward. Put it in a fixed footer outside the scrolling plan list. Keep All plans, search, create, rename/delete and pagination reachable. Respect drawer action locks, busy state, Escape ordering, focus trapping/return and the existing dirty-canvas/sign-out protections. Open account settings using the existing account navigation behavior rather than a fixture dialog.

Remove the duplicate top-right account trigger only from Plan workspace contexts where drawer access exists. Keep the established account/settings pages and Plans list entry points. Within focused travel, Account is reached by returning to canvas and opening Plans.

Done: Account is reachable with keyboard/touch, stays visible while scrolling a long plan list, and account navigation/sign-out preserve existing guards.

## 5. Preserve maple-cake's search behavior

Reference modules: `travelDefaults.js`, `useTravelWorkspace.js`, `TravelSearch.jsx`, `TravelWorkspace.jsx`, profile propagation in `AccountApp.jsx`/`PlansApp.jsx`/`PlanningCanvas.jsx`, and the feature's connector/agent files.

- Start Flights with profile home-city departure, Plan destination and supported city-wide airport selection where unambiguous. Retain the existing Plan dates/traveler handling and support choosing a specific airport.
- Residence comes from home country. Guest nationality comes from saved citizenship with the implemented fallback. Changing departure must not silently change residence.
- Suggestions remain editable; no default triggers a rate search or a durable Plan/profile mutation. Preserve manually cleared/edited fields against late defaults.
- Imported snapshots, applied searches, recovered edited drafts, ownership changes and Plan changes retain the existing guards. Missing/ambiguous lookups stay editable and unselected; invent no country or airport code.
- Keep supplier-confirmed city membership through connector AND agent route validation. A MIL search can return valid MXP/LIN/BGY itinerary endpoints, while a specific-airport request stays specific.
- Destination country for Stays is distinct from nationality/residence. When the follow-up commit is ready, Milan may default to Italy while guest nationality remains the traveler's saved citizenship. Include its failed/ambiguous/late-geocoder and manual-edit checks.

Done: the navigation cleanup reduces navigation clutter while maple-cake reduces repeated typing; neither overwrites traveler intent.

## 6. Verification and delivery gates

Read `docs/skills/travella-testing/SKILL.md` before implementation and delivery. Start/rebuild using `.agents/skills/travella-local/SKILL.md`, preserving database volumes and canonical origin. Verify auth and representative source hashes from the actual implementation checkout.

Use the existing focused test suites, adding regression cases for changed behavior rather than CSS details:

- `PlanningCanvas.test.jsx`, `PlanDrawers.test.jsx`, `TravelWorkspace.test.jsx`, `TravelConversation.test.jsx`, `CanvasTravelJourney.test.jsx`, `AccountMenu.test.jsx`, `PlansApp.test.jsx`, and `AccountApp.test.jsx`.
- `travelDefaults.test.jsx`/`TravelSearch.test.jsx` after integrating maple-cake, including manual clearing/late defaults, recovered drafts and city-wide selections.
- `FlightCheckout.test.jsx` and `SandboxCheckout.test.jsx` for navigation boundaries; checkout redesign is out of scope.
- maple-cake connector/agent suites for any imported or conflict-resolved city-validation code: `services/mcps/tests/test_liteapi.py`, `services/agent/tests/test_travel_registry.py`, `services/agent/tests/test_canvas_travel.py`.
- Production frontend build and `git diff --check`.

Chrome DevTools with the supplied example account is a delivery gate. Use isolated test Plans; keep credentials out of screenshots/reports. Execute and record:

| Journey | Required observed outcome |
|---|---|
| Existing canvas → Flights/Stays → canvas | Existing canvas/map/programmes preserved; one top bar; correct scroll/focus return |
| Fresh defaulted flight form → edit origin → search | Editable defaults; no auto-search; request uses edited origin and city-wide destination; genuine sandbox results or accurately reported provider failure |
| Collapse/reopen chat; Discuss an option | Correct topic/pane/composer focus, no draft loss or extra navigation strip |
| Leave/reopen focused views and reload | Draft/result recovery follows existing rules; manually edited defaults are not reset; no cross-Plan leakage |
| Main-chat result → focused view → canvas; expired recovered result | Imported snapshot stays consistent; stale/unavailable state honest; back works with history |
| Active reply → back; disabled/failed stop | Existing interruption contract preserved; obsolete output cannot surface as current |
| Plans drawer with many plans → Account → return | Footer reachable; menu opens within viewport; locks/dirty-state/focus preserved |
| Checkout entry/back/recovery | Existing eligible-option checkout boundary, selected offer and status wording unchanged |
| Desktop/narrow, light/dark, keyboard | No clipping/overlap; top toggle usable; hidden panes not focusable; working focus return |

Check console/network failures. For a live active-reply smoke test requiring a new paid model call, follow existing authorization; otherwise use the existing streaming integration harness and explicitly mark the live scenario unverified. Provider failures are not successful search verification. If CRUD handlers change unexpectedly, add the mandated HTTP persistence/ownership checks before delivery.

Save production evidence under `artifacts/testing/<execution-date>-focused-travel-integration/`: approved D screenshots plus maple-cake's defaulted-form screenshot in `plan/`, actual browser captures in `implementation/`, and `verification.md` with executed outcomes, source commits and remaining limitations. Reuse historical evidence as design context only, not as proof the integrated code works.

Deliver only after applicable checks pass. Report destination-country dependency status explicitly. Preserve prototype branch as the design source; production contains only the chosen implementation. This work does not close unrelated phase acceptance gaps.
