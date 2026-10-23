# Full-width state bar prototypes

Date: 2026-10-23. Branch: `prototype/full-width-state-bar-20261023`.

Three DEV-only alternatives on `/plans?prototype=state-bar&variant=A|B|C`. Start with `npm --prefix frontend run prototype:navigation`; localhost:5177 uses the existing local auth stack. All three URLs opened in the default browser.

The bar spans the conversation and actual A2UI Trip Brief. A places the action at the far right. B integrates it into the next stage. C reveals readiness and the action in an expandable row. The bottom preview control changes sample stage between early and ready, and the arrows change variant. Preview controls exposes memory state and simulated failure. No variant is selected for production.

Readiness is illustrative: chosen destination, dates or explicitly flexible dates, travelers, and priorities present in the sample conversation. Budget may remain undecided. These are design assumptions, not an approved production rule. The real confirmation dialog still requires an explicit flight choice. No canvas exists until explicit confirmation finishes simulated generation. Generated components are read-only fixtures; no real provider or save requests are made.

## Executed verification

Chrome DevTools MCP CLI, fresh browser tab. Signed in through the actual UI using the example account from the ignored credential file; no credentials included in evidence.

- All three variants: early generation disabled, no canvas mounted, bar spans the brief; sample-stage control enables review; review opens and cancels without generation.
- All three mobile layouts: 390×844, no horizontal overflow. Desktop: 1440×1000.
- C: readiness disclosure opens with the checklist and draft action.
- Confirm button disabled until flight choice. Explicit confirmation shows loading in the bar, then a sample canvas. Returning to research works.
- Simulated failure retains research and brief and permits review/retry. Cancel remains available.
- Keyboard arrows switch variants and update the URL; arrows in the composer do not switch variants.
- Console: no application errors; existing Lit development-mode warning only.
- Network captured after the simulated journey: no mutation requests and no 4xx/5xx responses. App shell reads auth/profile/plans normally.
- `npm --prefix frontend run build`: passed, existing warning about chunks larger than 500 kB.
- `git diff --check`: passed.

Screenshots were visually inspected. Fixed oversized preview-tool spacing found during inspection and recaptured. The mobile Trip Brief retains its existing internal scroll region. The floating preview tools appear at the viewport bottom in full-page captures and are not proposed product controls.

No new unit tests for throwaway prototypes; no backend CRUD changed. Real generation, persistence and comprehensive production stability were not tested by this task. Prior baseline test failures remain outside this design work.

## Screenshots

| Variant | Early research | Ready | Mobile |
| --- | --- | --- | --- |
| A: Action at the edge | [Early](plan/a-early.png) | [Ready](plan/a-ready.png) | [Mobile](plan/a-mobile.png) |
| B: The next stage | [Early](plan/b-early.png) | [Ready](plan/b-ready.png) | [Mobile](plan/b-mobile.png) |
| C: Readiness drawer | [Early](plan/c-early.png) | [Ready](plan/c-ready.png) | [Mobile](plan/c-mobile.png) |

[Existing controls baseline](plan/before.png), [C expanded](plan/c-readiness-open.png), [Review](plan/review.png), [Loading](plan/loading.png), [Draft](plan/draft.png), [Failure](plan/error.png).

Browser assertions: browser-checks.txt. Request list: network.txt.
