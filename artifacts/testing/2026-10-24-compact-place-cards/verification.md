# Compact place cards — 2026-10-24

Approved sketch implemented in c8c70a9. One title and chevron disclosure, inline original Google description, thumbnail and full-width linked photo credit, Website / Google Maps links, overflow removal. Confirmation, cancellation, undo and view-state persistence retained. No backend or data schema changes.

## Evidence

- [Approved design](plan/approved.png)
- [Desktop](implementation/desktop.jpg)
- [Mobile](implementation/mobile.jpg)
- [Mobile overflow and loading state](implementation/mobile-menu.jpg)

## Executed verification

- 41 focused tests passed: DestinationMap, CanvasPlaceDetails, CanvasPlacePhoto, CanvasDestinationMap and PlanningCanvas. Command: `NODE_OPTIONS=--no-experimental-webstorage npm --prefix frontend test -- src/design-system/components/DestinationMap.test.jsx src/features/plans/components/CanvasPlaceDetails.test.jsx src/features/plans/components/CanvasPlacePhoto.test.jsx src/features/plans/components/CanvasDestinationMap.test.jsx src/features/plans/components/PlanningCanvas.test.jsx`.
- Tests cover menu keyboard access, Escape/outside dismissal, confirmation/cancel focus, removal/undo, exact provider identity in Maps URLs, absent provider descriptions, retry, safe websites, missing/broken photos, stale responses, saved selection, map/filter behavior and autosave.
- Four additional PlaceWebsites integration component tests passed (chat/maps website links and provider text), bringing the focused total to 45.
- Production build passed after final CSS adjustment; existing chunk-size advisory only. `git diff --check` passed.
- Authenticated example account in isolated Chrome DevTools context at http://localhost:5174. Desktop 1280×900 and mobile 390×844 inspected. Expanded place has one title, original Google description, compact links; mobile has no horizontal overflow and menu stays within the scroll pane.
- Actual Yakusugi Land expansion/collapse, overflow, Escape, removal confirmation/cancel exercised. Cancellation returned focus to More options. Current user canvas snapshot equals its before-test snapshot: seven original places unchanged.
- Isolated test Plan seeded through the existing authenticated API with Yakusugi Land and a manual test pin. Real browser confirmed removal of test pin; API readback had one pin. Undo restored two pins, verified in API and UI after reload. Test Plan deleted through existing challenge/commit API; readback returned 404. No user-owned place was removed.
- Google Maps URL uses exact resolved provider ID with coordinates; website and photo-author links remain external links. No generated description fallback. URL format checked against [Google Maps URL documentation](https://developers.google.com/maps/documentation/urls/get-started).
- All five changed runtime source files and CRUD canvas model matched this checkout by SHA-256 after rebuilding, before the second competing restart. Startup sign-in/session/sign-out readiness passed.

## Shared runtime interference

Another checkout (`thread-impatiens`) recreated the shared Compose stack during verification. Container source hashes differed, and its older CRUD model rejected existing website fields (`extra_forbidden`), producing canvas 503 errors. Restored the stack from this checkout without touching volumes. Correct source hashes and normal canvas reads were verified afterward. The other session replaced the stack again at 13:46:54 UTC; live availability at localhost:5174 is pending session coordination. The implementation and earlier browser checks remain valid, but the current shared app is not running this code. A test setup initially omitted required frontend canvas components; corrected only that isolated fixture before exercising removal. An expired test session was reauthenticated using the supplied account.

Final successful test-plan console contained only the existing Lit development and Google marker-event warnings. Network errors caused by the competing runtime are documented above; normal CRUD reads and writes succeeded while this checkout was running.

No push or merge. Live model calls and backend CRUD regression suites not applicable to this frontend-only change.

## Delivery completed: dedicated container at localhost:5175

User explicitly requested starting the container. The shared 5174 stack was overwritten again during launch. Started a separate Compose project `travella-compact-cards` at http://localhost:5175 (auth 8005, agent 8105). Compose definition: `/tmp/travella-compact-cards-compose.yaml`. It has its own app/connector containers and images; it connects to the existing PostgreSQL container through external network `travella-cards-db` and alias `cards-postgres`. No database copy, replacement or volume deletion. Existing seven-place Plan is available.

Launched through `scripts/start-local-ready.sh` with `COMPOSE_PROJECT_NAME=travella-compact-cards`, `TRAVELLA_COMPOSE_FILE=/tmp/travella-compact-cards-compose.yaml`, `COMPOSE_ENV_FILES` pointing to this checkout's ignored `.env`, ports 5175/8005/8105, and both `FRONTEND_ORIGIN` and `TRAVELLA_LOCAL_ORIGIN` set to http://localhost:5175. Cognito precheck and sign-in/session/sign-out readiness passed. An initial attempt at host auth port 8004 collided with the existing research stack; retried with unused ports 8005/8105 without stopping other containers.

All five changed runtime files and CRUD canvas model match this checkout by SHA-256. Chrome DevTools authenticated browser check: seven saved places, Yakusugi Land expanded, original Google summary and both links present, no duplicate title, overflow action present. All 19 observed fetch/XHR requests returned 200. Console: existing Lit/marker warnings plus unrelated missing favicon 404. [Running container screenshot](implementation/running-container.jpg) inspected. Opened the live Plan in the user's Chrome. No implementation changes or repeated tests required for this launch.
