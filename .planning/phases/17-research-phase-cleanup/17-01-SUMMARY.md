---
phase: 17-research-phase-cleanup
plan: "01"
status: implemented
completed: 2026-10-23
requirements: [RC-17-01, RC-17-02, RC-17-03]
---
# Desktop Research shell and real floating brief

Movable portal-based real A2UI brief, quiet full-width state bar, no reserved sidebar, safe default circle and keyboard/viewport behavior.

User authorized service-owned parallel implementation. Shared contracts were integrated before verification; production prototype scaffolding was removed from this branch, preserved on the prototype branch. Commits: 855b920,b26356f.

See [verification evidence](../../../artifacts/testing/2026-10-23-research-cleanup/verification.md) and delegated [CRUD](17-CRUD-SUMMARY.md)/[Agent](17-AGENT-SUMMARY.md) summaries for exact operations and commands. Final targeted checks:66 frontend,89 Agent/gateway,49 CRUD passed; frontend build passed. Two unchanged broader-suite fixture failures remain documented. Actual Chrome verified overlay/no reflow, real edits, defer/reload, review/stale recovery and explicit flight receipt handoff; generation transport deliberately blocked to avoid paid model calls. No live-model quality claim.

No deployment/merge. Desktop user acceptance remains separate; Phase15 gaps unchanged. Phase-wide verification report, rather than this implementation summary, determines final status.

Final review fixes68b98ec/370fcd2 require explicit full-message intent, deduplicate semantic priorities, guard every initial generation route and preserve accepted unsaved-draft regeneration after context changes.
