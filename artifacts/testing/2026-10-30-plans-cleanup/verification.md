# Plans cleanup verification — 30 October 2026

## Result and scope

Passed. User authorized removing the audited retired Plans UI and kept the existing design/no-prototype choice.

- Deleted 11 files: PlanSelectorPrototype and CSS; CanvasGlobePrototype, GlobeTopbarPrototype, TravelCardsPrototype and their three stylesheets; PlanWorkspace; PlanDetails; the prototype Vite config.
- Removed the three development query-route switches and two prototype npm scripts.
- Removed legacy map/brief/destination state, refs, effects, mutation handlers and opening-time reads from PlansApp. Removed five frontend API helpers with no remaining production consumers. Backend endpoints are unchanged.
- Removed 114 dead stylesheet rules and unused branches of shared dark-theme selectors after checking current JSX/JS consumers.
- Kept the current PlansJournal, Conversation, PlanningCanvas and Recently deleted. The remaining grid handles deleted plans only. The confirmation dialog handles restoration only; current journal/drawer rename and delete handlers are preserved.
- Opening/loading/failure views no longer render stale cards from the previous list. Failed opening provides Return to My plans; a failed read after restoration retries opening without issuing another restore.

Source diff: 17 files, 86 inserted and 803 deleted lines, including three focused regression tests.

## Automated verification

From `frontend/`, using `NODE_OPTIONS=--no-experimental-webstorage` for the existing jsdom storage setup:

- Baseline: `npm test -- src/PlansApp.test.jsx src/PlansResume.test.jsx src/features/plans/components/PlanningCanvas.test.jsx src/AccountApp.test.jsx` — 59 passed.
- Final: `npm test -- src/PlansApp.test.jsx src/PlansResume.test.jsx src/features/plans/components/PlanningCanvas.test.jsx src/AccountApp.test.jsx src/plansApi.test.js src/components/AccountMenu.test.jsx src/features/appearance/AppearanceProvider.test.jsx` — 77 passed across seven files.
- Added behavior checks for pending plan navigation without stale cards/legacy reads, failed navigation with a working return link, and successful restore followed by a failed opening/read retry without duplicate restoration.
- `npm run build` — passed, 604 modules. CSS decreased from 287.10 kB to 230.92 kB (56.18 kB / approximately 19.6%); gzip CSS from 53.01 to 41.81 kB. Main JS decreased from 1,167.85 to 1,153.32 kB. Existing large-chunk advisory remains.
- `git diff --check` — passed. No remaining frontend references to removed components, prototype routes/config, or legacy workspace stylesheet families.

No new failures. Focused checks were used; a whole-repository test run was not necessary for this frontend-only cleanup. Canvas resume/rendering was checked by the existing tests; live model generation and provider searches were not invoked.

## Actual Chrome DevTools checks

Used the installed Chrome DevTools MCP server in an isolated headless instance, preserving the shared browser profile. Vite served this checkout at `http://localhost:5200`; a temporary development config proxied the existing backend on port 8003 with its configured local Origin. No Docker stack was rebuilt/stopped and no production config changed.

Signed in with the supplied example-account credentials, read directly from the local account file with sensitive output suppressed. Created exactly one task-owned plan through New plan. Only that plan was renamed, deleted and restored. Before-state screenshots use that same fixture and are the unchanged visual target.

Executed:

1. Create a blank plan; open Conversation; return to journal and rename it to the verification title.
2. Filter journal to the task-owned plan and capture the current desktop design. Soft-delete it, open Recently deleted and capture its card and restore confirmation before edits; restore it.
3. After edits, reload the same plan and verify Conversation. Network inspection showed **zero legacy `/brief` or `/destinations` requests**. Current research-context, research-offer and conversation requests succeeded.
4. Check the journal in light/dark desktop (1440×1000) and true mobile emulation (390×844). Switch Research/Canvas filters; the empty filter state displays correctly. No horizontal overflow.
5. Rename through the mobile inline editor. Reload and verify the new name persists.
6. Delete through the journal; verify absence from active results. Open Recently deleted, reload and verify the deleted plan persists there.
7. Restore through its confirmation dialog. Conversation opens; reload and verify the restored plan remains available.
8. Navigate to a newly generated nonexistent UUID. Real not-found responses produce Plan unavailable with no stale cards; Return to My plans works.
9. Cleanup: soft-delete only the task-owned plan. An actual GET with `view=deleted` returned 200 and confirmed the fixture identity, deleted lifecycle and preserved title. Its normal seven-day recovery/purge policy remains intact. No unrelated Plan was modified.

Network/console: no unexpected failing HTTP requests on the successful flow. The intentional nonexistent-plan check produced expected not-found errors. Existing Lit development-mode warning only. No auth, lifecycle or render regression observed.

## Visual evidence

Inspected the saved screenshots for clipping, overlap, readability and incorrect states. Conversation before/after screenshots are pixel-identical. Journal layout is unchanged; the earlier screenshot contains a creation notice absent after reload. Mobile controls, recovery cards, confirmation and missing-plan states are legible without horizontal overflow.

| State | Before | After |
|---|---|---|
| Journal, dark desktop | [Before](plan/journal-dark-desktop.png) | [After](implementation/journal-dark-desktop.png) |
| Conversation, desktop | [Before](plan/conversation-desktop.png) | [After](implementation/conversation-desktop.png) |
| Deleted fixture card | [Desktop before](plan/deleted-plan-card.png) | [Mobile after](implementation/deleted-plan-card-mobile.png) |
| Restore confirmation | [Desktop before](plan/restore-dialog.png) | [Mobile after](implementation/restore-dialog-mobile.png) |

Additional evidence: [light desktop](implementation/journal-light-desktop.png), [mobile journal](implementation/journal-light-mobile.png), [empty filter](implementation/journal-filter-empty-mobile.png), [missing plan](implementation/missing-plan-mobile.png).

No required check remains blocked. Verification used this worktree's frontend with the existing local backend; the shared Docker frontend was not deployed/rebuilt.
