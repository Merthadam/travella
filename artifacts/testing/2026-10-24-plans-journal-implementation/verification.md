# Plans journal production implementation — 2026-10-24

Source: `b388db6` on `prototype/plans-journal-20261024`. Approved journal A promoted to the real `/plans` route. The selected throwaway code, preview command and route were removed; prototype history remains in earlier commits. No push or merge.

## Acceptance and implementation

- Real plans retain backend recent-first order, a featured plan, cards, Research/Canvas filters, search and pagination. Pagination explicitly states that search/filter covers loaded plans.
- Clicking the title starts inline editing. Enter saves through existing normalized-title, revision, challenge and idempotency contracts; Escape or Cancel discards. IME composition cannot accidentally submit. A retry preserves the original uncertain request.
- Small trash icon directly invokes recoverable deletion. No rename/delete modal on active journal cards. Recently deleted retains the existing seven-day recovery flow.
- Automatic display titles derive from existing destination, candidate and date facts. Manual titles always take precedence. Reads never change stored title, revision or activity. List/detail projections include only display fields, not raw context or conversation. Saved Canvas facts take precedence over later research edits.
- Research retains the placeholder. Saved Canvas cards show live Google destination photos with attribution, and the same component is used on the actual Canvas after generation/saved data. No persistent photo cache. Ambiguous names stay unavailable unless shared-country disambiguation produces a single exact result. Failed image delivery keeps a clear placeholder.
- The list reflects durable saved state: an unsaved generated workspace is not claimed as a saved Canvas on the journal.

## Executed checks

| Check | Result |
| --- | --- |
| Frontend regression | `npm --prefix frontend test -- src/PlansApp.test.jsx src/features/plans/components/PlanningCanvas.test.jsx src/features/plans/components/PlanDrawers.test.jsx src/features/plans/components/DestinationPhoto.test.jsx` — 46 passed. |
| CRUD suite | `uv run --locked pytest services/crud/tests -q` — 73 passed, 7 environment-dependent tests skipped. Tests use real FastAPI handlers and database persistence; optional PostgreSQL-specific tests were not enabled. |
| Build | `npm --prefix frontend run build` passed, 578 modules. Existing large-chunk advisory remains. |
| Whitespace | `git diff --check` passed. |
| Local startup | Read-only Cognito precheck, then `bash scripts/start-local-ready.sh`; configured authentication sign-in/session/sign-out checker passed. Database volumes preserved. |
| Runtime parity | SHA-256 matched 11 representative frontend/CRUD source files against `/app/` in the rebuilt running container, including photo, journal, Canvas, projection, schema and repository files. |

## HTTP persistence and authorization evidence

New `services/crud/tests/test_plan_summary.py`, together with the full lifecycle/API suite, exercised:

1. POST `/v1/plans`: 200; default Research state read back, owner persisted.
2. PATCH `/v1/plans/{id}/research-context`: 200; candidate produces “Exploring Yakushima”; explicit destination and dates produce “7 days in Yakushima”. GET detail/list agree, repeat GET preserves revision/activity, database title remains unchanged on reads.
3. POST canvas challenge and PUT canvas: 200; saved state projects Canvas, dates and one saved place; GET verifies persistence.
4. PATCH title using exact challenge/revision: 200; custom title stays manual. Later research changes preserve the manual title and saved Canvas dates.
5. DELETE using challenge/revision: 200; active GET returns 404; deleted list includes same record and recovery deadline. Restore returns 200 and preserves custom title, Canvas and content.
6. Missing authentication returns 401; another traveler's detail returns 404 and list is empty; nonexistent plan returns 404. Existing suite covers invalid titles, stale revisions, confirmation and retry/idempotency behavior.

One pre-existing research-offer test compared the entire old response. It was updated to assert unchanged durable metadata plus the intentional derived label. All regressions then passed.

## Authenticated Chrome DevTools browser verification

Used the installed Chrome DevTools MCP server in isolated Chrome through a local JSON-RPC bridge. Signed in as the mandated example account using its local credentials file; no credentials/tokens saved in evidence. Canonical origin: http://localhost:5174.

Two verification-owned plans were created via the real authenticated API: one Research plan and one saved Canvas with explicit test facts. Live Google photos were used; no model generation call was needed for this persistence/UI change.

- Click title → edit → Escape: original name retained; no write.
- Click title → “Our Lisbon spring” → Enter: real API saved manual title; GET and browser reload verified persistence. Captured inline editor.
- Open canvas: real saved Planning Canvas loaded the destination photo and saved place.
- Small trash: card removed without a modal; deleted GET confirmed seven-day recovery deadline.
- Recently deleted → Restore: same manual title and saved Canvas restored and reopened; GET confirmed active lifecycle.
- Research filter displayed only Research cards. Nonmatching search showed the empty state; clearing restored plans.
- Desktop 1440×1320 and mobile 390×844 checked, light/dark, no horizontal overflow. Photos and credits loaded in both themes.
- Dispatched an image delivery error on the verification card: honest fallback appeared; reloading successfully loaded the real photo again.
- Initial browser session during container replacement had a transient `/auth/session` 500. After startup/authentication, repeated journeys passed. Final console: only existing Lit development warning, no application errors. Final network inspection: seven image/fetch/XHR requests, zero failures.
- Cleaned only the two verification-owned plans through soft deletion. Existing user plans were neither renamed nor deleted; final active count returned to 12. Test records remain recoverable under the normal seven-day policy.

Visually inspected the final journal, inline editor, Research filter, real Canvas, mobile light/dark and photo fallback captures. Corrected featured trash alignment and Yakushima island/municipality lookup based on browser findings, rebuilt, verified source parity and rechecked.

## Evidence

- [Original page](plan/before-plans.png)
- [Approved design](plan/approved-journal.png)
- [Final journal with original plans](implementation/journal-ready.png)
- [Inline rename](implementation/inline-rename-desktop.png)
- [Generated test plan](implementation/journal-final-desktop.png)
- [Real Canvas photo](implementation/canvas-destination-photo.png)
- [Research state](implementation/research-filter.png)
- [Empty search](implementation/empty-search.png)
- [Mobile light](implementation/journal-mobile-light.png)
- [Mobile dark](implementation/journal-mobile-dark.png)
- [Photo error fallback](implementation/photo-delivery-fallback.png)

No required check remains blocked. Optional PostgreSQL-only tests are the recorded limitation; live local PostgreSQL-backed lifecycle actions and persisted readbacks passed.
