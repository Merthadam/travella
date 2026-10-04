# Phase 12 — Travel studio onboarding

## Goal
Replace conversational first-login intake with the selected B Travel studio design: a deterministic four-step flow that saves reusable traveler preferences and resumes reliably.

## Locked user decisions
- D01: B is selected: split desktop layout with live travel-profile preview; top progress bar; modern, calm, engaging. Prototype commit fa94f5f; selection 4fcc2c5.
- D02: Home city is required. Nearby departure airports are offered for explicit selection; airport is optional. Existing Google Maps integration may be reused.
- D03: Citizenship is optional; support multiple citizenships and passport-style cards with search over a finite country list.
- D04: Needs are optional free text, separate accessibility requirements and food allergies/dietary needs. No preset disability checkboxes.
- D05: Interests are final; floating activity bubbles; custom interests; at least five to continue, or skip the entire step.
- D06: Save each step on Continue and resume later. Skipping optional steps also saves their visited/skipped status.
- D07: Existing users see this flow once, prefilled from their existing details.
- D08: Onboarding only. Later profile editing is deferred.
- D09: Non-agentic intake. Saved preferences must still reach the existing long-term profile/memory path for later Plan conversations.
- D10: NoSQL was an idea for later; retain existing CRUD-owned profile storage in this phase. Cheap, frequently read reference lists should not require model calls or a database query per render.

## Implementation decisions
- Use versioned onboarding completion (target version 2), independently of legacy onboarding_complete. Server derives resume position from saved step status, not from truthiness of optional values.
- Per-step explicit saves, no writes for each keystroke. Save failure keeps input and current step. Back preserves unsaved edits in this session; leaving only promises recovery of successfully saved steps.
- Skip does not silently erase prefilled legacy values. Clearing a selected country, field or interest followed by Continue is an explicit update. For interests, Skip leaves previously saved interests intact and discards unsaved changes on that step.
- Preserve all existing profile values; do not guess an old free-text city/airport into a verified selection or split arbitrary prose into interests. Keep legacy values available for review until the traveler explicitly replaces them.
- Profile save succeeds independently of AgentCore mirroring. Canonical CRUD snapshot wins over stale mirrored memory, including explicit cleared fields.
- Completion navigates to existing Plans landing after the final successful save. No additional review page or new settings route.

## Out of scope
Settings/preferences editor, new database, AI onboarding, new agent graph, bookings, passport scans, automatic nationality inference, provider search redesign, permanent storage of provider response payloads, production promotion of prototype switcher/A/C.

## Evidence
- ../../quick/261005-044-prototype-three-interactive-non-agentic-/261005-044-SUMMARY.md
- ../../../artifacts/testing/2026-10-05-onboarding-prototypes/plan/B-travel-studio.jpg
- ../../../artifacts/testing/2026-10-05-onboarding-prototypes/verification.md

## Open implementation prerequisite
Check effective Google key/API enablement without printing credentials. Use current Google Places attribution/session conventions. Confirm permitted persisted fields under the applicable Google terms; provider display/coordinate data must not be copied indefinitely into profile or memory by assumption. Preserve user-authored city text and durable place ID; keep provider lookup content ephemeral unless expressly permitted. This affects adapter design, not the chosen UI.
