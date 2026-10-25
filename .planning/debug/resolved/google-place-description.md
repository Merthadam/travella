---
status: resolved
trigger: Google Maps description is still not visible for Purple Club Medellin
created: 2026-10-25
updated: 2026-10-25
---

## Symptoms
Expected: saved place details display available original Google Maps description.
Actual: expanded place shows photo, attribution, website and Maps links without a description or explanation.
Reproduction: open the existing Medellín plan and expand Purple Club Medellin.
Timeline: persists after prior description implementation; no visible error.

## Current Focus
hypothesis: confirmed provider data absence, hidden by an incomplete UI empty state.
next_action: complete; live missing-description limitation documented for the user.

## Evidence
- CanvasPlaceDetails skips fetching whenever googleDetails exists, including summary:null.
- addActivities persists null editorial summaries from search; the UI has no missing-description state when a website exists.
- Authenticated saved canvas read: all three Medellín venues have googleDetails with summary:null and a provider place ID.
- Fresh Google Place.fetchFields by each exact saved ID returned matching names and null editorialSummary/language. No available description was dropped.
- Official Google Maps JS Place reference documents editorialSummary:null as no editorial summary; undefined means not requested.
- Added explicit absence text and a read-only Check again action. Direct lookup verifies the provider ID hash against the saved pin. Existing saved text is preserved; no automatic refresh or Plan writes for saved metadata.
- 13 focused component tests pass, including direct ID matching, saved-null recheck, failure/retry, unchanged Plan and existing descriptions. Production build passes with existing large-chunk advisory.

## Resolution
Root cause: provider has no editorial description for the reported venues; the UI silently omitted the section and offered no recheck.
Fix: explain absent provider description, provide explicit recheck/loading/retry states, use exact known provider ID rather than text search when available.
Provider limitation: this fix cannot produce text absent from Google's API. Rechecked text is a live display; existing saved Plan metadata is not silently overwritten.

## Verification
- 13 focused tests and production build pass.
- Desktop/mobile browser recheck, simulated error/real retry, unchanged saved pin, console/network and screenshots verified.
- Running source hash and authentication readiness pass.
- Evidence: artifacts/testing/2026-10-25-place-descriptions/verification.md
