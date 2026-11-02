# Accommodation payment layouts — design verification

Date: 1 November 2026. User explicitly chose three interactive layouts before implementation. Primary source: `prototype/stay-payment-20261101`, commit `31af39d`, isolated worktree `/Users/adammerth/.codex/worktrees/travella-payment-prototypes-20261101`. Production remains at the merged guest-details implementation; no payment integration changed.

## Working previews

- A — Classic two-column payment and compact reservation sidebar: http://localhost:5200/plans?prototype=stay-payment&variant=A
- B — Focused single-column card form and collapsible booking details: http://localhost:5200/plans?prototype=stay-payment&variant=B
- C — Review document and separate payment drawer: http://localhost:5200/plans?prototype=stay-payment&variant=C

Run `npm run prototype:payment` from that worktree's frontend. Existing local backend on port 8003; throwaway auth proxy forwards canonical origin 5174. Real authentication/header/read-only Plan loading remain, while booking context and payment outcomes are fictional. Light prototype surfaces are deliberately isolated from the current account's dark header theme.

## Executed checks

Used an owned isolated Chrome DevTools MCP browser because the configured shared profile was occupied. Authenticated as the example account using the supplied password file without printing credentials. Initial signed-out session 401 was expected; sign-in, authenticated session, profile and Plan reads returned 200.

- Exercised A/B/C on desktop and at 390×844 narrow viewport. Desktop snapshots use 1440-pixel width. No horizontal overflow; drawer client/scroll width both 390. Narrow viewport checks did not emulate touch gestures or a mobile keyboard.
- Entered only the documented fictional test card, future expiry, CVC 123 and fictional billing postal codes. Changed billing country. Required fields, explicit consent and expiry validation were checked; an expired date produced the expected validation feedback.
- A: opened guests/requests and cancellation terms, simulated processing, decline/retry and success. Successful mobile payment also exercised.
- B: opened/closed booking details, simulated bank verification, cancelled and retried verification, approved it, and observed success. Mobile decline, retry and success passed.
- C: opened payment drawer, closed with Escape, reopened with retained edits, and completed simulated payment. Mobile drawer scrolling exposed the total/consent/payment control; successful payment passed.
- Switcher arrows update the URL. Keyboard arrows switch variants outside inputs, while arrow use in a postal field leaves the variant unchanged. Form edits survive variant switches. Reload retains URL variant C and clears card/billing edits and consent. Success reset clears consent and disables payment.
- State inspector omits card values. Browser storage check found no entered card/postal data. Network evidence shows auth/profile/Plan reads and sign-in only: no payment, reservation or Plan mutation requests. No test Plans were created, so CRUD cleanup was unnecessary.
- Console: no errors; existing Lit development warning only. Sanitized requests: `network.txt`.
- `npm run build`: passed after final source corrections; existing large-bundle warning only. `git diff --check`: passed. No unit tests added/run for this throwaway design study; actual browser interactions are the verification gate.
- Visually inspected every saved screenshot. Corrected inherited dark input styling and global label margins, and fixed a prototype-mount substitution that had altered the host skip-link target. Final skip link is `#plans-main`. Separate scrolled viewport captures show payment controls unobscured by the floating design switcher; full-page mobile screenshots retain the switcher's fixed overlay position.

## Screenshots

- A: [desktop](plan/a-desktop.png), [mobile](plan/a-mobile.png), [mobile controls](plan/a-mobile-controls.png), [decline](plan/a-declined.png), [success](plan/a-success.png).
- B: [desktop](plan/b-desktop.png), [mobile](plan/b-mobile.png), [mobile controls](plan/b-mobile-controls.png), [mobile decline](plan/b-mobile-declined.png), [bank verification](plan/b-bank-verification.png).
- C: [desktop review](plan/c-desktop-review.png), [desktop drawer](plan/c-desktop-drawer.png), [mobile review](plan/c-mobile-review.png), [mobile card entry](plan/c-mobile-card.png), [mobile payment control](plan/c-mobile-pay.png).
- Existing production payment-step before state: `../2026-11-01-stay-guest-details/implementation/desktop-review.png`.

## Integration findings and limits

Current accommodation prebook uses `usePaymentSdk: false` and booking uses `ACC_CREDIT_CARD`; no real user card is collected. Existing flight code already has a hosted sandbox Stripe card component. LiteAPI documents a user-payment flow with `usePaymentSdk: true`, paired prebook/transaction IDs and booking via `TRANSACTION_ID`: [official SDK guide](https://docs.liteapi.travel/docs/user-payment). Its [direct Stripe guide](https://docs.liteapi.travel/docs/direct-stripe-integration-stripe-elements) describes hosted card entry and provider-managed payment intents; direct publishable keys require provider access. These sources were read for implementation feasibility, not as proof the prototypes process payments.

All totals, room terms, taxes, guests and requests in these previews are fixtures. Only the stated test card is accepted by the simulation. No processor or real bank authentication is invoked, no booking is made and no card details are sent. Production implementation and provider end-to-end testing await the user's layout selection. Recommendation B; user selection pending. Owned verification browser closed; preview server and canonical app left running.
