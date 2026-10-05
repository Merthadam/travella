# Google onboarding component fix — 2026-10-05

## Cause and changes

The custom address picker restricted predictions to street-address/premise types, excluding city queries such as Budapest. The first native-widget revision retained that restriction; removed it after reproducing the city lookup problem. Uses Google's default unrestricted PlaceAutocompleteElement with gmp-select and a native MapElement displayed immediately. Selected place geometry triggers nearby airport search; matching airports remain explicitly selectable. Empty nearby Google results now automatically fall back to the labeled airport catalog. Full saved address and existing CRUD contract are unchanged.

Google's BasicPlaceAutocompleteElement probe returned 403/API not activated (Places UI Kit). The standard PlaceAutocompleteElement works with the existing project, so no cloud services were enabled. [Google widget reference](https://developers.google.com/maps/documentation/javascript/reference/places-widget) and [widget guide](https://developers.google.com/maps/documentation/javascript/place-autocomplete-new) informed implementation. Regional Google billing/terms conditions have not been verified; this is a local implementation check, not policy clearance.

## Direct browser checks

Authenticated example account at http://localhost:5174, isolated Chrome context; no profile changes saved.

- Street-address input Andrássy út 22 Budapest: ArrowDown/Enter selected full formatted address, map showed home marker, BUD appeared automatically at approx. 17 km. Airport card click selected BUD.
- Final unrestricted city input Budapest: ArrowDown/Enter selected Budapest, Hungary. BUD appeared automatically at approx. 18 km. Its card selected correctly and Continue enabled.
- Initial map is real Google MapElement before an address is selected.
- Mobile 390px: no horizontal overflow; inspected full-page screenshot with selected address, map, airport card and Continue. Desktop 1440px: no horizontal overflow; inspected full-page city/airport screenshot. Input scrolls long address text internally; the selected-address card shows it in full.
- Manual fallback opened address/city fields.
- Google autocomplete/details/nearby calls returned 200. Auth/session and profile reads returned 200. No application console errors; Google Lit development warning and marker addListener deprecation warning remain. Canceled obsolete map tiles during viewport changes were observed, not failed Places requests.
- A clear-button check found Google's clear action did not propagate a normal bubbling input event. Added public-value comparison after capture-phase input/change/click/keyup events so selected address/airport cannot remain stale. Final check recorded below.

## Build and local runtime

`npm --prefix frontend run build` passed (existing large-chunk warning). Local Cognito precheck and start-local-ready auth cycle passed. Rebuilt canonical container and compared GoogleAddressSearch/HomeLocationMap/HomeStep/OnboardingFlow source hashes: match. Database volumes and profile contents preserved. No automated tests added or run, no merge/push.

## Evidence

- Existing B design and original screenshot remain the visual plan: [layout sketch](../2026-10-05-map-onboarding/plan/map-layout-sketch.jpg), [before](../2026-10-05-map-onboarding/plan/before-user-screenshot.png).
- [Mobile street address → BUD](implementation/mobile-google-address-airports.jpg).
- [Desktop Budapest → BUD](implementation/desktop-google-address-airports.jpg).

Persistence/save/reload was not re-exercised because this fix changes frontend search/map only and verification retained unsaved fixture edits. Backend evidence from the preceding change remains linked in its verification record. Error retry and empty-result automatic catalog fallback were reviewed in source but not fully exercised through provider failure injection.

## Final clear-selection regression check

Final rebuilt source hash matched. Fresh browser login succeeded. Budapest → keyboard selection → automatic BUD → select airport → Google Clear input passed: widget value empty, confirmed address removed, preferred airport removed, Continue disabled. Google updates its value after click handlers; reading the public value in a zero-delay task from the wrapper capture listener fixed it. No profile mutation was submitted.
