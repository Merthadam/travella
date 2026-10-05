# Planning containers — prototype verification

Date: 2026-10-05. Branch: `prototype/planning-cards`. Design selection pending.

## User direction

Initial full-result card galleries were revised during review: the canvas must contain small Flights and Accommodation containers, each opening a dedicated browsing view. Both should be generatable by the agent. The preview simulates generation; it does not implement production A2UI, AG-UI updates, provider search, or durable writes.

- A: two compact tiles.
- B: two compact horizontal rows.
- C: two containers arranged along a short journey sequence.

## Run

With the existing local auth/backend container running:

`npm --prefix frontend run prototype:cards`

Open `http://localhost:5176/plans?prototype=travel-cards&variant=A` (B/C also supported). The dedicated development proxy points at the existing auth gateway on 8003 and supplies its expected local origin. Authentication and profile/Plan reads remain enabled. Credentials are not stored in the prototype. Existing onboarding routing is retained.

## Browser checks completed

Chrome DevTools, authenticated through the UI as the configured example account; credentials not displayed.

- Clear modules removes both; Generate both shows transient generation then renders both components.
- Open Flights navigates to a dedicated view with two return-flight options; outbound and return legs, durations, stops, baggage, total-party prices, and sample disclaimers are visible.
- Flight details dialog and flight side-by-side comparison open and close.
- Shortlist a flight, return to the canvas: Flights shows `1 shortlisted`.
- Open Accommodation, shortlist Casa Oliva, return: Accommodation shows `1 shortlisted`; flight shortlist remains.
- Accommodation details and same-category comparison open and close.
- A/B/C switcher updates URL and layout. Reload retains the URL-selected variant and intentionally resets in-memory shortlist.
- Desktop 1440px and mobile 390px: screenshots for all three revised directions captured and inspected. No horizontal page overflow. Mobile browsing views also inspected.
- Latest network requests: session, profile, Plans list, and illustrative photos HTTP 200. No Plan/profile mutations from prototype interactions.
- Console: existing Lit development-mode warning only; no runtime errors in final browser pass.
- Production build succeeded; existing large-chunk warning remains. Prototype rendering is development-gated. No automated tests or paid model calls.

## Screenshots

- [A / compact tiles](plan/A-containers-desktop.jpg)
- [B / compact rows](plan/B-containers-desktop.jpg)
- [C / journey sequence](plan/C-containers-desktop.jpg)
- [A mobile](plan/A-containers-mobile.jpg), [B mobile](plan/B-containers-mobile.jpg), [C mobile](plan/C-containers-mobile.jpg)
- [Flights mobile](plan/flights-mobile.jpg), [Accommodation mobile](plan/accommodation-mobile.jpg)

Earlier `A-browse-desktop.jpg` and `B-compare-desktop.jpg` document the superseded gallery approach, not the current canvas direction.

## Limits

Fictional offers/prices/review scores and illustrative photos. Generation and shortlist are browser-only simulations, resetting on reload. No actual supplier links, bookings, live model requests, or saved Plan changes. No final destination, supplier choice, or schema accepted yet. Prototype controls are intentionally visible and the floating switcher overlays the viewport; production UI will omit them. User selection is the next step.
