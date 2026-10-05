---
status: resolved
trigger: "this aint working just use google maps component if possible"
created: 2026-10-05
updated: 2026-10-05
---

## Symptoms
- Expected: built-in Google address selection and map with automatic nearby airports in B onboarding.
- Actual: user reports the previous custom interaction does not work; exact failing action requested asynchronously.
- Prior verification: mouse selection worked, keyboard selection unexplained, screenshots timed out.

## Current Focus
- hypothesis: custom autocomplete adds avoidable keyboard, loading and selection failure paths.
- next_action: probe official Google component with existing configuration, replace custom address UI, exercise browser interaction and rebuild.
- scope: frontend only, preserve existing profile data and save contract; no automated tests.

## Evidence
- Existing screen uses a custom combobox and native Google Map JavaScript constructor.
- Official Google docs provide PlaceAutocompleteElement, BasicPlaceAutocompleteElement and MapElement.
- Basic autocomplete supports a map but requires Places UI Kit enablement; probe before choosing.
- Mandatory Travella frontend skill read; existing direct-B/no-new-prototypes choice applies.

## Resolution
Root cause: address-only primary-type filter excluded city searches, alongside unnecessary custom combobox behavior. Replaced with Google PlaceAutocompleteElement and MapElement, removed type restriction. Keyboard city/street lookup and automatic BUD discovery passed. Native clear handling verified after final rebuild: address and airport clear, Continue disabled. Fresh browser login passed.

Evidence: artifacts/testing/2026-10-05-google-onboarding-component/verification.md.
