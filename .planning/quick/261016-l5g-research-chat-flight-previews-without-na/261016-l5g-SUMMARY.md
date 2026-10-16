---
status: complete
quick_id: 261016-l5g
source_commit: 1dce695
test_commit: d2f1723
---
# Research flight previews delivered

Research chat can show up to three provider-backed flight cards through the existing A2UI catalog, including flight illustrations and expandable fare/leg details. There is no View all, supplier link or booking navigation in this surface. Canvas navigation remains available.

Explicit flight requests use the existing flight-only private tool gate within the Conversation graph node. Required dates, passengers/ages, airports and country remain validated; natural clarification replies work. General research continues on its ordinary path. Research previews neither modify Trip Brief requirements nor save a Canvas. Inventory stays out of graph/checkpoint channels and is released or hidden after replacement, expiry, Stop, context changes, plan switching and reload.

Verification: 209 focused Python tests passed; final 18 Research tests passed including 11 React assertions against actual generated SSE; 13 adjacent frontend tests passed (one fixture-gated case exercised through Python); build passed. Broader turn/API check: 22 passed, one previously documented profile-memory payload failure remains. No new dependencies or CRUD implementation changes.

Authenticated Chrome at localhost:5174: missing-date and passenger gates, all-three-adults reply, actual sandbox results (3 of 87), flight details, zero navigation buttons/links, desktop and 390px layout, unchanged research context and no saved Canvas, reload behavior and clean post-reload console/network verified. Only test Plan faf06d05-bc19-46c6-987b-179944cd0cf4 was deleted and confirmed lifecycle=deleted.

Evidence: artifacts/testing/2026-10-16-research-flight-previews/verification.md. GSD quick executed inline under the skill's Codex spawn restriction; reused existing visual design and the session's prototype decision.
