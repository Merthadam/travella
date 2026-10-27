---
quick_id: 261027-uhp
status: complete
date: 2026-10-27
implementation_commit: f9a0eaa
---

# Replace legacy flight booking with guided checkout

Implemented the user's approved A guided flow with C's document confirmation on `feature/guided-flight-checkout`. Removed the old inline flight checkout and prototype runtime wiring. The prototype branch is preserved, and stay checkout remains intact.

The full-page flow verifies an actual offer, collects transient fictional passengers/contact details, reserves the fare, shows honest seat/baggage availability, and requires exact consent to sandbox payment and Plan persistence. Confirmed receipts save only bounded non-personal flight details through existing CRUD revision/challenge/idempotency contracts. Receipts reopen without a browser token and download as offline HTML. The print action is wired; native PDF output was not exercised.

The real sandbox run uncovered a pre-existing readback mismatch: LiteAPI now places the sandbox environment in `ticketData.pointOfSale.environment`. Supporting that location alongside the old field recovered the already-created booking without a duplicate. Missing, conflicting and production markers still fail closed, covered by regression tests.

Verification: 73 frontend tests passed (12 existing external SSE-fixture tests skipped), 75 backend tests passed, 8 checkout tests re-passed after the final focus adjustment, build and runtime-source hashes passed. Authenticated Chrome DevTools exercised BUD–MIL search, actual MXP flights, prebook, sandbox booking, error/recovery, Plan autosave/readback, tokenless reopening, offline download and desktop/mobile layouts. The task Plan was soft-deleted and its recovery state verified. Preview runs at http://localhost:5197 in an isolated stack; existing 5174 services were preserved. No merge or push.

All tasks in PLAN.md are complete. Evidence and limitations: `artifacts/testing/2026-10-27-guided-flight-checkout/verification.md`.
