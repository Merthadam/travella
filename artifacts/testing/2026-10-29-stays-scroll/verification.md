# Stays checkout scroll correction

Status: passed for the reported scroll lock. CSS-only change; no booking or persistence contract changed.

## Reproduction and cause
Authenticated as the example account in isolated Chrome DevTools MCP at localhost5198. Restored only the previous verification Plan, opened its Stays workspace, then View stay confirmation. A hidden mounted `.travel-workspace` matched `:has(.travel-workspace)` and applied `overflow:hidden` to `.canvas-travel-screen`. At1440×1000, the container was928px tall with1435px content. PageDown kept scrollTop=0. Before screenshot: `plan/before-desktop.png`.

The previous checkout verification used scrollIntoView, which can scroll an overflow:hidden element programmatically. It did not prove normal user scrolling and missed this defect.

## Fix
In `frontend/src/features/plans/travel/travel-workspace.css`, constrain all workspace-container rules to a direct `.travel-workspace:not([hidden])` child. Active browse/chat workspaces retain their dock layout. Checkout uses the existing overflow:auto container, including when a visited workspace remains mounted. The shared rule also applies to Flights checkout.

## Executed verification
- Rebuilt only this workspace's app service in Compose project travella-stays-checkout. Source SHA-256 matches the running container (`runtime-hash.json`).
- Production build passed; existing bundle-size advisory only (`build.log`).
- Auth health/sign-in/session/sign-out passed (`auth.log`).
- Desktop1440×1000: enter from active workspace, hidden workspace count1, checkout overflow:auto. PageDown moved scrollTop0→579, exactly the maximum. The bottom room terms are reachable. Active workspace still uses display:flex/overflow:hidden with its own pane scroll.
- Mobile390×844: repeat Plan→Stays→confirmation, hidden workspace count1, overflow:auto. Consecutive PageDown keys moved0→732→1281 (maximum); download/print/back controls visible. PageUp returned to549. No horizontal overflow.
- Screenshots `implementation/desktop-scrolled.png` and `implementation/mobile-scrolled.png` visually inspected. Content/controls readable, no overlap.
- Console: existing Lit development warning only. Relevant application network requests200. Test Plan soft-deleted again, canvas404 verified. No supplier or model calls required.

Regression mechanism is the actual Chrome keyboard scrolling check above; no CSS-string unit test was added. Physical trackpad/touch gestures and a separate flight checkout were not exercised. The fix removes the overflow lock for both checkout types. No broader phase acceptance claimed.
