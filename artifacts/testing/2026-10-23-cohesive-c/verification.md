# Cohesive C visual refinement

2026-10-23 · `prototype/full-width-state-bar-20261023`.

CSS-only changes scoped to C: continuous app/header/stage background, aligned content edges, softer dividers, matching chat/composer/action surfaces and radii, consistent brief typography, less empty space above Add a place, and a restrained settled-destination treatment. Stage-only top bar and generation inside the A2UI Trip Brief are preserved. A/B and production flows are not restyled.

Run: `npm --prefix frontend run prototype:navigation`.
Preview opened: `http://localhost:5177/plans?prototype=state-bar&variant=C&scene=ready`.

## Verification

Chrome DevTools MCP CLI using the example-account authenticated session from this conversation.

- Desktop 1440×1000 and mobile 390×844 inspected. No horizontal overflow; draft action visible within mobile Trip Brief. Existing internal brief scrolling retained.
- Early generation disabled; ready action opens review; cancellation restores brief; explicit confirmation opens simulated draft; returning to research exposes existing draft action.
- Loading/error remain inside brief; simulated retry/cancel works.
- Dark and light desktop screenshots inspected. Light mode was set temporarily on the document for visual inspection and restored; no persisted theme preference changed.
- Console: no application errors, existing Lit dev warning only. Network: no mutation requests during mock interaction. Logs in browser-checks.txt and network.txt.
- `npm --prefix frontend run build`: passed with existing >500 kB chunk warning. `git diff --check`: passed.
- No new unit tests for CSS-only prototype work. Existing 13 component tests passed in the immediately preceding functional refinement; they were not rerun for this styling pass.

During visual inspection an inherited textarea background was found and removed. Final ready desktop/mobile captures show the correction; intermediate flow-state captures precede that last cosmetic correction. Screenshots were inspected for clipping, overlap and readability. Prototype comparison controls float at the viewport bottom and are not part of the proposed product UI.

## Evidence

[Before](plan/before.png) · [Final desktop](plan/c-ready-desktop.png) · [Final mobile](plan/c-ready-mobile.png) · [Light desktop](plan/c-light-desktop.png).

[Early research](plan/c-early-desktop.png) · [Loading](plan/c-loading.png) · [Error](plan/c-error.png) · [Mobile review](plan/c-mobile-review.png) · [Existing draft](plan/c-existing-draft.png).

Generation and data changes remain simulated. This does not complete the broader production stability work or establish production readiness.
