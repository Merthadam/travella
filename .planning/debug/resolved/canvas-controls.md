---
status: resolved
trigger: User sees old map reset link and Explore flights CTA after merged changes
created: 2026-10-26
updated: 2026-10-26
---
# Canvas controls

## Symptoms
Expected: taller map with an icon reset inside it; whole flight card opens flights without visible CTA.
Actual: outside reset link and visible Explore flights footer, shown in user screenshots.

## Current Focus
hypothesis: Another checkout replaced the shared runtime after main startup.
next_action: Complete; verified isolated preview at localhost:5190.

## Evidence
- HEAD c7d8906 plus startup docs already contains merged map frame and whole travel-card button.
- Live container created 07:31:24 from locrian-peacock, after prior startup; all five relevant runtime source files differ from this checkout.
- Main migration head 0011; preserved shared database uses additive 0012. Existing compatibility procedure required on recreated container.

## Plan and acceptance
User supplied exact changes; no alternative design exploration needed. Preserve before screenshots. Capture visual plan before source edit. Map icon: accessible Show all places label, tooltip, 44px touch target, reset existing selection/filters and frame all places. No footer reset link. Verify whole flight-card pointer/keyboard navigation and Back, no visible Explore flights CTA, disabled provider state in existing tests. Desktop/mobile screenshots, console/network review, focused tests/build, source hashes.

## Resolution
Root cause confirmed: concurrent checkout replaced shared port 5174 twice. Added accessible icon-only reset to the merged map overlay. Existing whole-card travel navigation required no source change. Ran isolated app at 5190 with preserved database; 35 tests/build/auth and desktop/mobile browser checks passed. Evidence: artifacts/testing/2026-10-26-canvas-controls/verification.md.
