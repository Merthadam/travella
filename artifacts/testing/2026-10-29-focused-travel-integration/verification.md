# Focused travel navigation integration — verification

Implementation commits: `57ecc58` and `eb71152`. Branch: `feat/focused-travel-integration`, based on freshly fetched `origin/main` (`c1eba7d`). Imported complete maple-cake features `6b77473` and `d5ee569` as `bd0c68a` and `fd40712`. The older divergent local main was not used; an initial cherry-pick attempt there was aborted without retaining changes. Prototype code remains on its prototype branch.

## Approved outcome

The real canvas, map, programmes and main conversation remain intact. Flights and Stays have one shell header: Back to canvas and the active topic chat toggle. No Stays/Flights picker, duplicate mobile tabs, internal collapse button or reopen rail. Search fields remain available, with editable defaults from the Plan/profile. Account settings and sign out live in the existing Plans drawer footer; the Plans list and account pages retain their own account trigger. Workspaces stay mounted to preserve inputs, research and unsent discussion drafts.

The approved reference captures are in [plan](plan/); the final Chrome DevTools captures are in [implementation](implementation/).

## Automated checks

- `npm --prefix frontend run build`: passed. Existing large-bundle advisory remains.
- Focused frontend command: `npm --prefix frontend test -- src/PlansResume.test.jsx src/PlansApp.test.jsx src/AccountApp.test.jsx src/components/AccountMenu.test.jsx src/components/PlanHeaderContext.test.jsx src/features/plans/components/PlanDrawers.test.jsx src/features/plans/components/PlanningCanvas.test.jsx src/features/plans/travel --reporter=dot`: 234 passed, 12 intentionally skipped fixture-dependent cases. A subsequently added drawer footer/lock/callback test passed with all eight drawer tests; the final canvas focus cleanup passed all 21 canvas tests.
- Full frontend run: 396 passed, 12 skipped, one unrelated failing TripBrief confirmation test. Reproduced the identical failure against an untouched `git archive c1eba7d` with the same dependencies (6 passed, 1 failed). TripBrief and its test were not changed by this integration. The baseline UI applies need status immediately while this old test expects an additional inline confirmation.
- `uv run --locked pytest services/mcps/tests/test_liteapi.py services/agent/tests/test_travel_registry.py services/agent/tests/test_canvas_travel.py -q`: 247 initially passed; seven SSE-to-React cases exposed outdated matchMedia mocks. Updated those mocks and the removed navigation labels. Rerunning `services/agent/tests/test_canvas_travel.py` passed all 197 tests, including all seven live-handler SSE-to-React cases. Combined affected backend set: 254 passing cases. Existing dependency deprecation warnings remain.
- New coverage verifies active-only shell content, header cleanup, workspace draft preservation, mobile pane visibility/focus, account menu placement, disabled account actions during a rename, real account/sign-out callbacks, and account suspension preserving the mounted canvas.
- `git diff --check`: passed.

## Chrome DevTools journey

Used the supplied example account with its password loaded privately. Created an isolated Milan verification Plan (12–17 May 2027, one traveler), saved its test canvas through authenticated challenge/commit handlers, and inspected the real application; no model-generated fixture or mocked UI was substituted.

| Check | Observed result |
|---|---|
| Desktop flights, 1440×1000 | Exactly one app header; only Back to canvas and flight chat toggle. All search fields visible; BUD, MIL city-wide, dates, Hungary and EUR prefilled. |
| Explicit manual flight search | Returned 59 sandbox return flights; actual BGY arrival accepted under MIL city-wide criteria. No search happened just from opening the view. |
| Collapse and reopen | Options expanded to full 1440px width. The header remained available; reopening restored the same unsent message. |
| Flight → canvas → Stay → canvas → Flight | Flight results and unsent flight draft survived; Stay draft remained separate. |
| Desktop Stays | Milan and Italy defaulted from the Plan; Hungary from traveler preferences. Explicitly selected Milan suggestion and changed currency to USD. All original search controls remained available. |
| Account footer | Menu opens upward in the drawer and stays inside the viewport. Real Account settings navigation worked; browser Back restored canvas and both unsent topic drafts. |
| Mobile, 390×844 | The header toggle switches between search and chat. The hidden pane uses native hidden state. Composer remains visible; closing returns focus to the toggle. No horizontal page overflow. |
| Light and dark | Both focused views inspected; text, controls and borders remain legible. |
| Loading/error handling | Observed flight/stay loading UI. Shared-stack restarts surfaced honest unavailable/retry states rather than invented results. Separate runtime restored service access. |

