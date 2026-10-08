---
status: resolved
trigger: "Maps returned no fancy Italian restaurants because the search grid around Dolomiti Superski is too small."
created: 2026-10-08
updated: 2026-10-08
---

# Canvas search area too small

## Symptoms

- Expected: destination searches cover a useful surrounding area, including nearby towns.
- Actual: the editor searches a few hundred metres around a destination pin, gets no places, and asks the traveler to select a base.
- Reproduction: ask the canvas editor for fancy Italian restaurants with Dolomiti Superski as the destination.

## Current Focus

- Confirmed cause: the resolver treated Google's display viewport for a point of interest as the entire destination search area.
- Next action: traveler can retry on the rebuilt local app.

## Evidence

- The resolver directly uses geometry.bounds or geometry.viewport; no minimum search extent exists.
- Explicit map areas bypass the resolver in the SDK bridge, allowing default-area correction without silently changing user-selected bounds.

## Verification plan

- Manually compare live destination resolution and restaurant searches before/after the fix.
- Check a city with already sufficient bounds and an explicitly supplied small rectangle.
- Rebuild the affected local services and check source hashes. No automated tests requested or run.

## Resolution

- Root cause: live Google geocoding resolves Dolomiti Superski as an establishment/point of interest with a rooftop location and a roughly 300 × 200 m display viewport. That exact rectangle returned zero restaurants.
- Fix: when either automatic destination span is under 5 km, expand to include a vicinity rectangle approximately 25 km in each direction. Preserve larger bounds and all explicit map selections. Expose area_source to the SDK and explain vicinity semantics in its prompt/skill.
- Verification: live authenticated MCP calls now return five restaurants, all inside the expanded area. Salzburg bounds remain unchanged. An explicit copy of the original tiny rectangle stays unchanged and empty. The real SDK tool bridge projects five observed places with destination_vicinity and one search call; explicit rectangles bypass resolution.
- Deployment: rebuilt local stack; example-account auth succeeded; all five changed runtime files match the running containers.
- Evidence: artifacts/testing/2026-10-08-canvas-search-area/verification.md.
- Limits: no paid LLM turn, automated test suite, browser journey, or production deployment performed. This changes only the connector/agent default search policy, not frontend or CRUD behavior. It is a nearby rectangle, not routing distance or complete coverage of an entire resort network.
