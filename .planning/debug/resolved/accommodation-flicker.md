---
status: resolved
trigger: "there is this flicker when pressing the button to select apartment"
created: 2026-10-30
updated: 2026-10-30
---

## Symptoms

User reports flicker when selecting accommodation after the local stack rebuild.
Expected: stable transition into accommodation selection.
Actual: brief visual flicker; exact intermediate content not yet captured.
Reproduction: open a Plan, then select accommodation.

## Current Focus

Root cause: TravelConversation restores scroll in a passive effect, after the hydrated discussion can paint at its top.
Next action: complete. Rebuilt browser checks show zero incorrectly positioned loaded frames on desktop and mobile.

## Evidence

- Current checkout is c1a9f7e, clean before investigation.
- Default Chrome DevTools MCP cannot connect because its browser profile is already in use.
- Accommodation navigation keeps the canvas mounted and toggles visibility. Selection of an individual room instead closes its details before asynchronous confirmation preparation; these are distinct flows.
- Isolated Chrome DevTools MCP reproduced the first-open jump at 1440×900. At 619 ms, loaded history was visible at scrollTop 0 with maximum 2724; at 649 ms, scrollTop became 2724. A repeated open at unchanged viewport was stable; resizing while hidden also exposed a jump.
- Browser inspection used the example account and an existing verification Plan, without saving new choices or editing Plan data.

## Resolution

Root cause: post-paint transcript scroll restoration.
Fix: useLayoutEffect restores history before paint, retaining the existing near-bottom guard.
Verification: 83 related tests and production build pass. Rebuilt app is healthy and source hashes match. Desktop first-open history paints directly at 2724 px; mobile chat opens directly at 2817 px. Reader position remains at 200 px after returning and reopening. No console errors or failed same-origin API requests during the verified desktop journey.
Evidence: artifacts/testing/2026-10-30-accommodation-flicker/verification.md
