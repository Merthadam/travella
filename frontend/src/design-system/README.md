# Travella component studio

Standalone planning components for design review. No account, agent, provider, backend or persistence connection.

## Open the studio

From the repository root:

```sh
npm --prefix frontend run dev:components
```

Visit **http://localhost:5177/**. This starts its own Vite entry, with no backend proxy. Port conflicts fail clearly rather than silently changing the address.

Build the standalone preview with `npm --prefix frontend run build:components`. The normal application does not import this folder.

## Review workflow

- **Canvas overview:** inspect the combined layout.
- **Component navigation:** inspect one of the seven types independently.
- **State selector:** populated, empty, loading, error, missing details, long text, many pins and busy/locked.
- **Simulate generation:** real A2UI messages create seven sample components progressively; no inference.
- **Mobile width:** narrow the preview; also use actual browser device emulation for full mobile navigation.
- **Mark reviewed:** session-only marker for your own review. Export review notes to keep a local JSON record. This does not imply a release or server approval.
- **A2UI inspector:** inspect actual renderer messages/local action log; try a rejected payload.
- **Reset samples:** restore fixture data. Refresh clears edits and review markers.

Map pins can be added, inspected, filtered, edited and removed. The map is a schematic fixture adapter, explicitly labeled. Pin positions are illustrative; a future Google Maps adapter receives the same place data and selection callback. Categories have stable colors/icons. More than eight sample markers remain accessible through the place list.

Flights and Accommodation open separate preview shells. Websites/source clicks are recorded locally and display the URL; they do not open or fetch a real page.

## Folder structure

```
design-system/
  index.js             public pure-component exports
  tokens.css           reusable visual tokens
  components.css       reusable component styles
  schemas.js           strict data schemas, catalog metadata and pin categories
  components/          seven UI components and shared primitives
  a2ui/
    catalog.jsx        local v0.9 catalog, data bindings and validated projector
    CanvasSurface.jsx  MessageProcessor lifecycle and last-valid rendering
  preview/
    ComponentGallery.jsx   local sample state, review controls and event log
    MapFixtureAdapter.jsx  schematic map; no provider SDK
    fixtures.js            synthetic data and design states
    studio.css             gallery-only shell styling
    index.html, main.jsx   independent development entry
```

## Reuse contract

Import tokens.css and components.css plus the required component from index.js. Components accept validated `data`, an `onAction(name, payload)` callback and `disabled` where relevant. They never save, fetch or call a model themselves. Validate data with the corresponding schema from schemas.js before using pure components directly.

To render declaratively, use the catalog and CanvasSurface. `projectCanvas(data, visibleIds, create)` validates the whole bounded payload and generates createSurface/updateComponents/updateDataModel. Stable singleton ids and exact binding paths prevent arbitrary component or path injection. The root ChildList carries explicit reference metadata required by @a2ui/web_core0.12.0. Server transport/authorization/evidence validation are not implemented here.

Map adapter interface: `{ places, selectedId, onSelect }`. All actual Google Maps keys, live place resolution, clustering and state persistence belong to a later integration phase. No map/provider dependencies were added.

## Boundaries

This is a design-system starting point, not a claim that production components are connected. The card summaries are independent fixtures; editing Essentials does not synchronize Flights. Later integration should supply coherent shared domain data. Do not import the preview app or fixtures into production.
