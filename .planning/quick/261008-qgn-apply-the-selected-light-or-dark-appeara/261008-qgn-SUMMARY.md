---
phase: quick-261008-qgn
plan: '01'
status: complete
completed: 2026-10-08
subsystem: frontend
key-decisions:
  - One application-root provider owns browser appearance across authenticated and signed-out routes.
  - Migrate the previous Account preference and retain selected C controls/layout.
  - Keep the dedicated preview on port5184 and use built assets to reduce Docker memory use.
---

# Application-wide appearance completed

Commit `756aee6` moves appearance ownership out of Account, introduces shared palette tokens and themes Plans, conversation/Markdown, Trip Brief, dialogs, authentication and onboarding surfaces. Existing Account selection migrates; navigation no longer restores the old document scheme. No API or data contract changed.

Both planned tasks completed inline through the GSD quick workflow. 41 focused tests and the production build passed. Chrome verified desktop/mobile dark/light navigation, direct reload, preserved unsent draft, sign-out/sign-in persistence, Plan dialog styling and clean final console/network. Six source files and all compiled assets matched the running container.

Before/design and inspected implementation screenshots are linked in [verification](../../../artifacts/testing/2026-10-08-global-appearance/verification.md).

Preview: http://localhost:5184/account. Docker's initial OOM interruption was resolved by serving the production build in the dedicated container and rerunning the affected checks. Shared database/network dependencies and the existing runtime migration compatibility remain. No fresh onboarding submission or unrelated broad test rerun was performed; external provider map imagery was unchanged.
