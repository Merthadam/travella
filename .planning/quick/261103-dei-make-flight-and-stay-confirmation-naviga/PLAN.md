---
status: complete
---
# Clear confirmation navigation and supplier document research

User wants the return-to-Plan action to be obvious on flight and stay confirmations and asks whether LiteAPI provides a ticket download. Existing direct implementation preference applies. Execute inline under GSD quick's no-automatic-agent fallback.

1. Verify official LiteAPI flight booking/document capabilities and inspect the screenshot's failed-save condition without changing or resubmitting any supplier booking. Record what can and cannot be established.
2. Make “Return to my trip” the prominent primary confirmation action in both modes, ahead of secondary download/print actions. Keep save status truthful and visible; preserve provider-vs-Travella document labeling and sandbox boundary. Capture a before screen and a reviewable layout sketch before editing.
3. Exercise real authenticated Chrome DevTools flight and stay confirmations, return navigation and responsive layouts; check console/network, relevant regression/build tests and changed-source hashes after local rebuild. Use temporary test Plans where needed, preserve user records, record evidence and commit scoped work.

Acceptance: clear primary return action visible without reading the receipt, consistent labels across modes, downloads and print remain available, no false “saved” claim on save failure, existing booking remains recoverable and no new payment is submitted. Any save fix scope depends on observed runtime evidence.

Evidence: artifacts/testing/2026-11-03-confirmation-actions/.
