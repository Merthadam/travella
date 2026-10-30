---
status: complete
completed: 2026-10-30
commit: 7c8b7e9
---
# Shared booking recovery

Replaced separate flight/stay polling hooks with mode-aware useBookingSync. Receipt helpers now live in bookingReceipts.js; checkout and canvas callers use the shared helpers directly. Preserved endpoint, retry, storage, event, validation and enablement contracts. Updates during requests queue one follow-up and obsolete receipt responses are discarded.

Verification: 196 distinct relevant tests across 8 files passed; production build and diff checks passed. Chrome DevTools verified recovery races, opening receipts, actual CRUD persistence and reload using the example account and simulated provider status responses on a disposable Plan. Test Plan soft-deleted and isolated session signed out. Existing map unavailability and build chunk-size warnings remain outside scope. Full suites and live provider checkout not run.

Evidence: [verification record](../../../artifacts/testing/2026-10-30-booking-sync/verification.md).

Implementation commit: 7c8b7e9. Executed and reviewed inline under GSD quick. No phase acceptance changes.
