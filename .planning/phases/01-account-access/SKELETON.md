# Walking Skeleton — Travella

**Phase:** 1
**Generated:** 2026-09-26

## Capability Proven End-to-End

A traveler can register, verify an email in a test Cognito boundary, sign in, and load a private My plans route whose API response is authorized from the validated token subject.

## Architectural Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Identity | Amazon Cognito User Pool | Managed password, verification, token, and MFA authority already accepted by the project. |
| Public boundary | Travella-owned auth UI plus shared token-validation adapter | Keeps branded flows while making every public service independently enforce authorization. |
| Durable owner | CRUD service | Later Plan data must not be written by the browser or agent service. |
| Browser session | Short-lived access token with bounded refresh policy | Supports convenience without exceeding the 30-day product session maximum. |
| Deployment | Local full-stack development with environment-backed Cognito settings | Infrastructure products remain open; the contract must be testable before deployment selection. |
| Directory layout | Feature-owned auth module plus shared contract/test fixtures | Auth behavior is reused by later private Plan routes without owning Plan data. |

## Stack Touched in Phase 1

- [ ] Project scaffold and test runner (Wave 0)
- [ ] Routing — registration/sign-in and one private My plans route
- [ ] Database — one authenticated read and one write in the selected CRUD store
- [ ] UI — one form action wired through auth boundary to private route
- [ ] Deployment — documented local full-stack command with Cognito test configuration

## Out of Scope

- Plan CRUD and Conversation behavior
- Provider search, map workspace, supplier handoff, and agent graph implementation
- Profile editing, social sign-in, sign-out everywhere, and support-led MFA bypass
- Final database/compute product selection where not required for the walking slice

## Subsequent Slice Plan

- Phase 2: authenticated Draft Plan lifecycle on the same token-derived ownership boundary
- Phase 3: Plan-scoped Conversation and Planning Brief
- Phase 4: destination research and evidence projections
