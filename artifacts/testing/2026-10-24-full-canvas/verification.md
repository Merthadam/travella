# Full canvas content restored in design prototypes

2026-10-24 · source `c596857` · branch `prototype/single-canvas-layouts-20261024`

## Correction

User liked the direction but pointed out missing existing content such as the flight box. All seven existing canvas groups are now represented: compact editable essentials; places/map; preferences; Flights; Accommodation; research findings; useful websites. No production layout has been selected.

The prototypes reuse the actual FlightsEntry, AccommodationEntry, TripThemes, ResearchFindings and ImportantLinks components with sample fixtures and local state callbacks. The former generic Travel panel is replaced by visible flight/accommodation cards. Preferences, research and websites are actual visible cards further down the same scrolling canvas. Flights/stays open an in-place sample choice panel; a selection is explicitly not a booking.

Preview: http://localhost:5188/plans?prototype=single-canvas&variant=C
Use A/B/C in the bottom switcher. Run: `npm run prototype:canvas --prefix frontend`.

## Browser verification

Chrome DevTools, authenticated example account. The earlier temporary test browser stalled during a screenshot; only the task-owned automation browser was restarted. Reauthenticated successfully (200/signed_in) and completed the checks below. A mobile emulation reload initially raced a script; repeating after the document loaded passed. Neither tooling interruption remains a blocker.

- A/B/C: Flights, Accommodation, preferences, research and websites present; flight/stay panels stay on /plans and fit the desktop viewport.
- Explicit sample flight and stay selections update the draft and show Unsaved changes. Both cards retain Not booked. Passed.
- A/B/C: scrolling the board reaches the complete website card at the bottom. Passed.
- Added the preference Independent bookshops using the existing component editor; edited a website title to Lisbon visitor guide. Both appeared in the local draft. Save plan disabled while either editor remained open, then re-enabled after applying. Passed.
- Expanded research finding and clicked its sample source. Source click was intercepted, reported as a preview action, and remained on canvas. Passed.
- Simulated Save returned Saved in preview. Reload reset all sample selections/edits. No durable data is used by prototype mutations.
- Recorded fetch method/path during travel and component edits: only an automatic GET /auth/session; no mutation requests.
- A/B/C at 390×844: no horizontal overflow; flight and stay panels fit the viewport; websites reachable by scrolling. Passed.
- Mobile card scroll target adjusted to clear the app header; measured flight card top 91.54px against header bottom 72px. Inspected screenshot confirms heading and controls visible.
- Final console: existing Lit development warning only, no errors. Final application fetches: GET session/profile/Plans all 200.

## Evidence inspected

Before: [original simplified prototypes](../2026-10-24-single-canvas/verification.md).

- [A — complete canvas](plan/a-full-canvas-desktop.jpg)
- [B — complete canvas](plan/b-full-canvas-desktop.jpg)
- [C — complete canvas](plan/c-full-canvas-desktop.jpg)
- [C — preferences, findings and websites](plan/c-supporting-cards-desktop.jpg)
- [C — in-place flight exploration](plan/c-flight-panel-desktop.jpg)
- [C — mobile travel cards](plan/c-travel-cards-mobile.jpg)

Captured by Chrome DevTools, returned image bytes saved unchanged, all visually inspected. Flight/stay cards are visible in the initial 1440×1000 canvas in every variant. Supporting cards remain reachable below. Fixed prototype controls are kept separate from product controls. Actual provider results, flight timings, map positions, prices, chat replies and save operations remain illustrative.

## Checks and delivery boundary

`npm run build --prefix frontend`: passed after the final CSS adjustment, existing large-bundle warning only.
`git diff --check`: passed.
No backend/API behavior changed. No unit tests added for the throwaway preview. Production implementation and live travel-provider verification are outside this prototype task. User selection remains pending.
