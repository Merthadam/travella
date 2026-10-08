# Phase 13 — Account settings and travel preferences

## Locked user decisions
User requested the complete GSD workflow to generate the real account page after choosing prototype C (“c would be perfect”). Continue through planning, implementation and verification. The discussion and prototype selection have already happened; do not ask again.

- Use C: settings list with adjacent inline editor; grouped selector on mobile.
- Support light and dark mode across this account interface, with an explicit theme control.
- Personal details: first name, last name, email (verified changes).
- Travel preferences: all existing onboarding answers — home location/city, optional airport, multiple citizenships, dietary/food needs, accessibility needs, curated and custom interests.
- Optional fields can be removed; no five-interest minimum for editing an existing profile.
- Security: password change, authenticator management and recovery codes using real existing identity service contracts, extended where necessary.
- Explicit Save/Cancel per setting; protect unsaved edits, show real errors and retain ordinary drafts after failures. No successful UI before acknowledged saved state.
- Updated profile informs future suggestions; existing confirmed Plan details are never silently changed.
- Account deletion and sign-out-all-devices are outside the agreed page scope.

## Design source
Branch `prototype/account-settings`, selected variant C in `frontend/src/prototypes/AccountSettingsPrototype.jsx`. Screenshot source: `artifacts/testing/2026-10-05-account-prototypes/plan/c-light.png`, `c-dark.png`, and mobile equivalents. Keep prototype source on its throwaway branch; build a proper production feature instead of shipping stubs or all variants.

## Implementation discretion
Reuse project auth/cookie boundary, CRUD ownership, revision/idempotency and memory projection. Prefer account edits that keep onboarding completion and unrelated profile fields unchanged. Reuse canonical catalogs and place controls. Exact API decomposition, safe identity-verification steps, tests and small accessibility/responsive adjustments are implementation choices. No cloud provisioning/configuration changes or actual credential/email/MFA mutations on the shared example account just for testing.

## Delivery gates
Follow docs/skills/travella-testing/SKILL.md: real HTTP CRUD integration with test DB, Chrome DevTools authenticated journey using the example account, screenshots and sanitized evidence, read-back/reload, ownership and failure checks. Read .agents/skills/travella-local/SKILL.md before local rebuild. Record exact external blockers without overstating completion. Existing earlier-phase verification debt must not be relabeled complete.
# Storage follow-up decision (2026-10-06)

During implementation the user explicitly chose: “Finish the settings page on SQL; plan DynamoDB next.” Phase 13 retains the existing SQL persistence. Plan a subsequent traveler-profile DynamoDB migration; do not migrate this delivery or move identity/security ownership from Cognito/Auth. Keep CRUD as the durable profile owner and AgentCore Memory advisory.
