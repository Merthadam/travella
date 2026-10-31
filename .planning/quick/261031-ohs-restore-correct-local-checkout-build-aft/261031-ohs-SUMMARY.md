# Restored correct local checkout build

The shared `travella-local-single` Compose project had been recreated by sibling worktree `splendid-pentaceratops`. Its running checkout did not match marshy-face and did not contain FlightSeats.jsx. The user's Chrome tab showed the old checkbox/dropdown seat UI and large journey sidebar.

Rebuilt from marshy-face using the travella-local Cognito precheck and `bash scripts/start-local-ready.sh`. Service health and temporary example-account sign-in/session/sign-out checks passed. Runtime working-directory label now points to marshy-face. SHA-256 matches passed for FlightCheckout.jsx, FlightSeats.jsx, FlightExtras.jsx, flight-checkout.css and flight-seats.css. HTTP-served modules contain the new collapsed-details and no-charge skip markers.

Opened a fresh user Chrome tab, searched the unchanged BUD–LIS dates, opened the first sandbox fare, and checked the review and passenger stages. Compact route context, stage heading, collapsed Flight details and sticky total are visible. Left the fresh tab on review and preserved the original tab without reloading or altering its seat selection. No reservation or payment was submitted.

No application source changes; no repeat unit/build tests required. Existing competitor-redesign verification remains applicable to source commit 4362110. This run verifies runtime restoration and browser rendering, not a new end-to-end seat transaction. Both worktrees still share a Compose project/port, so another launch from the sibling could replace it again.

Evidence: artifacts/testing/2026-10-31-build-restore/verification.md and implementation/restored-checkout.jpg.
