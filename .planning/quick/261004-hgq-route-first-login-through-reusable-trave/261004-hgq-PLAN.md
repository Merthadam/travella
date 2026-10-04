---
quick_id: 261004-hgq
description: Route first login through reusable traveler profile onboarding
status: incomplete
---

# Plan: first-login intake and reusable traveler profile

## Goal

After a successful sign-in, route travelers without a completed profile into the selected lightweight conversational intake. Let them skip, review extracted candidates, and explicitly save a reusable traveler profile before opening Plans.

## Architecture

- CRUD is the canonical durable owner of the traveler profile, keyed only by the verified token subject. Add a one-row-per-traveler profile resource and migration.
- Auth remains the browser BFF: after session verification, the frontend reads profile-completion status through the profile route; auth proxies profile CRUD and the dedicated onboarding agent endpoint using its existing server-held access token.
- The agent onboarding endpoint invokes only the existing single-node intake graph. It remains stateless between requests; browser sends bounded conversation turns.
- AgentCore Memory stays outside this increment: it is disabled in this repository, and the documented automatic preference strategy is an extraction/retrieval facility rather than an editable canonical profile. Do not duplicate sensitive details into it.
- The frontend presents the selected chat-style onboarding, explicit review/save, skip, and existing Plans UI after completion. Profile details are reusable across future Plans.

## Acceptance criteria

1. After successful session verification, the profile read determines whether onboarding is needed; completed profiles open Plans directly.
2. Onboarding uses a dedicated endpoint and the isolated node only; it does not create a Plan, search, use tools, or save data.
3. Only allowlisted, grounded answer candidates can enter the review draft. The traveler can edit/omit fields before an explicit save.
4. CRUD persists and reads the profile using token-derived traveler ownership; unauthenticated and other-owner requests are rejected.
5. Skip completes onboarding with an empty profile. Returning users with a completed profile open Plans directly.
6. No exact home street address is requested or persisted. Sensitive profile fields do not appear in logs, URLs, agent checkpoints, or browser error output.

## Verification

- CRUD API integration coverage for create/read/update, ownership, invalid input, and skip completion.
- Auth API tests for first-login status and proxy authorization.
- Agent tests for endpoint validation and no tool calls.
- Frontend component tests plus required authenticated Chrome DevTools journey, screenshots, and console/network review.
- Record AgentCore Memory as not integrated/enabled; do not claim data is saved there.

## Execution result

- Implemented the profile table and migration, authenticated CRUD profile resource, auth-side profile and onboarding proxies, agent endpoint, first-login route, conversational review/save/skip UI, and focused tests.
- Automated results: CRUD/auth/agent suite **77 passed, 1 skipped**; frontend suite **26 passed**; Ruff and `git diff --check` passed; production frontend build passed.
- Incomplete gate: local browser verification could not run because local Cognito/session/OpenAI configuration is absent, and Chrome DevTools cannot attach to its already-running profile. See `artifacts/testing/2026-10-04-first-login-onboarding/verification.md`.
- The saved profile is not yet passed into future Plan context or provider searches, and there is no profile settings page for editing completed profiles. Both remain outside the intake node and outside this increment.
