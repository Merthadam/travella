---
status: complete
date: 2026-10-25
type: quick
---

# LiteAPI research tools

Implemented in `caf905b`: four read-only tools on the private MCP catalog and existing Claude Canvas agent: `get_stay_details`, `get_stay_reviews`, `get_stay_rates`, and `verify_flight_offer`. The first and third reuse existing connector operations. Reviews and verification add normalized contracts, authenticated dispatch and HTTP support. Runtime travel guidance and MCP documentation describe the tools and their limits.

Flight verification accepts only an opaque, expiring search reference scoped to provider account, traveler and Plan. Supplier identifiers remain private. References are process-local; restart/eviction requires another search, and multi-replica deployments need affinity or shared expiring state. Guest identity fields, emails and HTTP links are excluded from review evidence. The tools preserve unknowns, sandbox labeling, date provenance, bounded calls/output and cancellation. No new reservation/payment operations or Plan writes.

Verification: 387 broad regression tests passed; eight React fixture failures reproduce on unchanged main `4e0780a` because they request an absent Edit details button. The final targeted run passed 29 tests, including all 23 new cases. Scoped lint, format and diff checks passed. Deterministic tests exercise registered SDK tools, private MCP, connector requests and authenticated HTTP handlers. See [verification evidence](../../../../artifacts/testing/2026-10-25-liteapi-research-tools/verification.md).

No live provider/model calls, frontend or CRUD persistence changes, deployment, push or merge. The running main stack remains unchanged. Separate Flights/Stays conversations and flexible-date matrix remain follow-up work; live supplier and model-choice acceptance is not claimed. No phase acceptance status changed.
