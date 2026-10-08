# Canvas / main merge checks — 2026-10-09

## Scope and conflict resolutions

Merge `feat/canvas-activity-editing` (feature tip 1dcb762 plus merge planning)
with `origin/main` 2d2cc19. Preserve both histories and the separate dirty main
checkout. The observed merge index contained six conflicts:

- `PlansApp.jsx`: keep the shared AppHeader and account navigation from main,
  plus canvas skip link, canvas rendering, and unsaved-change confirmation.
  Manual inspection found clean Account navigation cleared canvasPage; preserve
  the mounted saved canvas when visiting Account. Dirty/busy exits still confirm.
- `test_agent_turn.py`: retain main's canonical-preference-clear coverage,
  adapting its existing fixture to PlanRunStore/runs. Keep removal of obsolete
  ResearchDecision coverage from the unified-agent refactor. No new cases added.
- Requirements/roadmap: retain account phase 13 and canvas phases 14/15.
- STATE.md/state.json: retain both workstreams and their quick-task records;
  preserve outstanding acceptance rather than claiming all historical UAT complete.

## Executed checks

- `npm run build`: passed after final header resolution (535 modules).
  Existing large-chunk warning remains.
- All Python source files parsed with AST; merged state JSON parsed successfully.
- `git diff --check`, staged whitespace check and unresolved-index check passed.
- Local stack rebuilt from this worktree with existing local credentials.
- Existing Cognito pool/client precheck and example-account authentication passed.
- SHA-256 matched running app copies of PlansApp.jsx, AccountApp.jsx,
  agent/service.py, auth/api.py and crud/api.py.

Chrome DevTools, example account, real authenticated APIs:

1. Created only the isolated `Merge navigation check` Plan and saved a manual
   Salzburg canvas fixture through the public challenge/save API. Readback matched.
2. Opened saved canvas with shared AppHeader, destination map and editing sidechat.
3. Edited traveler count from 2 to 3; Account exit confirmation cancellation
   kept the unsaved canvas and edited value visible.
4. Saved through the UI, read back 3 travelers, then reloaded: saved canvas restored.
5. After correcting the merge interaction, Account → My plans restored the same
   saved canvas and sidechat at desktop and 390 × 844 widths.
6. Mobile Account/canvas had no horizontal overflow. Screenshots inspected for
   clipped header controls and canvas layout.
7. Relevant auth/account/profile/Plan/canvas/context/history requests returned 200.
   No browser errors; only existing Lit development-mode warning.
8. Deleted only the fixture through confirmation/delete endpoints; active read
   returned 404 and deleted read confirmed lifecycle `deleted`.

## Evidence

- [Desktop canvas](implementation/canvas-desktop.jpg)
- [Mobile canvas](implementation/canvas-mobile.jpg)
- [Account header](implementation/account-header.jpg) — cropped to avoid private profile data.
- Existing before/design evidence: ../2026-10-08-canvas-editing/verification.md
  and its approved C screenshots; account design evidence arrived with main.

## Limits

No automated test suite or paid LLM calls were run for this merge. Existing feature
verification documents cover live generation, activity search/add/save and search
area correction; these were not all repeated. Flight/stay browsing remains a
discussion, not a completed integration. No production deployment performed.
Local app remains running at http://localhost:5174. The unrelated dirty local
main checkout and `.cache/` were not changed or staged.
