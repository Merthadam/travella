# Activity-aware accommodation minimap — 2026-11-04

Outcome: selected A prototype refined and browser verified. Live agent/provider integration remains unimplemented; this is an explicitly simulated design preview.

## Setup

GSD quick task 261104-r2q. Followed Travella testing and existing prototype UI workflow; prior prototype choice remains in force. User accepted A as the direction below the initial accommodation search and requested map visibility for mentioned activities.

Existing Vite prototype server: `npm run prototype:stay-location --prefix frontend`, http://localhost:5201. Existing backend http://localhost:5174. Used authenticated example account via ignored credential file, without printing or recording password. Reused isolated Chrome DevTools MCP session, page 3. All browser checks and screenshots used Chrome DevTools tools. No Plan, provider or real agent writes were performed.

## Browser checks executed

- Four selected activities appear as numbered pins and named legend entries before any agent interaction.
- Clicking Museum of Fine Arts opens its exact name/category without changing draft or applied criteria.
- Simulated “Show mentioned activities on map” highlights Parliament and Gellért Baths in a distinct temporary layer. Both are initially outside the selected search; highlighting does not add them.
- Inspecting a mentioned activity leaves criteria unchanged. Hotel markers identify their exact fixture hotel; selecting a hotel while inspecting an activity shows a calculated, labeled straight-line distance.
- Explicit Include in location filter adds only a draft ID. Switching to Selected places shows the added pin. Explicit Apply updates the simulated search. Remove likewise changes only the draft until Apply.
- Unknown cruise meeting point remains in the name list, labeled unplotted, with an explanation on inspection. It gets no invented map position.
- Hide/Show hotels toggles only the map layer.
- A proposed search's activities can be previewed without applying the proposal.
- Mobile 390 × 844: minimap remains visible, no page/main horizontal overflow, named pins and details are operable; inspection does not change criteria.
- B retains six activity controls on its large map; C still renders the four-result comparison table.
- Reload clears temporary chat highlights and restores selected-place view.

All 22 scripted browser assertions passed via Chrome DevTools snapshot/click/fill/evaluate/emulate/wait tools. No new unit-test suite was added for throwaway prototype UI.

## Inspection and checks

- Inspected original screenshot and refined desktop, mention-layer and mobile screenshots. Replaced overlapping price labels on the small map with compact H markers and an explicit hotel-name/price detail so activity numbers remain readable. Full price pins are preserved in B/C.
- Detail screenshots were recaptured with the map scrolled clear of the floating prototype switcher.
- Final console: no application errors; pre-existing Lit development warning only.
- Final network: session, traveler-profile and Plan read requests HTTP 200. Map/agent-demo actions issue no provider/agent calls or Plan mutations.
- `npm run build --prefix frontend`: passed, with existing chunk-size advisory. Production output remains unchanged because the entire prototype is development-only.
- `git diff --check`: passed.
- Backend CRUD verification not applicable; no CRUD handlers or contracts changed.

## Evidence

- [Before A](plan/a-before.png)
- [Manual selected-place map](plan/a-activity-map-desktop.png)
- [Mentioned activities and hotel comparison](plan/a-mentioned-activities-desktop.png)
- [Desktop minimap detail](plan/minimap-detail-desktop.png)
- [Mobile preview](plan/a-mentioned-activities-mobile.png)
- [Mobile minimap detail](plan/minimap-detail-mobile.png)

## Production contract captured

A shared map is available to manual and agent journeys. Mentions must use server-validated place references and authorized coordinates, not guessed prose matches. Previewing an unsaved suggested activity is separate from saving it or making it a search constraint. Missing/stale references must be labeled/rejected; existing Plan confirmation and workspace revision rules continue to apply. These requirements were appended to the original IMPLEMENTATION-SPEC.md.
