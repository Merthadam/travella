---
status: complete
---
# Account menu prototypes

Delivered three development-only variants on the existing authenticated Plans route: A labelled dropdown, B avatar/account card, C account controls in left navigation. Floating switcher supports URL variants, arrow buttons, keyboard arrows, and a temporary theme toggle. Header actions are simulated. No production selection is assumed.

Preview: http://localhost:5188/plans?prototype=account-menu&variant=A
Start: `cd frontend && npm run prototype:account`

Verified with Chrome DevTools CLI: example-account sign-in, all variant interactions, dismissal, simulated actions, URL/reload, desktop/mobile, and light palette. Production build passed. Evidence: `artifacts/testing/2026-10-24-account-menu/verification.md`.

Capture pointer: local branch `prototype/account-menu-20261024`. This quick-task record is the local implementation context pointer; no external issue was created. User selection is pending. After selection, record the verdict here and implement the chosen design separately; remove prototype wiring from the production implementation branch while retaining this source branch.

## Subsequent user decision

User selected **B — Avatar & account card** on 2026-10-24. See DECISION.md. This supersedes the selection-pending status above. Production integration remains pending.
