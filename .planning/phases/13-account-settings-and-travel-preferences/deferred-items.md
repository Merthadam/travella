# Phase 13 deferred verification debt

## Existing frontend tests (confirmed at pre-phase commit 49e6d526)

`npm --prefix frontend test -- src/AccountApp.test.jsx src/PlansApp.test.jsx src/features/account/AccountSettingsPage.test.jsx` ran during 13-01. Final run: 21 passed, 12 failed; all newly added account and preservation tests pass. A temporary `git archive 49e6d526` checkout reproduced the original six AccountApp and seven PlansApp failures before implementation, with existing node_modules linked and shared catalogs archived. No production workaround was introduced for old mocks.

- Five remaining AccountApp failures use legacy onboarding completion fixtures or the removed conversational onboarding UI: MFA challenge → My plans; recovery code → sign-in; refreshed session → My plans; first-login collect/review; first-login skip. Existing production correctly checks onboarding.completed_version >= 2. The directly affected old enrollment shortcut test was replaced with account-route navigation coverage and now passes.
- Seven PlansApp failures use makeApi without researchContext, causing `TypeError: api.researchContext is not a function` in useTripContext. Failures: create/open chat; delete/restore; streamed conversation; drawer switching; history failure; legacy conversation URL; direct Plan URL. The new account suspension test supplies the current API contract independently and passes.

These are pre-existing test-fixture debts, not verified application regressions. Resolve in an authorized follow-up; do not claim the complete frontend suite passed.

## Planned browser gate

Chrome DevTools example-account save/reload, selected Plan return, desktop/mobile light/dark screenshots, console/network review and container source hashes remain 13-05 deliverables. No live browser verification is claimed by 13-01.
