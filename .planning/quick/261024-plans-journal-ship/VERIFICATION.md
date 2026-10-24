---
status: passed
source: e656d9f
base: 08007cc
---

# Plans journal shipment

User explicitly authorized merging the complete approved journal and follow-up rename/card-navigation work to main. Integrated current main's account-menu/login work in `e656d9f` without replacing it. Conflicts in planning history and the PlansApp rendering expression were resolved by preserving both features, including `PlanConversation inactive`. The decorative title period is now hidden from the accessible heading name, fixing integrated account-test expectations without changing the appearance.

- Integrated frontend: 87 passed across PlansApp, AccountApp, AccountMenu, AccountSettingsPage, PlanningCanvas, PlanDrawers and DestinationPhoto suites.
- CRUD: 73 passed, 7 environment-dependent PostgreSQL skips. Real local PostgreSQL lifecycle verification from journal implementation remains applicable.
- Production build and `git diff --check` passed. Existing chunk-size and dependency deprecation advisories only.
- Rebuilt local stack from this checkout. Initial startup auth check returned 503; health confirmed configured authentication and Cognito connectivity, existing browser session worked, then standalone sign-in/session/sign-out check passed. No password/account configuration changes.
- Authenticated Chrome DevTools smoke: journal and avatar menu together on desktop/mobile; card opened test-owned Research plan; an unsent composer draft survived Account settings and return. Task-owned plan soft-deleted and read back. Existing plans unchanged.
- Final console: Lit development warning only. 17 fetch/XHR/image requests inspected, no failures.
- Runtime source hashes matched PlansApp, PlansJournal, journal CSS, AccountMenu and CRUD summary module. Screenshots visually inspected.
- Scoped `SECURITY.md`: `threats_open: 0`.

Evidence: `artifacts/testing/2026-10-24-plans-journal-ship/verification.md`, plus the production, rename and card-navigation reports referenced there. This shipment does not assert completion of unrelated Phase 17 live-model acceptance. Separate dirty main checkout is preserved.
