---
status: complete
---

# Selected accommodation map A implemented

Traveler chose A with translucent other hotel pins and opaque activities. Reused the real search, map and chat components for temporary shared hotel inspection; independently scrolling sidebar/results; numbered current-page markers; 25% opacity on other hotels; compact map/results tabs; current-search chat links across pages; preserved historical/exact-room detail behavior and durable-choice boundaries.

All four plan steps completed inline through the GSD quick workflow. Prototype retained separately on `prototype/stay-map-link-20261104` (`1ac82a0`, state `7ef95ee`); production tree contains no prototype fixture or switcher.

Verification: 133 focused frontend tests, production build, canonical Docker authentication readiness and six runtime source hash checks passed. Authenticated real Chrome DevTools agent search returned 22 sandbox stays; desktop/mobile map/card/chat selection, activity opacity, independent scrolling, reload, paging, empty results and room details passed. No console errors or failed fetch/XHR requests in final main walkthrough. Final screenshots inspected. Existing development warnings and geographic marker overlap documented.

Evidence: [verification](../../../artifacts/testing/2026-11-04-stay-linked-map/verification.md). Preview: http://localhost:5202. No backend CRUD change, booking, push, merge or deployment. Wider Phase 18 acceptance unchanged.
