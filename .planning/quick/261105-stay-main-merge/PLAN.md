# Accommodation location and map shipment

User explicitly requested merging the completed branch into main on 2026-11-05. Scope is this verified branch, not completion of wider Phase 18.

1. Merge current origin/main (97d610a), preserving its shared automatic hotel/airport pin identity and schema contracts.
2. Retain this branch's flexible activity/landmark filters, agent/manual parity, linked map/card inspection, independent scrolling and quiet feedback.
3. Reconcile the overlapping hotel-pin fix through the shared resolver. Preserve recovered reservation coordinates, matching cancellation cleanup, legacy `booked_stay` identity and traveler edits without a second pin path.
4. Run affected frontend/backend checks, production build, scoped security review and authenticated browser checks on the rebuilt canonical runtime.
5. Push, create a reviewable PR, inspect GitHub merge/check state, and merge using the user's existing authorization. Preserve unrelated worktrees and local main history.
