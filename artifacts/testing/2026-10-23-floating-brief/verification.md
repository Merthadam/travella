# Desktop C: draggable brief overlay

Completion circle now floats independently of the conversation. Click opens the existing A2UI brief above/below it as a nonmodal overlay. Drag or focused arrow keys move the circle. Close button, circle click or Escape close the panel. Position is in memory; reset/reload restores its starting position.

Authenticated example-account checks through Chrome DevTools at 1440 × 1000:
- Every message and composer rectangle remained identical before/after opening.
- Actual Chrome pointer drag moved the circle across the page without toggling the panel.
- Panel stayed within viewport at left edge. Arrow key moved the circle without changing prototype variant; Escape closed it.
- Early generation stayed disabled. Destination edit changed count from 1/6 to 2/6 and survived close/reopen.
- Draft review opened/cancelled. Explicit flight confirmation generated the mock draft successfully.
- Light/dark and moved-position screenshots visually inspected. Panel content scrolls; overlay intentionally covers conversation beneath it.
- Console: existing Lit development warning only; no application errors. Network requests inspected: no failures.
- `npm --prefix frontend run build` and `git diff --check` passed. Existing bundle-size warning remains.

Desktop only per user direction. Mobile and generation failure were not tested in this iteration. No new automated tests for throwaway prototype; previous 13 component tests were not rerun because shared components did not change.

[Before](plan/before.png) · [Closed](plan/closed-desktop.png) · [Open dark](plan/open-desktop.png) · [Open light](plan/light-open-desktop.png) · [Dragged to left](plan/moved-desktop.png)
