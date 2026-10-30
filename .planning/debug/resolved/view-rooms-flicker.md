---
status: resolved
trigger: "Flicker when clicking View rooms in accommodation search results"
created: 2026-10-30
updated: 2026-10-30
---

## Symptoms

The user clarified the exact trigger with a screenshot: the View rooms button on a hotel search card. The earlier chat-scroll repair addressed a different transition.
Expected: stable room-details opening and refresh without flashing intermediate offers or jumping dialog geometry.
Actual: flicker while opening room details.

## Current Focus

Root cause: the room-details body renders provisional search offers, then swaps in refreshed offers and inserts the hotel gallery and description above them.
Completed: verified steady loading and atomic detail reveal on the rebuilt app, including failure fallback, retry, empty results, and mobile.

## Evidence

- StayDetails initializes rooms from the search result and immediately fetches fresh hotel details and availability.
- TravelDetailsDialog opens in a passive effect; its height is content-driven and centered.
- Exact hotel reproduced with a real provider-backed search in the example account. At 48 ms the open dialog showed four original rooms and no photos. At 3459 ms it replaced those with 20 rooms and four photos. Outer dialog stayed at y=67.5 and height=765 throughout; this was a content swap, not a modal close/reopen.

## Resolution

Fix: while a live room refresh is pending, show a static loading placeholder and withhold provisional room actions and detail content. Reveal the coherent fetched details once complete. Keep original offers as the failure fallback and historical/exact-room observations immediate. Reserve the stay dialog height across loading and completed states.
Automated: 111 related tests and production build pass. The strengthened regression fails against the original component and passes with the fix.
Browser: real provider-backed View rooms checks pass on desktop and mobile. Both show zero provisional rooms during loading, then 20 refreshed rooms and four photos together without changing dialog geometry or background scroll. Simulated failure preserves labeled original offers, real retry recovers, and simulated empty results show the explicit empty state. Escape restores trigger focus. No related console or network failures on the real desktop path.
Deployment: local container rebuilt; runtime source hashes match. Health and authentication checks pass.
Evidence: artifacts/testing/2026-10-30-view-rooms-flicker/verification.md.
