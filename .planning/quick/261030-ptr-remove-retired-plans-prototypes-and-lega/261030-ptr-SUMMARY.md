---
status: complete
---
# Retired Plans UI removed

Source commit: `1d5bdcc`. Deleted 11 retired files, development prototype routing/scripts, legacy PlanWorkspace state/effects/handlers and five unused frontend API helpers. Removed 114 stylesheet rules and obsolete dark-mode selector branches. Net source/test reduction: 717 lines. Current journal, conversation, canvas and deleted-plan restoration remain.

Dedicated opening/error states replace the stale active-grid fallback. The restore dialog retains the shared confirmation/revision/idempotency contract. Three behavioral regressions cover pending/failed opening and retry after a completed restore.

Validation: 77 focused frontend tests and build passed; CSS output decreased by 56.18 kB (19.6%). Chrome DevTools authenticated create/open/rename/reload/delete/reload/restore/reload, filters, themes, true 390-pixel mobile layout and actual missing-plan recovery passed. Conversation screenshots are pixel-identical. No legacy brief/destination requests after opening. Task-owned fixture cleaned through normal soft deletion, confirmed by API readback. No model/provider generation invoked; no other Plan modified.

[Verification and screenshots](../../../../artifacts/testing/2026-10-30-plans-cleanup/verification.md).

GSD quick executed inline. Current design/no-prototype preference preserved. No backend changes, Docker rebuild, push, merge or deployment. Wider phase acceptance unchanged.
