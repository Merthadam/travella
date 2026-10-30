---
status: planned
created: 2026-10-30
---
# Remove redundant traveler profile memory lookup

User approved removing the ineffective memory read in AgentTurnService. Execute inline under GSD quick.

1. Remove the memory lookup, unused import and turn-service dependency, including application wiring. Keep the separate profile memory synchronization API intact.
2. Consolidate obsolete mirror tests around canonical profile projection, explicit clears, and unavailable profile handling. Run agent turn, API and memory adapter regression tests.
3. Review the scoped diff, commit the implementation, and record results in the summary and STATE.md.

Acceptance: agent turns use the current CRUD profile directly; no memory lookup occurs; privacy projection and graceful unavailable-profile behavior remain intact. No frontend or CRUD handler changes.

<threat_model>
ASVS level 1, blocking threshold high. Preserve profile allowlisting and ephemeral graph input; never restore cleared values from advisory memory. No new trust boundaries or durable writes.
</threat_model>
