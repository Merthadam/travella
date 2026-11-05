---
status: passed
threats_open: 0
reviewed: 2026-11-05
---
# Scoped shipment security review

Inline review of the merged delta against origin/main 97d610a, covering location criteria, provider references, agent workspace events, map inspection and booking reconciliation. No blocking findings identified; this is not a repository-wide audit.

- Saved-place names/coordinates are re-resolved from the authenticated Plan snapshot in `resolve_stay_location`. Browser/model-supplied anchors are replaced. Missing/foreign IDs and changed saved geometry fail closed. Named references use bounded provider IDs through the existing connector, never arbitrary URLs.
- Authenticated manual dispatch still calls the existing owner-aware Plan/context APIs. Agent workspace input is typed, topic-restricted and bounded; specialist output remains allowlisted. Map/card inspection is ephemeral; location filter application searches without creating durable choices.
- Lookup counts, semaphore, deadlines, result counts, radii and array sizes remain bounded. Radius retrieval is only a superset; exact requested distance is enforced locally. Missing coordinates never become fabricated points or routed travel times.
- Consolidation retains main's finite coordinate and provider-identity contracts, duplicate identity validation, cancellation identity guard, abort/Plan/epoch checks, autosave challenges and revision protections. The known older managed pin is associated with this Plan's confirmed hotel while preserving its user edits. No arbitrary legacy place is silently deleted.
- Only public hotel location fields or airport endpoints reach map resolution. Private reservation/guest documents remain stripped from agent context. No new credential path or supplier booking call is introduced by recovery.
- Real HTTP integration tests cover authentication/ownership boundaries, invalid/private fields, persisted updates, deletion/recovery and stale/idempotent writes. Merged regression checks also cover forged anchors, provider-reference scope, late responses, duplicate prevention and explicit pin removal.

Deployment retains main's existing shared schema additions. No destructive migration. Older strict-schema binaries still require compatibility handling if rolled back after new fields have been saved.
