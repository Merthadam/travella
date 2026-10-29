# Destination country defaults — 2026-10-29

Continues the user's existing-form choice. Stays resolves Destination country from the Plan destination using a supported explicit country qualifier or the existing Google Maps geocoder. Only one unambiguous supported country is accepted. Guest nationality retains its separate profile default. Neither the Plan nor profile is changed, and rates are not searched automatically.

## Automated checks

```sh
npm --prefix frontend test -- src/features/plans/travel/travelDefaults.test.jsx src/features/plans/travel/TravelWorkspace.test.jsx src/features/plans/travel/TravelSearch.test.jsx src/features/plans/travel/StayDestination.test.jsx
npm --prefix frontend run build
git diff --check
```

- All 115 tests passed. Coverage includes Milan → IT without a traveler profile or flight provider, explicit country qualifiers, ambiguous/empty/partial/unknown results, failed geocoding, late responses after manual city/country edits, Plan changes, and restored manual country selections.
- An initial parameterized test incorrectly spread its array fixture into callback arguments. Corrected the fixture wrapper and reran the full focused set successfully.
- Production build passed with the existing bundle-size warning; whitespace check passed.
- No CRUD handlers changed.

## Browser checks

Chrome DevTools MCP, isolated browser, configured example account, canonical http://localhost:5174. Restored only the Milan fixture created in the preceding defaults test; preserved existing user Plans.

[UI plan](plan/destination-country.png) and [before state](implementation/before-country-default.png) captured and inspected.

- Rebuilt with `bash scripts/start-local-ready.sh` after the local Cognito precheck. Sign-in/session/sign-out readiness passed. Running container hashes match both changed source files.
- Opened Stays: Destination country became Italy, Guest nationality remained Hungary, and Milan suggestions loaded with `country_code=IT` (HTTP 200).
- Chose the Milan city suggestion and submitted: hotel search and public snapshot returned HTTP 200; 29 sandbox stays appeared.
- Changed Destination country to Austria, reloaded the page, and reopened Stays: Austria remained selected, Hungary remained the nationality, and the next place lookup used `country_code=AT` (HTTP 200).
- No console errors related to the change; only the existing Lit development warning. [Sanitized network and console evidence](browser-checks.json).
- Inspected the saved [default country](implementation/prefilled-italy.png), [successful results](implementation/italy-search-results.png), and [restored manual country](implementation/manual-country-restored.png) screenshots: readable and no clipping or overlap. Form layout is unchanged.
- Read back the fixture Plan destination/dates and profile home country/citizenship: unchanged. Deleted only this fixture with the existing challenge/commit API; active detail returned 404, deleted detail reported `deleted` with a recovery deadline. Returned the browser to Plans.

No remaining failed or blocked checks. Ambiguous/unavailable lookup behavior was exercised in automated tests; live browser searches used sandbox inventory. No supplier checkout was attempted.
