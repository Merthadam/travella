---
status: planned
created: 2026-10-30
---
# Consolidate booking status recovery

User approved one mode-aware useBookingSync hook after discussing the differences. Prototype offer was made in the preceding discussion; proceed with the approved internal refactor and existing UI as visual reference.

1. Capture the current canvas as the unchanged visual target using Chrome DevTools. Replace flight/stay polling hooks with one useBookingSync hook and shared receipt helpers; update imports and canvas callers. Preserve storage keys, event names, mode-specific endpoint, retry statuses, validation, enablement and callback behavior. Queue updates during in-flight requests.
2. Consolidate polling tests across both modes. Verify recovery, pending and mode-specific missing results, request overlap, late responses, cleanup, retry bounds, errors and updated callbacks. Run relevant checkout/canvas regressions and frontend build.
3. Exercise real browser recovery with the example account, inspect console/network and screenshots. Save evidence at artifacts/testing/2026-10-30-booking-sync. Record exact limitations if blocked. Review and commit changes and update GSD state.

Execute inline. No backend changes or new provider mutations. Acceptance: one polling implementation, one active request per hook, no lost update trigger, stale Plan responses ignored, existing flight/stay policies retained.

<threat_model>
ASVS level 1, blocking threshold high. Preserve Plan-scoped receipt keys and status-only requests, terminal-result sandbox checks and flight mode validation. Keep receipt tokens out of logs and evidence. Do not overwrite existing user's Plans during verification.
</threat_model>
