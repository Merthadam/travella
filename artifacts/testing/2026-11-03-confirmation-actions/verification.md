# Confirmation actions verification — 2026-11-03

## Delivered

Shared flight/stay confirmation actions: prominent **Return to my trip** button, explicit destination helper, truthful save status, secondary downloads/print. Mobile actions precede the receipt. Flight HTML is explicitly labeled as a Travella itinerary, not an airline ticket.

Prior direct-implementation choice honored. GSD quick 261103-dei executed inline. Before evidence and Chrome-rendered sketch captured before source edits.

## Executed checks

- `npm --prefix frontend test -- src/features/plans/travel/FlightCheckout.test.jsx src/features/plans/travel/StayCheckout.test.jsx`: 43 passed.
- `npm --prefix frontend test -- src/features/plans/travel src/features/plans/components/PlanningCanvas.test.jsx`: 348 passed, 12 existing skips, no failures.
- `npm --prefix frontend run build`: passed; existing large-chunk advisory remains.
- `git diff --check`: passed.
- Local Cognito precheck and `bash scripts/start-local-ready.sh`: passed at http://localhost:5174. Four changed production component/style files match their running container copies by SHA-256.
- Actual isolated Chrome DevTools MCP, authenticated as the configured example account. Dedicated stdio DevTools session used because the normal shared browser profile was occupied. Password/receipt tokens kept out of evidence.
- Existing saved flight reopened. Primary return button navigated to the same Plan without checkout query. Reopened confirmation retained the same booking.
- Existing stay recovered using its original encrypted receipt, status-only: sandbox status 200, canvas challenge 200, canvas PUT 200. No booking or payment request submitted. Subsequent reload and canvas GET 200 contained both the recovered stay and unchanged flight. Opened the saved stay via **View mock stay → View stay confirmation**. Primary return button returned to the same Plan.
- Desktop 1440×1000 and mobile 390×844 checked for both modes. No horizontal overflow. Mobile primary return positions: flight y=561, stay y=580; receipts below y=886 and y=905. Buttons visible before the detailed receipt.
- Both download buttons exercised; observed “Itinerary download started” / “Confirmation download started.” Print control remains enabled and existing print tests pass; physical printing/browser PDF saving was not exercised.
- Actual shared component rendered with explicitly labeled simulated save-error props. Alert remained readable, return enabled and callback worked. Fixture made no API or Plan mutation and was removed. This is presentation coverage, not a reproduction of the historical save failure.
- Flight and stay console/network inspected: no application errors or failed relevant requests; existing Lit development warning only. During fixture setup, a test-harness import initially failed because Vite exposes ReactDOM as a default export; corrected and fixture rerun successfully.
- All plan/implementation screenshots visually inspected: no overlap, clipping of the changed actions, or unreadable labels. Long receipts remain scrollable.

## Stay recovery limitation

The screenshot's stay existed in the server receipt journal but was absent from the saved Plan. Restoring that existing scoped receipt into the isolated test browser enabled the application's status-and-save recovery, and persistence was verified. Original failure cause could not be established from surviving evidence. No general save-conflict fix is claimed. User records were preserved; no temporary bookings or Plans were created.

## LiteAPI ticket findings

Official references checked:

- https://docs.liteapi.travel/docs/build-a-flight-booking-experience
- https://docs.liteapi.travel/reference/get_flights-bookings-bookingid

A read-only GET of an existing sandbox flight booking returned `ticketData.tickets` with two passenger ticket records containing `ticketNumber`. Only field names/types/counts were inspected in output; raw passenger/document/payment data was not recorded. No PDF/download URL appeared in that response, and no ticket-download endpoint was found in the public documentation checked. This does not establish that LiteAPI can never supply a PDF.

Current Travella flight projection/download omits those ticket records. This task does not add passenger ticket display, supplier PDF download, or boarding passes. Sandbox records are not valid for travel.

## Evidence

- [Before stay](plan/before-stay.png), [before flight](plan/before-flight.png), [layout sketch](plan/actions-sketch.png)
- [Flight desktop](implementation/flight-desktop.png), [flight mobile](implementation/flight-mobile.png)
- [Stay desktop](implementation/stay-desktop.png), [stay mobile](implementation/stay-mobile.png)
- [Save-error component fixture](implementation/save-error-component-fixture.png)

Running locally on this worktree; no main merge, push, or production deployment performed for this task.
