# Selected design: B — Avatar & account card

Date: 2026-10-24
User selection: “b is perfect”

Use the compact circular person/avatar control at the upper right, opening the account card with “Your account”, supporting details, Account settings, and Sign out separated by a divider. Retain the hamburger and Travella brand on the left.

Source capture: `prototype/account-menu-20261024` at de8bb21.
Preview: http://localhost:5188/plans?prototype=account-menu&variant=B
Evidence: `artifacts/testing/2026-10-24-account-menu/plan/B-desktop.png` and `B-mobile.png`; existing verification record covers interactions and responsive layout.

Design selected. Production integration has not been performed in this prototype-selection task. When implementing, replace simulated actions with existing account/logout handlers, preserve navigation guards, implement production keyboard/focus behavior, remove prototype wiring from the implementation branch, and retain the source branch.

## Implementation — 2026-10-24

User subsequently requested “lets implement”. B is implemented by quick task 261024-ip3, with real handlers and browser verification. This supersedes the implementation-pending statement above. Prototype source remains on its captured branch.
