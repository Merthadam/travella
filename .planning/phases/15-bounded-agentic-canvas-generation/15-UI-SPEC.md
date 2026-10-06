# UI integration contract

Status: approved component appearance reused; generation/save controls are proposed additions.
Authority: user chose existing design and approved booked/not-booked states. Do not offer another set of prototypes.

## Visual baseline

Reuse tokens.css, components.css, seven pure components and the fixed A2UI composition from frontend/src/design-system. Approved screenshots: artifacts/testing/2026-10-06-planning-components/implementation/canvas-desktop.jpg and canvas-mobile.jpg; booking states: artifacts/testing/2026-10-06-booking-card-states/implementation/. The preview gallery stays separate.

## Journey

Generate plan from the active Plan chat enters its canvas view. Preserve Travella header, left Plans drawer and return-to-chat navigation. Initial canvas shows known state immediately and placeholders for generated groups. Use concise status text (Preparing your trip / Summarizing preferences / Checking details); no chain-of-thought, token counters or SDK terms in product copy.

Keep edits disabled during the active generation; Stop preserves completed draft components and enables editing. Generation failure affects the failed group, not the whole canvas. Retry operates on that group. Regeneration after edits requires an explicit choice to replace the affected draft group. Plan switches dispose subscriptions and drop previous run events.

Show Unsaved changes and a clear Save plan action. Save is disabled during generation, invalid draft state or ongoing save. Clicking Save plan commits the exact currently visible snapshot (the explicit confirmation), then show Saved only after success. Saving must not launch generation. Failure retains edits; revision conflict preserves the local draft and offers reload/review, never silent overwrite. Leaving with unsaved changes asks before discard. Reload restores the last saved canvas; do not label partial in-memory generation as durable.

## Component behavior

- Essentials: map exact trip-state fields; preserve unknown/flexible/no-budget meanings. Edit in draft; Save plan commits changes under the same atomic revision boundary as the canvas so the chat brief does not disagree.
- Themes: retain chips/pace/priority layout; short source labels. Empty preferences show the approved empty state.
- Map: chosen destination resolved by provider, destination viewport fitted once on mount/change; preserve manual pan/zoom otherwise. Category colors/icons and accessible place list remain. Show all places fits pins on explicit request. No selected destination, ambiguity or unavailable provider shows an honest prompt/fallback. No automatic durable destination or pin selection.
- Flights/Accommodation: need is separate from bookingStatus. No booking source currently exists; generation leaves Not booked. Keep Booked renderer support, and only map an explicit trusted future booking record. Search/browse routes show an unavailable state until provider integration; remove sample offers and fixture language from real Plan cards.
- Findings/links: concise summaries, citations close to claims, visible uncertainty, edited links validated. Safe external links use noopener/noreferrer. No fetched page HTML rendering.

## Accessibility and responsive checks

Keep existing approved typography, spacing, focus treatment and restrained motion. Controls need accessible names, error/status announcements and keyboard operation. At 390px stack cards with no horizontal overflow. At desktop maintain the approved grid. Reduced-motion avoids unnecessary entrance animations. Renderer retains last valid state on malformed batches.

## Evidence gate

Reuse baseline screenshots as planning evidence. During implementation use Chrome DevTools with the example account, exercise generate/edit/stop/retry/save/reopen, inspect console/network, and capture desktop/mobile and failure states. Planning adds no new UI code and does not claim these checks have already passed.
