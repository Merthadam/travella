# Phase 14 implementation research — standalone UI only

2026-10-06. Latest scope correction supersedes the earlier connected-canvas draft.

## Current foundation
`frontend/src/features/plans/components/A2uiTripBrief.jsx` already uses Catalog, MessageProcessor, A2uiSurface and createBinderlessComponentImplementation, with Zod props and bound data. `frontend/package.json` pins @a2ui/react and @a2ui/web_core 0.12.0 and source imports v0_9. Reuse those APIs, without importing Trip Brief's production state/actions.

`frontend/src/features/plans/prototypes/TravelCardsPrototype.jsx` and its CSS provide the accepted compact navigation-container pattern and isolated sample-data interactions. They are reference material; do not copy the whole throwaway prototype into production or merge its branch wholesale.

Existing `frontend/src/lib/googleMaps.js` and onboarding map show later integration anchors. Do not call them in this disconnected component phase. Backend research context, Claude SDK and AG-UI paths were inspected during initial scope discovery; they require no changes now.

## Primary documentation
- [A2UI catalogs](https://a2ui.org/concepts/catalogs/): a custom local catalog declares the renderable types and props. Implement the seven Travella types locally.
- [A2UI v0.9 protocol](https://github.com/a2ui-project/a2ui/blob/main/specification/v0_9/docs/a2ui_protocol.md): separate component and data messages enable fixture-driven creation and updates. Match installed v0.9; don't accidentally adopt current v0.9.1/v1 syntax.
- [AG-UI events](https://docs.ag-ui.com/concepts/events): future transport can deliver state/custom events. No AG-UI integration is needed to design and exercise standalone A2UI rendering.
- [Google place ids](https://developers.google.com/maps/documentation/javascript/place-id): future map data should use resolved place identities. Current preview needs a typed adapter and fixture visual states only.
- [LiteAPI flights access](https://docs.liteapi.travel/docs/getting-access-to-flights) and [hotel rates](https://docs.liteapi.travel/reference/post_hotels-rates): later integration references, not this phase's implementation scope.

## Recommended pattern
Pure React components receive validated props and emit callbacks. Thin binder components adapt A2UI data context to those props. A standalone development gallery owns fixture data, simulated event sequences and local action state. This separates reusable design from future orchestration/persistence.

Do not install CopilotKit, add an LLM layout step, define a new agent flow, or connect providers. A2UI is the actual renderer for the gallery, not a decorative label applied to static JSX.

## Pitfalls and mitigations
- Static showcase only: require simulated create and update through MessageProcessor.
- Hidden backend coupling: pure modules have no auth/API/state imports; no outbound requests from preview.
- Fake live data: persistent sample banner and schematic map label; no verified/researched claims.
- Monolithic dashboard component: seven independent schemas, renderers and isolated cases.
- Overdesigned scope: preview browsing shells only; deeper provider exploration comes later.
- Version drift: compile against installed packages; no dependency upgrades.

## Validation
Plan review plus a rendered desktop/mobile planning sketch now. Future execution uses Chrome DevTools to exercise local fixtures and screenshots, inspect network/console, and run the frontend build. No tests or paid calls are added/run unless requested.

## Google colored markers — verified 2026-10-06
[Google Advanced Marker customization](https://developers.google.com/maps/documentation/javascript/advanced-markers/basic-customization) documents background/border/glyph colors, scale and titles using AdvancedMarkerElement and PinElement. [HTML/CSS markers](https://developers.google.com/maps/documentation/javascript/advanced-markers/html-markers) support richer marker presentation. This confirms the proposed category-pin design is feasible later; it does not change this phase's disconnected scope.
