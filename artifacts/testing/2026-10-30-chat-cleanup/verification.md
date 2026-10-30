# Agent chat frontend cleanup — 30 October 2026

Source commit: `dbc705b`. Current design preserved. User approved removing every item in the preceding audit and previously declined prototypes.

## Removed

- Unimported `TravelSuggestions.jsx` and its compact suggestion/compare styles; unused suggestion jump, heading and filter styles.
- Uncalled non-streaming frontend `plansApi.agentTurn` and its obsolete PlansApp mock. Migrated session, CSRF marker, no-bearer-token and request-body assertions to the real streaming API test.
- Unused `PlanConversation.onBack` prop.
- Unused research variant of `PlanStages`, its caller flag and `.plan-stages` CSS. The live canvas stage markup is unchanged; research uses `ResearchProgress`.
- Retired conversation drawer and controls, canvas-entry controls and composer-hint CSS, including dark-theme branches. Kept active drawer selectors and travel details/actions.

62 complete CSS rules removed, plus dead selector branches. Source diff: 13 additions / 119 deletions across 12 files. Source searches find no remaining removed component/helper/class identifiers. No server endpoint changes.

## Automated verification

Executed in `frontend/`:

```sh
NODE_OPTIONS=--no-experimental-webstorage npm test -- src/plansApi.test.js src/PlansApp.test.jsx src/features/plans/components/PlanConversation.test.jsx src/features/plans/components/PlanningCanvas.test.jsx src/features/plans/components/ResearchBriefOverlay.test.jsx src/features/plans/components/ResearchDraftOffer.test.jsx src/features/plans/travel/TravelConversation.test.jsx src/features/plans/travel/ResearchFlights.test.jsx src/features/plans/travel/CanvasTravelJourney.test.jsx src/features/plans/travel/TravelWorkspace.test.jsx
npm run build
```

158 passed, 12 existing fixture-dependent tests skipped. The skips require external Python SSE fixtures (`TRAVELLA_CANVAS_SSE_FIXTURE` and research flight fixture); they are not represented as passed. Nine test files passed, one skipped. Production build passed (604 modules). CSS 226.05 kB, main JS 1,152.89 kB; existing large-chunk warning remains. `git diff --check` passed.

## Chrome DevTools verification

Isolated Chrome DevTools MCP session through the installed MCP server. Source Vite preview at `http://localhost:5200`, proxying the existing local backend on port 8003. Authenticated with the configured example account; no credentials or session material saved in artifacts.

Created a dedicated test Plan `ceca0df8-f96e-4e21-8516-6498ae3f8a39`. No pre-existing Plan was modified.

- Captured before and after research empty state at 1440×1000 and 390×844, trip brief overlay and filtered drawer. All four screenshot pairs are **byte-identical**, including desktop/mobile research, brief and drawer. Open/close, filtering and Escape worked.
- Typed multiline research input with Shift+Enter on mobile; no horizontal overflow. Submitted one real research message, received a completed assistant reply, reloaded and confirmed one user and one assistant message remained.
- Set destination and flight/stay needs on the test Plan through the production streaming trip-context API. Reload confirmed context persistence. Selected the existing canvas tab preference directly for this test, without generating a briefing or provider results.
- Canvas stage shows Research complete / Canvas current. Canvas chat collapse/expand and composer worked.
- Opened Flights and Accommodation from the canvas. Both topic histories loaded, starter prompts populated their composers, collapse/open controls and return-to-canvas worked. Repeated prompt/composer checks on mobile and captured both chats without clipping or horizontal overflow.
- Inspected console and network: no errors, only the Lit development-mode warning. Captured local API calls returned 200, including streaming context update, chat histories, travel capabilities and airport lookups. See [console](console-check.txt) and [network](network-check.txt).
- Deleted only the test-created Plan through the normal challenge/commit API; fetching it in the deleted view confirmed `lifecycle: deleted` (normal seven-day recovery).

Screenshots were visually inspected. No clipping, overlap or unreadable controls in the affected chat layouts. Full-page canvas screenshot preserves the scrollable viewport and its unavailable-map fallback.

## Evidence

| State | Before | After |
|---|---|---|
| Research desktop | [Before](plan/research-desktop-before.png) | [After](implementation/research-desktop-after.png) |
| Research mobile | [Before](plan/research-mobile-before.png) | [After](implementation/research-mobile-after.png) |
| Brief overlay | [Before](plan/brief-desktop-before.png) | [After](implementation/brief-desktop-after.png) |
| Drawer empty search | [Before](plan/drawer-desktop-before.png) | [After](implementation/drawer-desktop-after.png) |
| Canvas stage | — | [After](implementation/canvas-desktop-after.png) |
| Flight chat | — | [Desktop](implementation/flight-chat-desktop-after.png), [Mobile](implementation/flight-chat-mobile-after.png) |
| Stay chat | — | [Desktop](implementation/stay-chat-desktop-after.png), [Mobile](implementation/stay-chat-mobile-after.png) |

## Limits

The source preview has no configured Google Maps key, so the canvas correctly showed its map-unavailable fallback. Map/provider search, bookings and full briefing generation were not tested; this cleanup changes none of those paths. Only research chat sent a live model request; canvas and specialist chat controls were checked in the browser and their behavior covered by existing tests. No deployment or push. Task-owned preview and isolated browser stopped after verification; shared Docker services left running.
