# Places list photos and control cleanup — 2026-10-10

## Scope and design

User retained approved alternative A, requested removal of Find places and Search your places, and requested photos beside list entries. The existing List/Map tabs, filters, expandable notes and removal flow remain.

- [Before](plan/before.png)
- [User list reference](plan/user-list-reference.png)
- [Desktop dark](implementation/desktop-list-dark.png)
- [Desktop light](implementation/desktop-list-light.png)
- [Phone details](implementation/phone-details-dark.png)
- [Phone light](implementation/phone-details-light.png)
- [Map regression](implementation/desktop-map-dark.png)
- [Photo failure fallback](implementation/phone-photo-unavailable.png)

## Implementation

Removed both controls and obsolete query, conversation-focus actions and styles. Added lazy visible-row Google Places thumbnails with contributor attribution outside the row button. Photos are resolved only when the provider ID hash matches the saved pin identity; similar results never substitute. Photos remain ephemeral. Unsupported IDs, missing matches, provider errors and broken images leave readable text-only rows. No durable schema or backend changes.

## Executed verification

- Focused Vitest run: 4 files, **21 tests passed** (DestinationMap, PlanningCanvas, CanvasDestinationMap, CanvasPlacePhoto), using `NODE_OPTIONS=--no-experimental-webstorage npm --prefix frontend test -- --run` with those paths. Coverage includes exact identity, lazy loading, absent controls, provider/image failure, note/remove/undo and map behavior.
- `npm --prefix frontend run build`: passed; existing large-chunk advisory remains.
- `git diff --check`: passed.
- Existing `travella-places` Docker stack rebuilt via `scripts/start-local-ready.sh` with frontend origin/port 5574, auth 8503 and agent 8504. Cognito read-only precheck and example-account sign-in/session/sign-out readiness check passed. All eight changed runtime files matched their container SHA-256 hashes.
- Chrome DevTools MCP, isolated headless Chrome, authenticated with the supplied example account. Opened existing verification Plan at http://localhost:5574/plans/71a16749-5e78-46bd-9fc2-e1665e4d0ce5.
- Actual Google photo images for Parco Sempione and Sforzesco Castle loaded with nonzero naturalWidth. This saved Piazza del Duomo entry had no matching available photo and stayed text-only. Attribution links rendered separately from row controls.
- Neither removed control appears. Exercised category filtering, row expansion, note editing/cancel (tabs disabled while editing), remove confirmation/Keep place, Show on map and List return. Save state remained Saved.
- Desktop 1440×1050 and phone 390×844, light/dark screenshots inspected: no horizontal overflow, clipped controls or overlapping text. Lazy loading was observed before off-screen rows entered view.
- Reload restored three saved places and both available photos. Read-only canvas snapshots compared byte-equivalent around the interaction checks. No saved data changes made.
- Simulated browser image-error events removed photos/credits while all three rows remained usable. Provider rejection is separately covered by the focused unit test. A provider-failure injection during travel navigation did not remount thumbnails, so that attempt is not claimed as provider-failure browser coverage.
- Final browser console: only existing Lit development-mode warning. Network inspection after reload: no failed requests. Prior map check carries the existing Google marker listener advisory documented in the original implementation evidence.

## Limits

Photos require a Google-backed pin, an exact matching result and an available photo. Manual/legacy pins and unmatched results stay text-only. No stock or inferred substitute is shown. Full frontend suite was not rerun for this refinement; its pre-existing 17 failures were reproduced on the unchanged baseline and documented in [the original implementation record](../2026-10-10-places-implementation/verification.md). No backend CRUD changed, so no new CRUD test gate applies.

## Provider references

Photo API and attribution behavior checked against official [Google Maps JavaScript photo documentation](https://developers.google.com/maps/documentation/javascript/place-photos) and [Places policies](https://developers.google.com/maps/documentation/places/web-service/policies).
