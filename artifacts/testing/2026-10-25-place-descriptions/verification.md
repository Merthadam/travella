# Google place description verification — 2026-10-25

## Finding and limitation
Authenticated canvas read shows all three Medellín venues have persisted googleDetails with summary:null and their exact Google place IDs. Fresh Place.fetchFields requests for those exact identities returned matching venue names and null editorialSummary/language for LEYENDA URBANA, Bora Bora Social Club, and Purple Club Medellin. The API supplied no editorial text to display. The Google Maps website may expose other kinds of content; this investigation concerns the original editorialSummary used by Travella.

[Google Place reference](https://developers.google.com/maps/documentation/javascript/reference/place#Place.editorialSummary) documents null as no editorial summary and undefined as not requested.

## Change
The expanded saved place now explicitly explains when Google has not provided a description, with an on-demand Check again action. Rechecks use the saved provider ID and verify its hash against the saved pin identity. Missing data and failed requests have distinct states; failures offer Retry details. Existing saved descriptions remain verbatim. Rechecking previously saved details is read-only: newly available provider text is shown for that open component, and saved Plan metadata is not silently overwritten. There is no fallback to generated text or reviews.

## Evidence
- [User before screenshot](plan/before.png)
- [Pre-implementation layout sketch](plan/layout-sketch.png)
- [Desktop result](implementation/desktop.png)
- [Mobile result](implementation/mobile.png)

Sketch and implementation captured with Chrome DevTools, then cropped to the affected place row to exclude unrelated content. Saved images visually inspected. Mobile place list remains scrollable; its message and button wrap without page overflow. The user's earlier choice to proceed without prototype alternatives was honored.

## Executed checks
- `NODE_OPTIONS=--no-experimental-webstorage npm test -- src/features/plans/components/CanvasPlaceDetails.test.jsx src/features/plans/components/PlaceWebsites.test.jsx`: 13/13 pass.
- Regression coverage: saved summaries including null, exact-identity resolution, unsafe website rejection, explicit direct-ID recheck, loading, failure/retry, newly available summary, no silent writes, provider-ID mismatch, stale response isolation, no generated-description substitution.
- `npm run build`: pass; existing large-chunk advisory.
- Existing Cognito precheck and `bash scripts/start-local-ready.sh`: pass. Sign-in/session/sign-out readiness confirmed.
- Running container SHA-256 matches changed CanvasPlaceDetails.jsx.
- Chrome DevTools authenticated as the example account at localhost:5174. Existing reported Plan inspected without durable edits.
- Desktop 1440×1000: expanded Purple Club shows missing-description message and Check again; click completes and remains an honest empty state.
- FastAPI canvas read before and after browser recheck: exact saved Purple Club pin unchanged.
- Simulated provider failure in test-tab Place.fetchFields: browser shows Couldn’t load Google Maps details and Retry details. Original provider method restored; real retry succeeds and returns missing-description state. No synthetic text was saved.
- Mobile 390×844: reload restores expanded place, missing-description message and Check again; document width equals viewport, no horizontal overflow.
- Console: no errors in real flow. Existing Lit development-mode and Google marker API warnings only.
- All 19 inspected fetch/XHR requests returned 200, including actual provider details and canvas reads.
- `git diff --check`: pass.

## Scope
Frontend component and its tests only. No backend CRUD handlers, schemas, database migrations, or saved data changed. The original Google description remains unavailable for the reported venues; the verified fix addresses silent absence and inability to recheck it.
