# Travel studio onboarding — implementation plan

**Chosen design:** B. **Status:** planned; implementation has not started.

## Traveler flow
1. Home city (required), then choose an optional departure airport.
2. Optional citizenships, selected through searchable passport cards.
3. Optional free-text accessibility and food allergy/dietary needs.
4. Floating activity bubbles and custom interests: choose at least five, or Skip.

Top progress and live profile preview follow B. Continue/Skip saves that step; reopening resumes the next unfinished step. Existing users enter the new flow once, with saved details prefilled. Final successful save opens Plans.

## Implementation order
| Wave | Plan | Delivers |
|---|---|---|
| 1 | [12-01](12-01-PLAN.md) | Structured profile fields, atomic step saves and a working home/save/resume slice |
| 2 | [12-02](12-02-PLAN.md) | Google city selection, inexpensive static catalogs and nearby airport choices |
| 3 | [12-03](12-03-PLAN.md) | Complete selected B UI, optional needs/citizenships, floating/custom interests |
| 4 | [12-04](12-04-PLAN.md) | Prefilled rollout for existing users, complete memory projection and browser/API verification |

## What goes where
- Existing CRUD database: traveler-selected values, saved-step status and completion version.
- Static catalogs: countries, starter interests and airport reference data. No model call or database read per bubble/card render.
- Google Places: city lookup; only permitted fields persist, suggestions/details remain transient by default.
- Existing agent memory integration: saved travel preferences, excluding onboarding progress and internal save metadata. Canonical profile remains usable if mirroring is unavailable.

## Delivery checks
Manual browser and API checks cover new and existing accounts, data preservation, saves/reloads/resume, skips, five-interest rule, custom interests, API errors/retry/conflicts, real Places lookup/failure, keyboard use, reduced motion, desktop and 390px mobile. Screenshot evidence is required. Automated tests are not part of the current authorization.

## Deferred
Travel preferences editor, NoSQL migration, new agent flow, AI-driven onboarding and booking features.

## Before real provider integration
Confirm existing key/API readiness without exposing credentials; settle permitted provider-field retention. These are execution prerequisites, not assumptions that the current key already supports new Places APIs.

## Design and planning evidence
- [Selected B screenshot](../../../artifacts/testing/2026-10-05-onboarding-prototypes/plan/B-travel-studio.jpg)
- [Prototype browser evidence](../../../artifacts/testing/2026-10-05-onboarding-prototypes/verification.md)
- [Planning review](12-PLAN-REVIEW.md)
