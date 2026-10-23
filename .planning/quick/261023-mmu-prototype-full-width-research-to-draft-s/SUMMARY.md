---
status: complete
---
# Full-width state bar prototypes

User rejected the earlier navigation variants and clarified: preserve numbered stages, span the entire research workspace, make the coming draft explicit, and discourage premature generation.

Built A (action at edge), B (action within next stage), C (readiness disclosure) on the existing authenticated Plans route. Existing conversation/A2UI retained; all mutation/generation behavior simulated. Early/ready scenes, review, flight confirmation, loading, failure, draft and return-to-research are interactive.

Chrome DevTools checks passed for all variants on desktop/mobile; screenshots inspected; console/network clean apart from Lit dev warning. Build and diff checks passed; existing bundle size warning. No production readiness policy selected, no real generation or persistence tested. Broader stability work remains outstanding.

Primary source: `prototype/full-width-state-bar-20261023`.
Evidence: `artifacts/testing/2026-10-23-state-bar/verification.md`.
Run: `npm --prefix frontend run prototype:navigation`.
Preview: `http://localhost:5177/plans?prototype=state-bar&variant=A` (B/C).
All three opened for the user. Await choice; do not promote automatically.
Executed inline in GSD quick workflow.
