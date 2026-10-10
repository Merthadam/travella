# Places controls and thumbnails

Completed user refinement of approved A in commit `dbf9174`.

Removed Find places and Search your places plus unused focus/query wiring. Added real, attributed, lazy-loaded Google photo thumbnails with exact saved provider identity matching and text-only fallback. Kept List/Map, filters, notes, removal and Undo. Guarded closing map details during an active note edit.

Validation: 21 focused tests, production build, authenticated Chrome DevTools desktop/mobile light/dark, real photos, reload, image failure fallback, filters, note cancellation, removal cancellation and map navigation passed. Rebuilt dedicated local stack and verified all changed runtime source hashes. Durable canvas unchanged. Existing broader-suite baseline failures remain documented; provider availability limits photo coverage.

[Verification and screenshots](../../../artifacts/testing/2026-10-10-places-photos/verification.md)

Preview: http://localhost:5574/plans/71a16749-5e78-46bd-9fc2-e1665e4d0ce5
