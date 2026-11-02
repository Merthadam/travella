# Three accommodation payment prototypes delivered

User asked for a proper card-payment step 3 and selected three interactive alternatives. Built A classic two-column checkout, B focused single-column payment and C review document with card drawer on the existing authenticated /plans host. All scenarios are clearly simulated and memory-only.

Primary source: `prototype/stay-payment-20261101`, `31af39d`, isolated `/Users/adammerth/.codex/worktrees/travella-payment-prototypes-20261101`. Preview: http://localhost:5200/plans?prototype=stay-payment&variant=B. One command: frontend `npm run prototype:payment`.

Actual Chrome DevTools example-account desktop/narrow-viewport checks passed for each variant, including card/billing entry, validation, consent, processing, decline/retry, bank-verification cancellation/approval, drawer dismissal, switching, reload reset, console and no-mutation network checks. Build passed. Screenshots inspected. Evidence: `artifacts/testing/2026-11-01-stay-payment-prototypes/verification.md`.

Recommendation B keeps card payment central while retaining compact booking review. User selection pending; production checkout unchanged. Existing FlightPayment and LiteAPI user-payment contracts are a starting point for eventual hosted-card sandbox integration. No real payments, new Plan records or provider submissions. Keep prototype branch/server for comparison; rewrite the selected design with production contracts after selection.
