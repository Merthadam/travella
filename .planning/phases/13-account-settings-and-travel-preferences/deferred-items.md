# Phase 13 deferred verification debt

## Existing frontend tests (confirmed at pre-phase commit 49e6d526)

`npm --prefix frontend test -- src/AccountApp.test.jsx src/PlansApp.test.jsx src/features/account/AccountSettingsPage.test.jsx` ran during 13-01. Final run: 21 passed, 12 failed; all newly added account and preservation tests pass. A temporary `git archive 49e6d526` checkout reproduced the original six AccountApp and seven PlansApp failures before implementation, with existing node_modules linked and shared catalogs archived. No production workaround was introduced for old mocks.

- Five remaining AccountApp failures use legacy onboarding completion fixtures or the removed conversational onboarding UI: MFA challenge → My plans; recovery code → sign-in; refreshed session → My plans; first-login collect/review; first-login skip. Existing production correctly checks onboarding.completed_version >= 2. The directly affected old enrollment shortcut test was replaced with account-route navigation coverage and now passes.
- Seven PlansApp failures use makeApi without researchContext, causing `TypeError: api.researchContext is not a function` in useTripContext. Failures: create/open chat; delete/restore; streamed conversation; drawer switching; history failure; legacy conversation URL; direct Plan URL. The new account suspension test supplies the current API contract independently and passes.

These are pre-existing test-fixture debts, not verified application regressions. Resolve in an authorized follow-up; do not claim the complete frontend suite passed.

## Browser gate completed

13-05 completed the required real Chrome interactions, SQL concurrency, container freshness and seven inspected screenshots. See the current account verification record. The original 13-01 note below describes its then-pending gate, which is now closed; WINDOWS entry 3 is fixed.

## Additional baseline debt observed by 13-05 full suites

The full frontend run adds four unchanged PlanConversation tests with absent `researchContext` mocks and one unchanged TripBrief expectation for old inline confirmation. Total full frontend result: 48 passed / 17 failed. Source/test comparison against 49e6d526 shows these files are unchanged.

Full Python selection: 203 passed / 2 failed / 1 error. Existing PostgreSQL Plan-delete integration expects no confirmation (actual 409); migration-head assertion expects 0008 rather than existing 0009; migration test environment interaction causes the next database fixture safety guard to stop. Standalone constraints test expects IntegrityError for VARCHAR overflow but PostgreSQL/psycopg raises DataError. No false full-suite pass or unrelated repair is claimed.

Chrome DevTools example-account save/reload, selected Plan return, desktop/mobile light/dark screenshots, console/network review and container source hashes remain 13-05 deliverables. No live browser verification is claimed by 13-01.
