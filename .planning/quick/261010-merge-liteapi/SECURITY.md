---
status: passed
threats_open: 0
reviewed: 2026-10-10
scope: LiteAPI search and sandbox booking branch changes
---

# Scoped pre-merge security review

Reviewed inline against origin/main and the existing boundary tests. No unresolved security finding was identified in this scoped review; this is not a full-project security audit.

| Boundary / threat | Observed mitigation | Verification |
| --- | --- | --- |
| Cross-traveler or cross-Plan provider access | Authenticated BFF session; independent Agent identity and owned-Plan read before dispatch; private MCP requires matching subject/Plan context | travel proxy, travel API and travel security tests |
| Cross-site booking submission or browser identity forgery | Existing BFF CSRF protection; explicit POST action allowlist; server session token; strict criteria reject browser identity fields | proxy CSRF/identity and Agent ownership tests |
| Real booking via mock checkout | Private cipher refuses live keys before provider access; input requires explicit mock consent; flight confirmation checks provider sandbox environment | both checkout suites, including live-key and consent rejection |
| Replayed, modified or cross-Plan checkout handles | Encrypted kind/scope-bound handles, 15-minute submission TTL and seven-day readback TTL | tamper/expiry/scope tests |
| Duplicate supplier reservation after interruption | Deterministic hotel client reference with readback; transactional flight journal claims before prebook; completion retry retains same prebook | timeout/recovery/idempotency tests |
| Credential or raw provider payload exposure | Provider credentials remain in private MCP; bounded output projection at Agent and BFF; generic errors; receipt tokens travel in POST bodies; no arbitrary provider URL input or redirects | projection, safe-failure, query-string and redirect tests |
| Unreviewed durable Plan mutation | Checkout does not write CRUD; explicit revision/challenge-based save; bounded mode-specific mock summaries; real booked claims rejected | FastAPI canvas CRUD tests |
| Stale asynchronous confirmation changing another Plan | Plan-scoped receipt key, effect cancellation and source Plan guard; pending status cannot claim booked | frontend recovery and canvas tests |

109 relevant backend tests and 33 frontend tests passed. Local Compose keeps the travel MCP private and persists only encrypted technical flight receipts in its dedicated volume. AWS deployment behavior was not exercised by this merge task.
