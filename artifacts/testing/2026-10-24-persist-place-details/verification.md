# Saved Google place descriptions

User requested persistence after the first lookup. The approved card layout is unchanged; its ready state now reads saved metadata.

## Automated verification

- 37 frontend tests passed across CanvasPlaceDetails, PlanningCanvas, PlaceWebsites and DestinationMap. Tests exercise immediate cached rendering without calling Maps, including a successful lookup with no summary; original text/language/identity persistence; addition from provider suggestions; atomic website enrichment; busy-state deferral; stale response protection; remove/undo and reload.
- 28 FastAPI CRUD/provider tests passed across services/crud/tests/test_place_details.py, services/crud/tests/test_place_websites.py and services/mcps/tests/test_place_websites.py. Actual handlers/test database verify create/read/update/remove/undo, plan soft-delete/recovery, idempotent writes, invalid metadata, unauthenticated/cross-owner access, missing IDs and legacy snapshots. Existing LangChain deprecation warning only.
- Production build passed (existing chunk-size advisory). git diff --check passed.
- Dedicated stack rebuilt at http://localhost:5175. Cognito discovery and sign-in/session/sign-out checks passed. SHA-256 matched for both saved-pin schemas, shared metadata model, details component and canvas autosave hook.

## Evidence

- [Intended ready-on-open layout](plan/ready-on-open.jpg)
- [Previous loading state](plan/before-loading.jpg)

Browser verification continued below.

## Browser persistence verification

Authenticated example-account Chrome check at localhost:5175. Created an isolated Plan with an uncached Yakusugi Land pin through the real API, opened its card, and observed the original description, language and exact Google place ID saved through normal canvas autosave.

Reloaded with Google Places GetPlace requests intentionally blocked and counted. The API returned identical saved metadata, the original description appeared without a loading message, and collapse/reopen retained the same behavior. **Zero details requests** on reload and reopen. Photo lookup remains separate. All 15 observed fetch/XHR requests after reload returned 200; console contained only existing Lit development and Google marker warnings. Screenshot inspected: [stored description](implementation/stored-description.jpg).

The isolated Plan was deleted through the real challenge/commit API; canvas read returned 404. Real Plan still has seven places. A first enrichment attempt on the existing Plan encountered the expected revision-conflict protection because another session changed it; no overwrite was forced. Persistence proof therefore used the isolated Plan.

Source commit: a11bf00. No push/merge. No live model call was required; new-suggestion ingestion exercised in component tests with real supplied-provider field shapes. Card layout unchanged, so responsive layout checks from the approved compact-card implementation remain applicable.

A fresh browser session then completed the remaining three legacy lookups without a revision conflict. All seven existing pins now retain Google metadata, including successful no-summary results. Existing place identities/count preserved. No generated text substituted for missing Google descriptions.
