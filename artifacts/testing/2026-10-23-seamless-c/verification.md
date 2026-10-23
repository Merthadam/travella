# Prototype C: remove outer seam

Removed the stage bar bottom border and Trip Brief outer borders in C. Retained the stage connector and internal field separators. Prototype only; no production behavior changes.

Verified using Chrome DevTools with the authenticated example account:
- Desktop 1440 × 1000, light and dark: outer border widths are zero; screenshots visually inspected.
- Mobile 390 × 844: no horizontal overflow, draft action visible, outer borders absent. The existing fixed prototype switcher overlays some conversation content; the Trip Brief retains its existing scroll region.
- Review & create draft opens the confirmation dialog; Keep researching closes it.
- Console: no application errors; existing Lit development warning only.
- Network: inspected requests succeeded (200/304); no failed requests.
- `npm --prefix frontend run build`: passed, existing large-chunk warning.
- CSS-only refinement: unit tests and generation loading/error flows were not rerun; these were exercised in the preceding C refinement.

[Before](plan/before.png) · [Light desktop](plan/light-desktop.png) · [Dark desktop](plan/dark-desktop.png) · [Mobile](plan/mobile.png)
