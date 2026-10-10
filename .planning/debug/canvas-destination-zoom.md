---
status: resolved
trigger: "small thing on generate plan we would want the map sort of zoomed in on state destination"
created: 2026-10-10
updated: 2026-10-10
---

## Symptoms and evidence
Generated canvas remains at world view despite a stated destination. Existing trip context has one candidate, Milan, and an empty finalDestination. Both canvas mappings intentionally use only the final destination. Map framing also marks a result framed even when its container is hidden, where fitBounds cannot take effect.

## Current focus
Use a single context candidate as a transient map-view hint, without selecting or persisting a destination. Use the chosen destination when present. Defer framing until the map has dimensions; preserve deliberate user pan/zoom and theme-switch behavior.

## Acceptance
- Generate/open a plan with a single stated destination: provider viewport frames it automatically.
- No inferred final destination or saved pins; multiple candidates remain unchosen.
- Hidden/mobile map frames when visible; stale geocoding cannot override newer destinations.
- Existing explored viewport survives appearance changes.
- Focused tests, example-user Chrome DevTools verification, screenshots and rebuilt local app.

## Resolution
Added a transient single-candidate map hint, provider city/region boundary framing and deferred fitBounds for hidden map containers. No destination is silently selected or persisted. Existing explored zoom survives appearance changes. Verified actual Generate plan and hidden-mobile-to-visible map journey in Chrome DevTools, desktop reopen, read-only context invariants, final network/console, 11 distinct focused tests and production build. Evidence: artifacts/testing/2026-10-10-canvas-destination-zoom/verification.md.