Mobile inspection found the existing floating Plan chat control above the drawer; raised the modal drawer/backdrop above that control. Console inspection also found redundant aria-hidden attributes on already-hidden canvas children retaining focus during transition; removed the redundant attributes while retaining native hidden/inert behavior.

## Runtime isolation

The normal launcher rebuilt this checkout successfully, but a concurrent maple-cake session recreated the same `travella-local-single` containers during subsequent verification. The collision caused transient aborted/failed requests and sign-in resets. We left that session's port 5174 alone and created the separate review app at **http://localhost:5196** (auth 8016, agent 8116).

The review runtime has its own app and MCP containers and retains the existing PostgreSQL data. No database volume was deleted. MCP containers are separate because worktree-local service credentials differ. `runtime.override.yaml` records the local Compose override. The first Compose file must remain the repository-root `compose.local-single.yaml` so relative env-file paths resolve correctly.

Cognito discovery/precheck passed. `TRAVELLA_LOCAL_ORIGIN=http://localhost:5196 uv run --locked python scripts/check-local-auth.py` passed sign-in, session and temporary sign-out. Representative application, header, drawer, workspace, defaults, agent and connector source hashes matched the running images. Final runtime refresh and screenshot checks are recorded below.

## Scope limits

No remote deployment, main merge or push. No new programmes agent or navigation surface. No live paid model turn or supplier checkout was submitted during browser verification; interruption, imported results, browser history, confirmation and checkout recovery remain covered by the affected automated suites. Existing phase acceptance and unrelated baseline failures are not marked complete by this task.

## Final runtime and browser verification

Final app image: `254e636f1809` (`travella-focused-header-app:review`). Container health: healthy. The final rebuild and authentication smoke check passed. All 13 representative source files match the container; see [source-hashes.txt](source-hashes.txt).

The final Chrome DevTools pass confirmed focus lands on Back to canvas after the shell reveals its portal host. Returning restores the canvas. No console errors or focus/aria-hidden warnings remain; only the pre-existing Lit development-mode warning appears. All local API calls in that final pass returned 200 (session, profile, Plan, canvas, research context, travel capabilities, airport lookup and flight topic). Earlier startup-only 500/unavailable responses and aborted searches were associated with rebuilds or explicitly leaving an active search, not the final steady-state run.

The drawer account menu fits at 390×844 and 1440×1000. Escape closes only the menu and returns focus to Account; a second Escape closes the drawer. Drawer z-index 40 covers the existing mobile chat control at 15. Account → browser Back preserved both unsent drafts. The real Sign out menu action reached the login screen; signed in again with the example account.

The edited Stays currency (USD) survived a normal page reload and reopening Stays. Live Stays search completion remains blocked: after the final healthy restart, selecting Milan and searching twice returned HTTP 502 with the safe unavailable/retry message. The screenshot `implementation/stays-search-error.jpg` records the observed state. Earlier requests were aborted by navigation or overlapped Docker restarts. The final MCP LiteAPI, airport groups and travel-contract source hashes also matched this branch. The focused frontend and backend suites cover Stays search and recovery. Flight live search completed with 59 results. No checkout was performed.

The Docker VM temporarily had only 29 MiB available while other sessions built their stacks. Stopped only this task's app/MCP containers, completed the build, and restarted them successfully; unrelated containers and the shared database were preserved.

To restart the isolated review services from this repository root:

```sh
TRAVELLA_FRONTEND_PORT=5196 TRAVELLA_AUTH_PORT=8016 TRAVELLA_AGENT_PORT=8116 docker-compose -p travella-focused-header -f compose.local-single.yaml -f artifacts/testing/2026-10-29-focused-travel-integration/runtime.override.yaml up -d --no-deps --no-build app travel-mcp map-mcp research-mcp
```

The existing `travella-local-single-postgres-1` must be running. This command does not rebuild the source; use Compose `build app` with the same files to rebuild after later source edits.

Cleanup: deleted only verification Plan `019baeb6-6ab5-45b2-b9c0-1d82e1ad793b` through challenge/commit; active lookup returned 404 and deleted lookup confirmed the recoverable deleted lifecycle. Browser returned to My plans.
