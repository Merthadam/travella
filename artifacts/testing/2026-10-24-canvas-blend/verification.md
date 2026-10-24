# Continuous canvas surface — verification

2026-10-24 · Source e56a972 · Prototype only.

Progress and trip header now use the canvas background, without dividing rules. Horizontal insets align, the rail is lighter, and a short decorative fade joins the A/C maps. Both elements retain normal scrolling and Canvas remains current. Existing flight/stay cards are unchanged.

## Checks executed

Authenticated Chrome DevTools on the existing example-account session at http://localhost:5188/plans?prototype=single-canvas&variant=C. Switched through A/B/C.

- Desktop 1440×1000, all variants: progress/header backgrounds both rgb(12,23,37), bottom borders 0 px. A 350 px board scroll moved their tops from 100/156 to -250/-194. No horizontal overflow.
- Mobile 390×844, all variants: 450 px document scroll moved tops from 112/160 to -338/-290. No horizontal overflow.
- Trip details opened with editable sample values and closed. Canvas aria-current=step remained present.
- Visually inspected A/B/C dark desktop, C light desktop and C dark mobile screenshots: shared surface, readable labels, intact travel cards and no unexpected overlap.
- Console: no errors, existing Lit development warning only. Session, profile and plans requests all HTTP 200; no writes.
- npm run build --prefix frontend passed with the existing large-bundle advisory. git diff --check passed.
- No new tests for this reversible prototype CSS refinement. No backend changes or persistence checks required.

## Visual evidence

Before: [previous top state](../2026-10-24-canvas-header-scroll/plan/c-header-top.jpg).

- [A dark](plan/a-dark.jpg)
- [B dark](plan/b-dark.jpg)
- [C dark](plan/c-dark.jpg)
- [C light](plan/c-light.jpg)
- [C mobile](plan/c-mobile.jpg)
