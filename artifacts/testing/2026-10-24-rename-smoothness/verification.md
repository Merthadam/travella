# Inline rename smoothness — 2026-10-24

Source: `12dba91`. GSD debug session: `.planning/debug/resolved/journal-rename-smoothness.md`.

The approved journal design and Enter-to-save interaction remain in use. Rename now shares the title's typography and wrapping, keeps the card in place, and announces success without inserting a visible notice. Escape or clicking away cancels an unsubmitted edit. An unchanged Enter closes without a request. Saving uses a read-only field to preserve focus, and uncertain retries retain the original request contract. A renamed search result remains visible until the search/filter changes.

## Reproduced problem

Chrome DevTools measured the original featured card growing from 350.984px to 387.078px on edit; metadata shifted by 36.094px and the font shrank from 34px to 28px. Saving an ordinary card moved it into the featured slot and remounted it.

- [Before editor](plan/before-editor.png)

## Executed verification

- `npm --prefix frontend test -- src/PlansApp.test.jsx src/features/plans/components/PlanDrawers.test.jsx`: 24 passed. Covers real UI state transitions with mocked transport: exact title normalization, empty input, cancellation, unchanged Enter, stable list order/focus, delayed saving, search visibility, uncertain retry identity, conflicts and authentication handling.
- `npm --prefix frontend run build`: passed, 578 modules. Existing bundle-size advisory only.
- `git diff --check`: passed.
- Authenticated Chrome DevTools MCP at `http://localhost:5174`, using the configured example account. Two isolated records created through the application's HTTP API for verification.
- Desktop featured and ordinary editor: **0px card-height and metadata-position change**, with 34px and 20px fonts respectively.
- Real ordinary-card Enter save: same card DOM node, same list position, focus restored to its title, no visible success notice. API readback returned the exact title and `title_source=manual`; reload retained the name.
- Browser Escape, unchanged Enter and click-away paths closed cleanly. Clicking the search field retained focus there.
- At 390px mobile width, wrapped title editing: **0px card-height and metadata-position change**, 30px font retained, no horizontal overflow. Light and dark screenshots visually inspected for clipping, overlap and legibility.
- Console: no errors; existing Lit development-mode warning only. Inspected 19 preserved fetch/XHR/image requests: no failed statuses.
- Only the two task-owned records were soft-deleted. Readback confirmed deleted lifecycle and recovery deadlines. No existing plan was renamed or deleted.
- Read-only local Cognito precheck, `bash scripts/start-local-ready.sh`, authentication sign-in/session/sign-out check passed. Runtime SHA-256 checks matched all three changed runtime files. A subsequent independent local rebuild replaced the shared app; this branch was rebuilt again for the final handoff (see final runtime check below).

## Implementation evidence

- [Featured title editor](implementation/featured-editor.png)
- [Ordinary title editor](implementation/ordinary-editor.png)
- [Saved name in its original position](implementation/rename-saved-desktop.png)
- [Mobile light](implementation/mobile-editor-light.png)
- [Mobile dark](implementation/mobile-editor-dark.png)
- [Generated Canvas card with destination photo](implementation/canvas-editor.png)

No backend code changed. Browser transport exercised existing create, rename/readback and soft-delete/readback endpoints. No model calls were needed.

## Final runtime check

Second `start-local-ready.sh` build and authentication check passed. All three changed runtime source hashes matched again. Authenticated browser check on a generated Canvas card confirmed unchanged height and the same loaded destination-photo node during editing; Escape closed without writing. Screenshot visually inspected. The final page is restored to the full journal at `http://localhost:5174/plans`.
