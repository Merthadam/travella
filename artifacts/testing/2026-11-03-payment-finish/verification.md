# Payment completion recovery — 3 November 2026

## Outcome and cause

The user's EUR185.27 BUD–MXP sandbox flight was already confirmed by LiteAPI. The actual tab showed “Couldn’t verify the mock booking” above the screenshot. Its existing receipt's read-only status returned the confirmed booking. Clicking **Check booking status** displayed the confirmation and saved it to the original Plan; a separate authenticated browser reopened the saved document. No second payment or booking was submitted for this Plan.

The reproducible frontend defect was that a failed flight book/readback response left `ready_to_book`, reset consent, and never started status polling. The shared payment callback also treated a resolved failure (`null`/`undefined`) as completion and deleted recovery data. The precise original supplier error is unknown; asynchronous ticketing or delayed metadata is plausible, not proven. No backend sandbox or booking-identity checks were weakened.

## Change

- A failed flight booking response enters the existing unresolved-reservation state. Automatic checks use the same receipt and retry transient errors, bounded to 12 checks per polling cycle; manual status checks remain available. Payment and booking are not automatically resubmitted.
- Successful status reads clear stale errors and show the existing confirmation. Both checkout parents return the booking outcome and release payment busy state even when the payment component has unmounted.
- Shared payment keeps its session through the parent's internal consent reset and shows progress during completion. It rechecks the original intent when a traveler withdraws and renews consent. Payment remains gated by consent and verified sandbox intent.
- Recovery drafts survive pending/error outcomes and are removed after confirmed booking, including confirmation recovered by polling in either checkout mode.

Existing explicit direct-implementation preference was honored. GSD debug ran inline. No new prototype selection was requested.

## Automated checks

Final commands:

```
npm --prefix frontend test -- src/features/plans/travel src/features/plans/components/PlanningCanvas.test.jsx
npm --prefix frontend run build
git diff --check
```

Results: **348 passed, 12 existing external-fixture skips**; build and whitespace checks passed. Existing bundle-size advisory only. Focused payment/flight/stay suite passed 52 tests. New regressions first failed against the original code, then passed: lost book response plus a failed status read recovers with one book request; null/pending outcomes retain recovery data; parent consent reset does not replace booking progress. The late-success test also verifies renewed consent rechecks authorization without another payment or automatic booking.

## Actual Chrome DevTools verification

Authenticated as the supplied example account using private local credentials. Used actual isolated Chrome DevTools MCP because the shared MCP browser profile was locked. The user's existing Chrome tab was inspected and recovered separately through its visible status control.

Canonical app: http://localhost:5174. Cognito precheck, Docker rebuild and sign-in/session/sign-out readiness passed. Changed component/hook hashes matched the running app container. No backend source changed.

Created one isolated temporary Plan from the existing fixture's non-booking canvas, preserving the fixture and the user's Plan. Actual API challenge/save contracts were used; no durable state was changed directly in the database.

1. **Flight desktop, 1440×1000:** searched BUD–LIS, 12–17 May 2027, one fictional passenger; selected Nuitée Air EUR401.47; traversed passengers, seats, baggage and payment; selected Hungary and paid with the public sandbox success card. A test-only browser fetch wrapper dropped the real book response after HTTP200, rejected the first automatic status check, then held the second until the recovery screenshot was captured. Releasing it produced real supplier confirmation automatically. Counters: **one book request, two automatic status attempts**, no repeat payment. Error disappeared; confirmation was saved. Reopening the saved flight succeeded.
2. **Accommodation mobile, 390×844:** searched Lisbon and selected Meliá Lisboa Aeroporto, single standard room, 12–17 May 2027, EUR835.03. Used fictional example guest details. Mobile emulation reloaded checkout; encrypted guest recovery worked and consent was required again. Selected Hungary and paid with the public sandbox success card. Repeated the same lost-response/status-failure injection for this temporary Plan only. Counters: **one book request, two automatic status attempts**. Recovery data remained present while unresolved, then was absent after the real confirmation. Confirmation saved and survived reload. No horizontal overflow in payment, recovery or confirmation.
3. API canvas readback contained `mock-booked` for both components and no payment secret. Relevant payment/book/status and Plan challenge/save requests returned200 (static responses included304). Console had no errors; existing warnings were Lit development mode, Stripe HTTP/wallet-domain requirements, PaymentIntents migration advice and origin-trial support. Deliberate fetch failures are explicitly identified in recovery screenshots; no fake booking confirmation was injected.

Final small lifecycle hardening (renewed-consent recheck and verification-progress wording) was regression-tested after these journeys, followed by rebuild/source verification. The browser payment journeys exercise the same booking/polling code; no further payment was made for the wording change.

## Evidence

- Plan: [user's stuck screen](plan/before-stuck.png), [completion flow sketch](plan/completion-flow.png). Sketch encoding was corrected after its initial capture; behavior/layout unchanged.
- Original user's booking: [recovered and saved confirmation](implementation/existing-booking-recovered.png).
- Flight: [before Pay](implementation/flight-before-pay.png), [automatic status recovery](implementation/flight-recovering.png), [automatic confirmation](implementation/flight-auto-confirmed.png).
- Stay mobile: [before Pay](implementation/stay-before-pay-mobile.png), [status recovery with retained draft](implementation/stay-recovering-mobile.png), [automatic confirmation](implementation/stay-auto-confirmed-mobile.png).

Screenshots were visually inspected for clipping, overlap and incorrect states. Card details shown are public test values. Only fictional guest details were submitted for the temporary Plan.

## Cleanup and limits

Deleted only temporary Plan `82702c22-0a68-44d5-b357-63498a01f069`; subsequent detail read returned404. Removed its browser recovery entries. Preserved the original user Plan and fixture. Reset mobile emulation. Local stack remains running.

Sandbox only; no live payment, wallet or 3DS challenge tested. No backend CRUD changes. Twelve existing fixture skips remain. Original upstream error cannot be reconstructed, but the observed failure state and recovery are covered. No push or main merge in this fix.

Provider lifecycle reference: [LiteAPI webhooks — asynchronous flight confirmation](https://docs.liteapi.travel/docs/using-liteapi-webhooks).
