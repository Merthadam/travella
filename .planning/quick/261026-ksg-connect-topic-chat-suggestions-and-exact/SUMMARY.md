---
status: complete
---
# Connected travel discussions and manual browsing

Implemented in `b0182f1`. Compact Canvas-style suggestions now attach to their assistant reply and persist with it. Discuss carries an exact search/option/room reference as removable context without changing typed text. Compare submits selected references directly. Explicit View all results restores that search and filters in manual browsing. Manual rooms and return flights use the same exact, revision-checked preferred-choice dialog as chat; host-authored manual review needs no model invocation.

The Agent owns a bounded, ten-minute, owner/Plan-scoped registry of normalized observations. No raw supplier payloads or checkout tokens enter it, topic history or checkpoints. Search results and handoff counts remain aligned when payloads are truncated. CRUD retains reply-specific summaries and rejects expired acceptance or changed references under a reused run identity.

Verification: 48 distinct backend tests pass across registry, SDK worker, real FastAPI/SQLite topic/choice handlers and auth transports; 45 frontend tests pass with one conditional SSE fixture skipped. Build and diff checks pass. Authorized authentication retry, normal local rebuild, health/session checks and source hashes pass. Chrome DevTools authenticated example-account journeys exercised both directions for stays and flights, live grounded room discussion and two-flight comparison, exact manual confirmation, reload persistence, mobile context/draft preservation, removal and pane switching. Screenshots inspected; a dark-theme chip contrast issue was corrected.

Evidence: [verification](../../../artifacts/testing/2026-10-27-connected-travel/verification.md), [desktop plan](../../../artifacts/testing/2026-10-27-connected-travel/plan/desktop.png), [desktop comparison](../../../artifacts/testing/2026-10-27-connected-travel/implementation/flight-comparison-desktop.png), [mobile context](../../../artifacts/testing/2026-10-27-connected-travel/implementation/discussion-context-mobile.png).

Limits: LiteAPI sandbox, no bookings. Air France fare verification failed in the live sample and was explicitly labeled; the independent Nuitée fare recheck succeeded. Existing development warnings and build chunk advisory remain. Registry references expire on restart/eviction and require fresh search; durable summaries remain readable. Full Phase18 live-quality matrix/light/native-zoom acceptance and user UAT, and Phase15/17 statuses, are unchanged. No merge or push performed.
