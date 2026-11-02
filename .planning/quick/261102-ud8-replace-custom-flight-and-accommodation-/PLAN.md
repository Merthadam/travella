---
status: complete
---
# Use LiteAPI's payment SDK

User explicitly chose LiteAPI SDK, continuing the direct implementation choice (no additional prototypes). Execute inline under GSD quick. Existing uncommitted accommodation payment work is a prerequisite and will be preserved/integrated; inspect its diff before including relevant files. No automatic main merge for this new task.

1. Replace split card/billing forms with a shared LiteAPI SDK component. The upstream SDK owns its form, Pay button, wallets and validation. Isolate its nested form and redirect in a same-origin iframe; pass the payment secret through postMessage only. Consent gates mounting. SDK callback page immediately scrubs provider-added return parameters before assets or messages; never forwards them. Parent verifies the original sandbox intent before booking. Handle failure/retry, authorized recovery, stale messages/unmount, duplicate completion and responsive height. Keep final totals and booking details.
2. Adapt flights and accommodation checkout to the SDK-owned submit, retain explicit consent and existing provider-confirmed booking boundary. Preserve guest data in parent memory across the iframe redirect. No added durable guest/payment storage or payment creation/capture.
3. Test real SDK contract, component/message boundaries, both checkout integrations and relevant backend prerequisite changes. Build, authenticated actual Chrome DevTools desktop/mobile sandbox flows including decline/retry and confirmation/recovery; inspect screenshots, network/console, clean temporary plans. Record any SDK limitations honestly and commit scoped changes/evidence.

References: https://docs.liteapi.travel/docs/user-payment ; live SDK and Stripe provider JavaScript inspected 2026-11-02. It creates its own form and always redirects; no completion callback or destruction API is exposed. Use documented LiteAPIPayment construction/handlePayment unchanged. Before-state screenshots under artifacts/testing/2026-11-02-liteapi-payment/plan/.

Live-test adjustment: Stripe redirects the top-level page. Added an allow-listed Plan checkout return plus encrypted15-minute guest/request recovery, followed by explicit final confirmation against the original intent. The initial assumption that the redirect stayed in the iframe was rejected by browser evidence. This supersedes the parent-memory-only return approach above.
