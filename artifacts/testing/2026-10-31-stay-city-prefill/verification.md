# Stay destination city prefill — 2026-10-31

## Scope and expected behavior

Keep the existing layout, as selected by the user. A saved `Lisbon, Portugal` destination should seed `Lisbon` in the stay destination field and Portugal in its country field. The traveler chooses a provider suggestion before submitting. The full saved Plan destination and manual search edits must be preserved.

## Diagnosis and change

`initialWorkspace` copied the complete display label into the provider query. `StayDestination` correctly sends a separate `country_code`, but the qualified query returned no suggestions. The default now uses the city portion; country inference still sees the full original label. Recovery repairs only an untouched old default with no selected place or applied search. No CRUD handlers or durable Plan content changed.

## Automated verification

- Before the fix: four new regression cases failed, reproducing qualified country names/codes, whitespace, and untouched legacy recovery.
- `cd frontend && npm test -- src/features/plans/travel/travelDefaults.test.jsx src/features/plans/travel/TravelSearch.test.jsx src/features/plans/travel/TravelWorkspace.test.jsx src/features/plans/travel/CanvasTravelJourney.test.jsx`: **131 passed, 1 skipped**. The existing Python SSE fixture test requires `TRAVELLA_CANVAS_SSE_FIXTURE`; it is unrelated to this defaulting change.
- `cd frontend && npm run build`: passed. Existing large-bundle warning remains.
- `git diff --check`: passed.
- `bash scripts/start-local-ready.sh`: health, example-account sign-in, session, and sign-out passed.
- SHA-256 comparison for `travelDefaults.js` and `useTravelWorkspace.js`: checkout and running app container both match.

## Browser verification

Used Chrome DevTools MCP in an isolated headless browser, authenticated with the configured example account. The connected MCP profile was occupied; a separate instance of the same Chrome DevTools MCP avoided interfering with it.

Local URL: `http://localhost:5174`. Used the existing local Lisbon verification Plan to reproduce the reported form, without modifying its saved details or choices. Search observations were created during this run. No booking or model call was made.

1. Reproduced `Lisbon, Portugal` with no destination suggestions before the fix. Preserved the supplied before screenshot. Captured a labeled static preview; the initial preview was replaced after visual inspection showed a React rerender had restored the old field value.
2. Rebuilt the app and reloaded the untouched old workspace. Destination became `Lisbon`; country remained Portugal, nationality Hungary, dates May 12–17, 2027, with two guests.
3. Actual `GET .../travel/places?q=Lisbon&country_code=PT` returned HTTP 200 and Lisbon/Benfica suggestions.
4. Explicitly selected Lisbon, then clicked Search stays. `POST .../travel/hotels/search` and its registered observation fetch returned HTTP 200; the UI displayed **28 sandbox stays**, including Meliá Lisboa Aeroporto and HF Fénix Lisboa.
5. Reloaded and reopened accommodation. Selected Lisbon and the 28 results recovered successfully.
6. Inspected the narrow 500px viewport: document width also 500px; city, dates, country, nationality, currency, and search action readable without horizontal overflow.
7. Inspected console/network: no console errors and no failed requests in the affected journey. Existing Lit development and Google Maps event-listener warnings appeared before reload; no errors appeared afterward.
8. Inspected saved preview, desktop suggestions/results, and narrow screenshots. No new clipping or unreadable controls. The existing suggestion popup intentionally overlays the fields beneath it until selection.

## Evidence

- [Reported before state](plan/reported-before.png)
- [Labeled city-only preview](plan/city-only-preview.png)
- [Actual provider suggestions](implementation/city-suggestions.png)
- [Successful sandbox search](implementation/search-results.png)
- [Narrow layout after reload](implementation/narrow-reloaded.png)

No backend CRUD changes; the CRUD verification gate does not apply. The local app remains running with this fix. Changes have not been pushed to remote main.
