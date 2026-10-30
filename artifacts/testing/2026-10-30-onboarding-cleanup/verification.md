# Onboarding cleanup — 30 October 2026

Source commit: `f5bc702`. Approved dead-code cleanup with current design preserved; existing no-prototype choice honored.

## Changes

Removed four uncalled Places helpers (`createPlacesSession`, `searchCities`, `resolveCity`, `searchAddresses`), their private `resolvedCityDetails` cache, and the uncalled `saveTravelerProfile` frontend API wrapper. Removed eight unused `.ts-city-results` / `.ts-chosen-home` CSS rules and six related branches in dark-theme selectors. Net 98 source lines removed across four files.

All live steps, address widget, map, profile preview, airport catalog helpers and existing-profile compatibility remain. `textOf`, address resolution, map restoration and airport matching are still used and retained. No backend endpoints changed. Source search confirms removed identifiers have no remaining frontend references; diff check passed.

## Automated checks

Executed from `frontend/`:

```sh
NODE_OPTIONS=--no-experimental-webstorage npm test -- src/AccountApp.test.jsx src/features/account/PreferenceSettings.test.jsx src/features/account/AccountSettingsPage.test.jsx src/features/plans/travel/SearchSelect.test.jsx src/features/plans/travel/travelDefaults.test.js
npm run build
```

62 tests passed across five files; no skips or failures. Existing coverage includes onboarding resume/continue/skip and account preference behavior. Production build passed (604 modules). CSS is 224.35 kB, down from 226.05 kB before this cleanup; main JS 1,152.89 kB. Existing large-chunk build warning remains.

## Chrome DevTools checks

Used the installed Chrome DevTools MCP server in an isolated browser, source Vite preview at `http://localhost:5200`, and the existing backend at port 8003. Signed in with the configured example account without storing credentials in evidence.

The example account already completed onboarding. To avoid replacing its real preferences, mounted the unchanged production `OnboardingFlow` in the authenticated page with a synthetic blank profile and memory-only responses for onboarding saves. A visible banner labels this simulation. All production components, CSS, catalogs and event handlers ran in Chrome; save responses were simulated. No real profile writes were made. Reload removed the temporary fixture and restored normal account settings.

- Before/after home screenshots at 1440×1000 desktop and 390×844 mobile are **byte-identical**.
- Mobile: used manual address fallback; entered a synthetic Lisbon address; searched the actual airport catalog and selected LIS; continued to Citizenship; selected Portugal; used Back and confirmed address/airport remained; continued to Needs; entered a synthetic dietary preference; selected five interests; completed onboarding. Fixture state confirmed LIS, PT and five interests.
- Desktop: retried unavailable Google search, used manual address entry, chose an airport later, completed Home and skipped all three optional steps. Completion callback fired; fixture statuses showed Home completed and remaining steps skipped.
- Real account settings before and after cleanup: opened Home base and Citizenship editors and canceled, preserving the saved profile. Reload returned to the authenticated account page. Session, profile and account GETs all returned 200.
- Inspected console/network: no errors in the final authenticated check, only the Lit development-mode warning. [Console](console-check.txt), [network](network-check.txt).
- Visually inspected all saved screenshots: no clipping, overlapping controls or unreadable content in the checked states. Mobile completion had no horizontal overflow.

## Screenshot evidence

| State | Before | After |
|---|---|---|
| Desktop home | [Before](plan/home-desktop-before.png) | [After](implementation/home-desktop-after.png) |
| Mobile home | [Before](plan/home-mobile-before.png) | [After](implementation/home-mobile-after.png) |
| Manual address and airport | — | [Mobile](implementation/manual-home-mobile.png) |
| Citizenship | — | [Mobile](implementation/citizenship-mobile.png) |
| Needs | — | [Mobile](implementation/needs-mobile.png) |
| Interests | — | [Mobile](implementation/interests-mobile.png) |

## Limits and cleanup

Onboarding persistence was simulated in browser; no claim of a live backend onboarding write or durable reload test. Existing automated onboarding API mocks passed. Google Maps key is absent in this preview (`mapsConfigured: false`), so Google autocomplete, nearby-airport provider calls and map rendering were not verified; their existing unavailable/manual/catalog fallback was exercised. No backend changes or new persistent records. Temporary fixture removed on reload; task-owned browser/server stopped. Shared Docker services left running. No push or deployment.
