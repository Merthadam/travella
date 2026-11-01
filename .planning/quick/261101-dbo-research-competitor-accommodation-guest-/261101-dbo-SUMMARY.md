---
status: complete
---
# Competitor guest-details research and three prototypes

User questioned whether guest details were sufficient and selected three interactive layouts. Official documentation supports contact/guest separation and one main guest per room; names-only is a sandbox convenience. Research distinguishes API/help documentation from live checkout observation.

Three variants delivered on the authenticated /plans host, with fictional context and memory-only behavior. A all-in-one recommended; B guided steps; C editable review. No winner selected, no production integration. Prototype primary source: branch prototype/stay-guests-20261101, commit 017c36f, isolated worktree /Users/adammerth/.codex/worktrees/travella-guest-prototypes-20261101. Start from frontend with npm run prototype:guests. Preview http://localhost:5199/plans?prototype=stay-guests&variant=A.

Build and actual Chrome DevTools example-account desktop/mobile checks passed. Validation, contact-versus-guest distinction, two-room scenario, requests, variant retention, reload reset and direct preview login exercised. Evidence: artifacts/testing/2026-11-01-stay-guest-prototypes/verification.md. All screenshot paths listed there. No booking/payment/Plan mutation, push or merge. Broader project acceptance unchanged.

Next: record user choice, then implement selected flow with explicit provider/backend field mapping and normal production testing. Optional fields currently simulate behavior only.
