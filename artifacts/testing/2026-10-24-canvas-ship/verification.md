# Canvas improvements shipment — 2026-10-24

Integrated source: `8275f16`, based on main `ea10333`. Scope: full draft autosave, place websites, saved Google descriptions, compact place cards and map control cleanup. Main's account menu and plans journal are preserved. The only source merge conflict required retaining both CanvasPlaceDetails and DestinationPhoto imports.

## Executed checks

- Focused integrated frontend: 114 passed across PlansApp, AccountApp, AccountMenu, AccountSettingsPage, usePlanningCanvas.persistence, PlanningCanvas, CanvasDestinationMap, CanvasPlaceDetails, PlaceWebsites, placeWebsites, DestinationMap and SandboxCheckout.
- `uv run --locked pytest services/crud/tests services/mcps/tests/test_place_websites.py -q`: 104 passed, seven optional PostgreSQL-specific skips. Actual FastAPI handlers and test database verify full metadata CRUD, readback, recovery, ownership, invalid input, evidence rotation and idempotency. Prior real PostgreSQL browser persistence checks remain applicable.
- Production build and `git diff --check` passed; existing bundle advisory only.
- Full frontend suite: 259 passed, 12 skipped, three failures. PlansResume's obsolete Account button selector and TripBrief's confirmation expectation fail identically on main ea10333. SandboxCheckout timing failure passes in isolation (4/4) and integrated focused rerun. No production change made to suppress tests.
- Agent canvas travel/semantic suites: 222 passed, eight failures. All eight same SSE-to-React journey failures reproduced from an archived main ea10333 checkout with its own frontend source (including obsolete Edit details selector). This is not an all-green repository suite.
- Rebuilt dedicated Docker project travella-compact-cards at localhost:5175. Cognito precheck and sign-in/session/sign-out passed. Container hashes match PlansApp, PlanningCanvas, CanvasPlaceDetails and CRUD canvas source.
- Chrome DevTools, authenticated example account: reloaded existing seven-place canvas, opened Yakusugi Land, confirmed saved original text, Google attribution, website and Google Maps links, absence of details-loading text, Show all places retained and Search this map area absent. Draft saved automatically status and no Save plan button; main's account menu and destination photograph coexist. No plan mutation during this integration smoke.
- All 15 observed fetch/XHR requests returned 200. Console only known Lit-development and Google marker event warnings. Destination-photo integration can issue its own GetPlace request; the prior saved-description guard test is documented separately and is not a claim that all Maps calls cease.
- Visually inspected integrated screenshots: readable description, credits and actions with no overlap. Captured the original automatic-draft HTML design preview retrospectively, resolving its earlier screenshot-tool blocker without claiming it was captured before implementation.

## Evidence

- [Original draft design, captured at ship time](plan/automatic-draft-preview.jpg)
- [Integrated saved draft](implementation/integrated-draft.jpg)
- [Integrated compact card](implementation/integrated-place-card.jpg)
- [Full draft persistence journey and original limitations](../2026-10-24-automatic-draft/verification.md)
- [Place websites journey](../2026-10-24-place-websites/verification.md)
- [Compact card desktop/mobile, removal and undo](../2026-10-24-compact-place-cards/verification.md)
- [Saved metadata HTTP/browser reload coverage](../2026-10-24-persist-place-details/verification.md)

No new live-model generation run. Finalization remains deferred. This scoped shipment does not complete unrelated Phase 17 human/live-model acceptance. Other worktrees and shared stacks are preserved.
