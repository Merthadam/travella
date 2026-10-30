# Retired Plans UI cleanup

User authorized removing the audited selector/globe/travel-card prototypes, old PlanWorkspace and PlanDetails, supporting dead state/handlers/styles, and obsolete active-grid branches. Preserve the current PlansJournal, Conversation, PlanningCanvas, Recently deleted/recovery, loading/error states and account navigation. Existing choice: preserve design, no prototypes. GSD quick executes inline.

1. Capture before screenshots of the journal and Recently deleted. Trace every legacy import/state/API/style consumer. Remove retired files, dev-only route switches and launch config/scripts; remove old workspace effects and duplicate brief/destination reads. Keep any API methods needed by current features.
2. Make the fallback explicitly handle plan-opening status/errors and the deleted list without displaying stale active/deleted cards during navigation. Keep restoration's authoritative confirmation/revision/idempotency contract. Remove unused legacy styles only after checking remaining consumers.
3. Run focused Plans/auth/canvas regressions and production build; add behavioral regression coverage for opening loading/errors and absence of legacy requests. Use Chrome DevTools and example account for real create/open/rename/delete/reload/restore checks on a task-owned plan, responsive/theme screenshots, console/network review and cleanup. Do not invoke model/provider generation. Record evidence, summary, STATE and scoped commits.

Acceptance: old prototypes/workspace references gone; current design preserved; deleted list remains restorable; failed/in-progress navigation does not expose stale cards; no extra legacy network requests; tests/build and browser checks pass.
