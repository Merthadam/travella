# Quiet feedback and accommodation pins

Completed 4 November 2026 on `descriptive-find`; canonical preview http://localhost:5202. User requested removal of noisy green/red labels, especially around cancelling/removing search results, plus actual pin-shaped accommodation markers. This refines the already selected A layout.

## Delivered

Shared feedback styling removes decorative coloured backgrounds and borders from notices/errors across planning, travel search, chat and onboarding. Informational status labels, rating badges and hotel numbers use neutral styling. Useful error text, alert semantics, field validation, primary actions and activity category colours remain available.

Repeated workspace update/dismiss/restore notices are no longer visual banners; their screen-reader announcements remain. A quiet Undo last change action preserves reversal. Search cancellation retains prior results without leaving a status block.

All numbered accommodation markers reuse the existing pointed SVG map pin, including apartment properties. Selected pins invert a neutral palette; other hotels still fade to 25%, while activity pins remain opaque. Numbers continue to correspond to result cards.

## Executed verification

- Existing Cognito precheck and canonical stack sign-in/session/sign-out readiness passed. Rebuilt from this worktree and matched all five changed runtime source hashes in the running container: [source checks](source-hashes.txt).
- Real Chrome DevTools MCP and configured example account on port 5202: manual LiteAPI sandbox search returned 28 stays, ten on the first page; all ten markers were numbered SVG pins.
- Clicking a hotel card selected the exact corresponding pin; nine other hotels faded and all saved activity pins stayed opaque. Rating background was transparent.
- Dismissed a hotel: no coloured/repeated banner, accessible status retained, quiet Undo available. Undo restored the hotel.
- Started and cancelled a real search: pending cancel control disappeared and the ten previous hotel cards remained.
- Entered an unselected destination and submitted: real validation error retained role=alert with transparent background and no coloured border. Corrected destination and searched successfully. Error text was scrolled into view and visually inspected.
- Desktop 1440×900 and mobile 390×844: screenshots captured and opened for visual inspection; mobile pins had no horizontal overflow.
- Console/network inspection found the existing Lit dev-mode and Maps event API warnings, plus one HTTP 409 on restoring an expired research snapshot. Its response message said the offer had expired and to search again. Fresh manual searches succeeded. No transport-failed fetch/XHR requests; no introduced application errors identified. [Browser log](browser-checks.txt).
- Focused frontend regression suites: **135 passed**, including updated assertion that workspace announcements are screen-reader-only and Undo is outside a notice banner. [Test output](frontend-tests.txt).
- Production build and `git diff --check` passed. Existing bundle-size advisory remains. [Build output](build.txt).

No backend CRUD operation changed and no booking/durable traveler choice was made. Shared CSS is applied app-wide; the real browser interaction scope was accommodation search/map and navigation, not every account/checkout journey. Geographic marker overlap at low zoom remains existing behavior. Wider Phase 18 acceptance is unchanged.

## Screenshots

- [Before](plan/before.png)
- [Numbered pins and neutral labels](implementation/numbered-pins-desktop.png)
- [Dismissal with quiet Undo](implementation/dismissed-quiet-undo.png)
- [Plain validation message](implementation/plain-validation-message.png)
- [Mobile accommodation pins](implementation/numbered-pins-mobile.png)
