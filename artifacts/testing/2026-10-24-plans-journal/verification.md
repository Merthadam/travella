# My plans prototypes — verification

Date: 2026-10-24. Status: prototype verified; design selection and production implementation pending.

## Preview

Run `cd frontend && npm run prototype:plans`. The preview server is running at http://localhost:5190.

- A: http://localhost:5190/plans?prototype=plans-journal&variant=A
- B: http://localhost:5190/plans?prototype=plans-journal&variant=B
- C: http://localhost:5190/plans?prototype=plans-journal&variant=C

Real application header, authentication and read-only list fetching remain in place. All displayed trips are clearly labeled sample data; prototype actions update memory only. Reload resets sample changes. Illustrations are decorative, original SVG landscapes, not provider imagery or maps. Preview route is gated by `import.meta.env.DEV`.

## Executed checks

Chrome DevTools MCP 1.12.0, isolated Chrome session. The configured shared MCP profile was already busy; a local MCP client launched the same Chrome DevTools server with `--isolated`. No existing browser session was stopped. Screenshots were saved through Chrome DevTools to its allowed OS temporary directory, then copied into this evidence directory.

Authenticated with the configured example account using the supplied local credential file, without printing or saving credentials. Canonical preview origin remained localhost:5190; its API proxy targets the already running localhost:5174 stack with that stack's expected Origin.

| Check | Observed result |
| --- | --- |
| A journal, B index, C board | All render within the existing application shell. |
| Variant arrows and keyboard | A → B → C updates the URL; direct variant URLs and reload preserve the selected layout. Search input retains normal arrow-key editing. |
| Search and no-results | Lisbon search returns one sample; unmatched input shows an actionable empty state; reset restores trips. |
| Stage filters | Draft filter returns the two draft samples. |
| B index selection | Selecting Lisbon updates the adjacent preview; on mobile it scrolls the preview into view. Reduced-motion check observed preview from y=135 to y=639 within an 844px viewport. An initial check incorrectly demanded y=0 even when the page had reached its scroll limit; the entire preview was visible. |
| Resume preview | Each layout opens its trip preview; Escape closes it and restores focus. |
| Automatic naming | Confirming Yakushima changes Japan nature escape / Exploring to Yakushima escape / Researching. Creating a seven-day draft changes the automatic name to A week in Yakushima / Draft. |
| Custom name protection | Renamed Yakushima to My forest holiday, advanced to Draft, and observed the custom name unchanged. |
| Board stage changes | Simulated milestone moves the trip into the matching column; counts update. |
| Empty/new/delete/reset | Empty state renders; Start a plan adds an in-memory New trip; Delete sample trip removes it; reload restores the original sample data. |
| Responsive/theme | All variants checked at desktop 1440px and mobile 390×844, light and dark. No horizontal page overflow. Screenshots visually inspected. Fixed prototype switcher intentionally overlays the viewport; content remains reachable by scrolling, with bottom clearance. |
| Dialog positioning | Visual review caught uncentered native dialog after CSS reset; margin:auto fixed it. Final dialog bounds and screenshot confirm centering. |
| Console | No application errors. Existing Lit development-mode warning only. |
| Network | Auth session, traveler profile and active plan GETs return 200. No plan mutation requests were made by the prototype interactions. |
| Build | `cd frontend && npm run build` passed after final source changes (575 modules). Existing large-chunk advisory remains. |
| Whitespace | `git diff --check` passed. |

No unit tests added for throwaway UI, per prototype skill. No CRUD changes, real Plan persistence, provider searches, or production naming integration are part of this task. Loading/API error simulation is not introduced because the designs use in-memory sample state; real sign-in/session loading was exercised. Sample delete/restore is not the production seven-day recovery implementation.

## Visual evidence

- [Before](plan/before-plans.png)
- [A desktop](plan/A-journal-desktop.png), [A mobile](plan/A-journal-mobile.png), [A mobile dark](plan/A-journal-mobile-dark.png)
- [B desktop](plan/B-trip-index-desktop.png), [B mobile](plan/B-trip-index-mobile.png), [B mobile dark](plan/B-trip-index-mobile-dark.png)
- [C desktop](plan/C-journey-board-desktop.png), [C mobile](plan/C-journey-board-mobile.png), [C mobile dark](plan/C-journey-board-mobile-dark.png)
- [Automatic naming](plan/automatic-name-milestones.png), [manual name protection](plan/manual-name-protected.png), [empty state](plan/empty-state-desktop.png)

Prototype source is retained on branch `prototype/plans-journal-20261024`. No layout has been selected. After selection, implement the chosen design with production data/contracts and remove prototype wiring from the production branch, preserving this branch as the design source.
