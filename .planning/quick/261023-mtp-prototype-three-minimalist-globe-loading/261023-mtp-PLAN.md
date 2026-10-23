---
mode: quick
---
# Canvas globe loading prototypes

Question: which presentation makes a generated canvas clearly unavailable until complete, using a minimalist globe and an honest completed-item count for an already-confirmed destination?

1. Add three development-only rendering variants on the existing authenticated /plans route, following the travel-cards prototype convention. Keep the app header/auth and use an in-memory Lisbon journey with stubbed interactions. Separate local Vite preview; do not rebuild the running main stack.
2. Provide shareable ?prototype=canvas-globe&variant=A|B|C, floating arrow/key switcher, simulated count/play/finish/cancel/retry controls, regeneration and reduced-motion previews. Do not present partial cards as interactive.
3. Authenticate as the example account, exercise each variant with Chrome DevTools, inspect desktop/mobile screenshots and console/network results. Capture evidence in artifacts/testing/2026-10-23-canvas-globe-loading/plan and keep prototypes on prototype/canvas-globe-loading-20261023.

Acceptance: destination already confirmed, count only completed simulated items, no percentage/unknown denominator, canvas revealed only on completion, cancel/retry leave no durable mutations, controls usable on mobile, reduced-motion globe stays still, URL survives reload and arrow cycling.

User choice pending; no production implementation authorized by this prototype task.
