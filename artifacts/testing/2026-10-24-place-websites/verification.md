# Place websites verification — 2026-10-24

Implementation is running at http://localhost:5174. Desktop and mobile feature checks passed, including persistence after reload. Broader pre-existing regression failures and an additional mobile screenshot tooling limitation are recorded below.

## Scope and design

User requested websites in chat place suggestions, map previews/details, and automatic addition to Useful websites. Earlier direct-implementation choice honored; mandatory Travella testing skill read before work and delivery. GSD quick 261024-jp7 executed inline.

- Optional `website` travels from Google's `websiteUri` through the private connector and signed suggestion to the saved pin JSONB. Old snapshots remain readable. Existing saved places are not automatically backfilled.
- Public HTTP(S) links only; credentials, executable schemes, local/IP hosts and nonstandard ports rejected. Missing/unsafe provider URLs are omitted without discarding the place. Research citations retain their existing HTTPS contract.
- Explicit Add saves the pin and useful link atomically. URL comparison normalizes host/default port/root path and ignores fragments; meaningful query strings/path case are retained. Existing matching titles/notes are preserved. `placeId` marks place-related links for preservation during research regeneration.
- Useful links allow 70 entries (50 places plus 20 research links), still within the existing total snapshot byte limit. At capacity the pin retains its website and the UI explains that the Useful websites collection is full.
- No finalization or automatic additions from merely viewing a suggestion.

## Evidence inspected

- [Design sketch](plan/design.jpg), [HTML source](plan/preview.html).
- [Chat suggestion and temporary map preview](implementation/chat-map-preview.jpg).
- [Saved map details after reload](implementation/saved-map-after-reload.jpg).
- [Useful websites after reload](implementation/useful-websites-after-reload.jpg).
- [Mobile saved place website](implementation/mobile-place-website.jpg).

Screenshots captured using Chrome DevTools and inspected: website controls are readable, match the existing styling, and fit their action rows. Desktop had no document horizontal overflow. The saved place list is independently scrollable. Unrelated account-preference prose in chat was hidden for the chat screenshot only; place cards and controls were unchanged. Explicit screenshot file paths were rejected by MCP workspace-root configuration; inline screenshot bytes were saved to these files instead. Initial design capture was retried successfully after that tool-path failure.

## Automated checks

- `uv run --locked pytest services/crud/tests/test_place_websites.py services/mcps/tests/test_place_websites.py services/crud/tests/test_canvas_evidence_rotation.py services/crud/tests/test_canvas_mock_booking.py services/crud/tests/test_api.py -q`: **58 passed**.
  - Real FastAPI handlers with SQLAlchemy test database: create Plan; challenge/save; idempotent replay; read exact pin website and useful link; edit note preserving URLs; soft delete hides canvas (404); restore recovers exact snapshot.
  - HTTP and HTTPS websites accepted. Invalid pin websites and useful links return 422 without mutation. Anonymous reads/challenges/writes return 401; other owner returns 404; missing Plan returns 404. Old snapshots without websites save/read successfully.
  - Provider search/details request website fields; absence/unsafe provider values remain valid places; website tampering invalidates signed suggestion tickets.
- `npm --prefix frontend test -- --run src/features/plans/usePlanningCanvas.persistence.test.jsx src/features/plans/components/PlaceWebsites.test.jsx src/features/plans/components/PlanningCanvas.test.jsx src/features/plans/components/CanvasDestinationMap.test.jsx`: **38 passed**.
- `npm --prefix frontend test -- --run src/features/plans/placeWebsites.test.js`: **1 passed**, including 50 place links + 20 research links and capacity behavior.
  - Covers chat link before Add, missing URL, temporary preview link, map selection, website persistence with full snapshot, reload, HTTP support, deduplication preserving manual labels, regeneration retention, rejection of an unsafe addition without partial changes.
- `npm --prefix frontend run build`: **passed**, existing large-chunk advisory.
- Full frontend regression run: **223 passed, 12 skipped, 6 failed**. Same six pre-existing failures established in the previous autosave baseline: five AccountApp onboarding assertions and one TripBrief confirmation assertion. New capacity test subsequently passed separately.
- Agent/map broader regression: **200 passed, 9 failed**. All nine reproduced on an unchanged HEAD archive at `/tmp/travella-websites-baseline`: one profile-memory fixture expects the old profile shape; eight Python-to-React travel fixtures still look for the removed `Edit details` button. No difference in outcomes from this patch.
- `git diff --check`: passed.

## Authenticated desktop journey

Used the configured example account in an isolated Chrome DevTools context and a newly created verification Plan. No existing user Plan was edited.

1. Created an empty Milan canvas via the real API.
2. Asked the real chat to find Pinacoteca di Brera without adding it. Live Google Places result included `https://pinacotecabrera.org/`; chat displayed Website, Show on map, and Add to plan.
3. Chose Show on map. Preview displayed the same Website link. API read confirmed zero pins and zero useful links: preview did not save anything.
4. Clicked Add to plan. The initial save challenge encountered a transient 503; the draft was not represented as saved. After re-querying the same real place, Add completed with challenge 200 and save 200, showing Draft saved automatically.
5. Reloaded and read canvas revision 3: one pin with the exact website and one useful link associated with that pin. Saved map details and Useful websites displayed the same URL.
6. Inspected console/network. Successful feature requests returned 200. Existing Lit development and Google marker-event advisories remain. No new render/schema errors. A later account-access 503 and session expiry interrupted further verification.

## Transient environment issues, final mobile checks, and cleanup

Switching to a 390×844 mobile viewport reached a signed-out state. Reauthentication returned 503 twice. A credential-free connectivity check to the regional Cognito endpoint timed out both from the host (`curl`, HTTP 000 / exit 28) and inside the app container (`TimeoutError`). No password rejection, password change, or identity configuration change occurred. The running app remained healthy and was not OOM-killed.

Connectivity subsequently recovered (credential-free host probe returned HTTP 400 from Cognito, establishing reachability). Reauthentication returned 200. At 390×844, the actual saved place details displayed the website correctly with no document horizontal overflow; screenshot captured and inspected. Opened Plan chat, repeated the real place query, and confirmed the website in the returned card with no horizontal overflow. An additional mobile chat screenshot stalled in Chrome DevTools and its tool call was terminated; desktop chat and mobile saved-place screenshots remain available. External destination-page loading was not verified. No identity settings or credentials were changed to work around the outage.

Cleanup used authenticated HTTP with the same example account and correct Origin/JSON headers: read test Plan 200, deletion challenge 200, delete 200, subsequent canvas GET 404, temporary cleanup session sign-out 200. Only the test-created Plan was deleted. Initial cleanup attempts without Origin / JSON content type returned 403 / 415 and made no mutation.

Production code and local stack remain available. Implementation commit: `4a5db39`. No PR, push, or merge performed.
