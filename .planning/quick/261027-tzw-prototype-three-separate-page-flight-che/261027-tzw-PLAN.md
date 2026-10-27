# Flight checkout prototypes

Question: which separate-page checkout structure best carries a traveler from a Flights component to an understandable booking and useful offline itinerary?

## Locked context
- Flights first; one booking per Plan. Stays can adopt the selected structure later.
- Enter from the Flights component; structured checkout owns the steps, optional agent assistance is not required.
- Realistic passenger/contact forms, seats/bags when available, final review, sandbox payment, confirmation and Back to Plan.
- No reusable passenger profiles or remember-me control. Do not infer a legal conclusion from this product preference.
- User wants a useful downloadable receipt/itinerary and eventually an exportable complete Plan. Sandbox documents must clearly say they cannot be used to travel.
- User explicitly requested prototypes. No production variant selected.

## Execution
1. Build three dev-only variants under the existing authenticated Plan route with query parameters, a shared arrow/keyboard switcher, fictional fixtures and memory-only state. A: guided checkout, B: expandable worksheet, C: document-led layout.
2. Include complete simulated transitions, failure/pending states, a working offline HTML itinerary download and browser print/PDF action. No live booking, payment, Plan mutation, or personal-data storage.
3. Run a separate Vite preview, exercise all variants through isolated Chrome DevTools MCP, inspect desktop/mobile screenshots and console/network. Preserve evidence under artifacts/testing/2026-10-27-flight-checkout-prototypes/.
4. Capture on prototype/flight-checkout-20261027. Record summary and user-review links. Keep production implementation pending the user's selection.

## Acceptance
- Variants differ structurally and preserve Travella's visual language/header.
- Every variant reaches a labeled test confirmation and can return to its simulated Flights component.
- A real downloadable sample is available; no boarding-pass or real-ticket claims.
- Variant URL survives reload; data does not persist. Arrow shortcuts ignore form inputs.
- All required evidence is recorded honestly; no prototype promoted to production.
