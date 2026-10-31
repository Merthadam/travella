# Checkout summary removal — 2026-10-31

User requested removal of the repeated journey card. GSD quick `261031-n1l`, inline. Existing choice to implement directly retained.

Removed the full flight summary card. The itinerary remains in Your flights and in the confirmed receipt; later stages keep a compact provider total above the actions. The working panel is centered at up to 840px. A flight-only layout class preserves the shared stay-checkout styles.

Planning evidence: [supplied before card](plan/before-card.png), [single-panel sketch](plan/single-panel.png).

## Executed local checks

- `npm --prefix frontend test -- src/features/plans/travel/FlightCheckout.test.jsx src/features/plans/travel/FlightSeats.test.jsx src/features/plans/travel/StayCheckout.test.jsx`: 41 passed, no skips.
- `npm --prefix frontend run build`: passed, existing large-chunk warning.
- `git diff --check`: passed.
- Cognito precheck and canonical `bash scripts/start-local-ready.sh`: final rebuild and temporary login/session/logout check passed. Changed JSX and CSS hashes match container copies.

## Browser verification

Authenticated as the example account using the protected local credential file. Used isolated Chrome DevTools MCP via the local stdio bridge. Light theme matched the supplied image.

Created test Plan `137ee467-e0ec-4f07-a82e-7c925d70f170` with a one-traveler Lisbon canvas through the real APIs. Exercised fresh flight search, offer verification, Your flights, Passengers, sandbox prebook, Seats (airline assignment), Baggage and Review & pay. Verify/prebook/status returned HTTP 200; no final booking or payment was submitted.

Desktop 1440×1000: the initial review contains exactly two FlightLeg regions (one outbound, one return); every later stage contains zero. Every stage has zero summary sidebars, one compact provider total (€401.47), and a centered 840px panel. [Measured stages](implementation/desktop-stages.json).

Mobile 390×844: provider status recovery restored checkout. Final review and seats have no repeated summary/flight legs, retain the provider total, and fit within the viewport (document width 390px, panel 358px). [Mobile measurements](implementation/mobile-stages.json).

Inspected screenshots:
- [Initial review](implementation/review-desktop.png)
- [Passengers](implementation/passengers-desktop.png)
- [Seats desktop](implementation/seats-desktop.png)
- [Baggage](implementation/baggage-desktop.png)
- [Seats mobile](implementation/seats-mobile.png)
- [Compact total and actions on mobile](implementation/total-mobile.png)

No clipping, overlap or horizontal page overflow observed. Final console has no errors; only existing Lit development and Stripe HTTP test-mode warnings. [Network](implementation/network.txt) includes one transient auth 500 during Docker recreation; after readiness/reload, auth and all checkout requests returned 200. [Source hashes](implementation/source-check.txt) confirm the final changes are served.

Loading, invalid input, unknown/failed recovery, empty-checkout and confirmation regressions were exercised by the existing checkout tests; separate live error injection was not repeated for this presentation-only change. Final payment/booking was deliberately not performed. No backend handler changed.

Soft-deleted only the test Plan, read back its deleted/recoverable state, and removed its local checkout receipt/view preference. [Cleanup](implementation/cleanup.json). Local app remains running at http://localhost:5174.
