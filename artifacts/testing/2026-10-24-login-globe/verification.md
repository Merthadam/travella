# Login A globe and full-screen refinement

User approved the overall A refinement and requested a cleaner globe. During work, user clarified that the panels must fill the viewport without the prototype-control cutoff.

Changed the decorative SVG to a balanced circle/meridian/latitude grid with a single dotted route, small start and destination ring. Removed the irregular aircraft and looping path. Removed reserved bottom space from the split layout. Preview controls are collapsed by default behind a small launcher and can be opened/closed without changing panel geometry.

Chrome DevTools CLI checks passed at 1440×1000, 720×780 (similar to the supplied screenshot proportions) and mobile 390×844. Panel bounding boxes reach the viewport bottom. No horizontal overflow. Night/day theme toggle, preview controls open/close, mobile recovery and back-to-sign-in navigation passed. SVG remains decorative and hidden on mobile. All four screenshots visually inspected: no clipping or cutoff.

Console: only existing Lit development warning. Network: no account/data API calls. `npm --prefix frontend run build` passed with existing large-chunk advisory; `git diff --check` passed. Driver: `/tmp/travella-globe-check.py`.

[Before](plan/before.png) · [Night desktop](plan/night.png) · [Day desktop](plan/day.png) · [Narrow desktop](plan/narrow-desktop.png) · [Mobile](plan/mobile.png).

Still a simulated design prototype. Production authentication unchanged; real authentication tests were not run for this decorative/layout change. No deploy or push. Capture branch: `prototype/login-A-fullscreen-20261024`.
