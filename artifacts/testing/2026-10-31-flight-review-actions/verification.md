# Flight review actions removed

User requested removing Choose for trip and Discuss flight from the existing approved review. Removed that row, callback plumbing, attachment helpers and unused CSS. Itinerary, expandable fare terms, direct checkout and its preparation/cancellation safeguards remain. Existing comparison-based choice/discussion flows are preserved.

## Evidence

- [Requested removal](plan/remove-these-actions.png), [previous itinerary](plan/itinerary-before.png).
- [Updated desktop](implementation/itinerary-desktop.png), [mobile](implementation/itinerary-mobile.png), [expanded mobile fare](implementation/fare-mobile-expanded.png), [checkout](implementation/checkout-ready.png).

## Executed checks

- `npm --prefix frontend test -- src/features/plans/travel`: 250 passed, 12 existing external-fixture skips; 18 files passed, one skipped. Updated existing choice-contract tests to enter through retained comparison UI. Their first run exposed incomplete comparison setup; corrected to select two options and open comparison, then reran successfully. No production comparison behavior changed.
- `npm --prefix frontend run build`: passed with existing chunk-size warning. `git diff --check`: passed.
- Canonical Docker rebuilt with `bash scripts/start-local-ready.sh` after read-only Cognito precheck. Example-account sign-in/session/sign-out readiness passed. Running FlightDetails, TravelSearch and flight-review.css hashes matched local source.
- Authenticated example account in isolated Chrome DevTools MCP. Restored only the preceding verification Plan, searched actual BUD–LIS sandbox flights for 12–17 May 2027, then opened the review. The only buttons in the dialog were Close and Continue to checkout. Both removed controls were absent.
- Desktop 1440×1000 and mobile-width 390×844 inspected, including expanded fare terms. No horizontal overflow or overlapping controls; all screenshots visually inspected.
- Continue to checkout opened the existing populated checkout with matching itinerary and EUR 401.47. Frame sampling stayed in the dialog until the complete checkout grid appeared: no intermediate flash. No reservation, passenger, payment or booking submission.
- Inspected 246 network requests and console. Verification returned 200. Old snapshot retrieval returned 409 after rebuild and recovered via fresh search; no failure on the changed path. Existing Lit dev-mode warning and unnamed form-field issue remain; no JavaScript exception.
- Soft-deleted only verification Plan 33b03cc2-df23-4b16-9f9c-3d5ca2bf745f after checks; deleted-view read confirmed lifecycle and recovery deadline. User Plans preserved.

## Limits

12 fixture tests remain skipped. No physical-device or real-booking test, backend change, push, merge or deployment. Wider Phase 18 acceptance unchanged.
