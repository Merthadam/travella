# Booking card states — 2026-10-06

## Scope

Accepted standalone design updated with independent Booked / Not booked states for Flights and Accommodation. Local studio: http://localhost:5177/. No authenticated journey, backend mutation, provider call or real reservation. No automated tests added or run.

## Checks performed

- Chrome DevTools, 1440×1100: default cards show Not booked and Explore actions. Set Flights to Booked: flight badge and action changed while Accommodation remained Not booked. Set Accommodation to Booked: both green check badges and details actions rendered.
- Opened View flight details and View stay details and returned to canvas. Correct titles, sample details and explicit sample-booking explanation appeared.
- Chrome mobile emulation 390×844: set both Booked, inspected screenshot, then set both back to Not booked. Both card states fit without clipping; document scrollWidth and innerWidth were both 390.
- Opened both Not booked Explore actions and returned. Existing browsing previews remained functional.
- Loading, Error and Empty: seven corresponding component states; no misleading booking badges; both booking selectors disabled. Busy: current badges visible, selectors disabled. Reset: Populated restored, selectors enabled, both statuses Not booked.
- Emulation reloaded the page as expected, resetting local fixtures. Initial interactions using stale element IDs failed at the tool level; fresh snapshot IDs were obtained and every affected check rerun successfully.
- Console: only pre-existing Lit development-mode warning; no errors. Fetch/XHR list empty.
- `npm --prefix frontend run build:components`: passed (232 modules). Existing >500 kB chunk-size advisory remains; no runtime error.

## Evidence

- [Before / accepted baseline](plan/before.jpg)
- [Booked desktop](implementation/booked-desktop.jpg)
- [Booked mobile](implementation/booked-mobile.jpg)
- [Not booked mobile](implementation/not-booked-mobile.jpg)

Screenshots inspected: status badges, card text and actions are readable with no overlap. Persistence and real booking integration are intentionally outside this disconnected design scope.
