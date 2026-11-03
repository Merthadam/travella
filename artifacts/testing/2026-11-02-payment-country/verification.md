# Payment country verification

Implementation commit: `95fcd23`. Task began 2 November; browser verification completed 3 November 2026. GSD quick `261102-w0m`. User approved direct implementation and the supported LiteAPI Stripe Elements alternative; no additional prototype selection needed.

## Change and acceptance

Flights and stays share LiteAPI's direct Stripe Payment Element integration. LiteAPI still creates and captures the sandbox intent. Stripe hosts card details, validation and authentication. Only billing country is collected in Travella's existing SearchSelect, with ten results per page, search, keyboard selection and a bounded scrolling list that keeps pagination visible. No selected country is inferred from the typed query. The selected ISO code is passed directly to Stripe confirmation; it is not stored in Plan data. Country changes update the existing Payment Element, preserving card fields.

Consent, original sandbox-intent verification, duplicate-submit protection, encrypted guest recovery, and the sanitized allow-listed redirect callback remain. Standard card payments use `redirect: if_required` and complete inline. No backend code or provider amount/capture logic changed.

## Automated verification

- `npm --prefix frontend test -- src/features/plans/travel`: 321 passed, 12 existing external-fixture skips. The invocation also contained a nonmatching old canvas path; the actual canvas file was then run separately.
- `npm --prefix frontend test -- src/features/plans/components/PlanningCanvas.test.jsx`: 23 passed. Total relevant regression: **344 passed, 12 existing skips**.
- Focused payment, callback and flight integration run: 33 passed (included in the total above). Covers selected-country binding, query/selection separation, no country-triggered remount, consent, pending-submit guard, decline/retry, invalid fields, live/unconfirmed intent rejection, stale callbacks after consent withdrawal, storage/network failures and callback URL/expiry validation.
- `npm --prefix frontend run build`: passed, including after the final dropdown-height correction. Existing bundle-size advisory only.
- `git diff --check`: passed.

## Actual Chrome DevTools browser checks

Used isolated Chrome DevTools MCP and authenticated the example account with its private supplied credentials. Canonical app: http://localhost:5174. Cognito precheck, Docker rebuild, sign-in/session/sign-out readiness passed. Hashes of the shared component, stylesheet and callback HTML/JS matched the running container after the final rebuild.

- Flight: BUD–LIS, 12–17 May 2027, one fictional test passenger. Searched 58 results, selected Nuitee Air, completed passengers/seats/baggage/review. Country picker replaced the native selector. Public sandbox declined card showed an error and allowed retry. Selected Iceland, filled the valid public test card, then changed to Hungary; number/expiry/CVC remained populated. Payment and final booking succeeded at EUR401.47, confirmation saved to the Plan. Only `checkout` remained in the route query.
- Accommodation: searched 28 results, selected Melia Lisboa Aeroporto, one room, EUR835.03. Fictional Robin Booker and “Quiet room, please.” request. Mobile emulation triggered a reload: guest/request were recovered, consent was required again. Selected Hungary, paid with the public sandbox success card, received the confirmed stay and saved guest confirmation. Reload reopened the same saved stay.
- Readback: both canvas components were `mock-booked`; saved canvas contained neither payment secrets nor billing-country fields.
- Picker: no-match feedback observed; Hungary filtered to one option and Enter selected it. Pagination advanced from 1–10 to 11–20 of249. Final 390×844 mobile layout: payment width320px, no horizontal overflow, list height270px, full menu353px, Next-button bottom688px within844px viewport. Desktop1440×1000 also inspected.
- Final console: no errors. Warnings were Lit development mode, Stripe HTTP/wallet domain requirements, PaymentIntents migration advisory, and origin-trial notice. Final relevant network requests were200/304; no change-related failures. Rebuild briefly interrupted an earlier page/search, resolved by reloading after readiness. Intentional card decline behaved as expected.

## Evidence

Plan: [previous SDK form](plan/before-sdk.png), [approved shared picker](plan/approved-search-picker.png).

Final UI: [desktop picker](implementation/stay-picker-desktop.png), [mobile picker](implementation/stay-picker-mobile.png), [mobile Hungary search](implementation/stay-search-mobile.png), [mobile payment](implementation/stay-payment-mobile.png).

Journeys: [flight declined](implementation/flight-declined.png), [country change preserves card](implementation/flight-country-preserves-card.png), [flight confirmation](implementation/flight-confirmation.png), [stay confirmation](implementation/stay-confirmation-mobile.png).

The first flight-picker screenshot records the earlier height issue; the final desktop/mobile picker screenshots supersede it. Screenshots were visually reviewed. Card details shown are public Stripe test values only.

## Limits

Sandbox only. Live wallets and 3DS/bank redirect challenges were not browser-tested; localhost HTTP cannot verify live wallet behavior. Redirect scrubbing/allowlist/expiry are unit-tested; the existing encrypted recovery was exercised through a real browser reload. Twelve existing external-fixture cases remain skipped. No production deployment, push or main merge.

## Cleanup

Deleted only the two temporary Plans created for this verification (`cb719900-1f4a-4311-8564-98e15a7bd9e6`, `784f46a1-1bd5-4314-8481-a64aff01ed73`); both subsequent detail reads returned404. The second Plan was used only for final CSS/pagination inspection and no payment was submitted. Preserved the existing fixture Plan. Removed test recovery drafts; local app remains running.

## Provider references

- https://docs.liteapi.travel/docs/direct-stripe-integration-stripe-elements
- https://docs.stripe.com/js/elements_object/create_payment_element
- https://docs.stripe.com/js/elements_object/update_payment_element
- https://docs.stripe.com/js/payment_intents/confirm_payment
