---
status: passed
threats_open: 0
reviewed: 2026-11-04
---
# Scoped shipment security review

Inline review of `44246b9..58cc7c0`, including provider coordinate propagation, shared receipt/pin contracts, automatic canvas reconciliation and tests. No blocking findings identified in this patch; this is not a repository-wide audit.

- Ownership and authentication remain enforced in existing travel dispatch (`read_plan(identity.subject, ...)`) and CRUD canvas `_active` checks. New lookups use the existing same-origin Plan-scoped hotel-detail route; no arbitrary URL fetch or new credential path.
- Automatic mutations use existing challenge, revision, context and idempotency checks; map and receipt marker persist in one canvas snapshot. Delayed results are guarded by abort/epoch/Plan/reference/public-input checks, and conflicts/save errors pause updates.
- New location structures allow only bounded provider IDs, finite geographic coordinates and typed fields; duplicate identities and category mismatch are rejected in durable CRUD. Invalid coordinates never create an invented pin. Map and snapshot limits remain enforced.
- Connector coordinates are passed inside existing sealed checkout state; browser resolver only uses hotel identity/name/address/coordinates or IATA endpoints. Guest/payment documents are not passed into map resolution. Existing agent projection strips stay reservation documents; integration test verifies this.
- Tests cover anonymous/other-owner access, invalid private field injection, invalid sync marker, revision conflict, idempotency, deletion/recovery, and removal persistence. Review of staged documentation/evidence found no credential values.
- Product authorization: the user's explicit automatic-pin request supersedes the prior separate Add/Review step. Existing confirmed bookings can gain pins on next load. Missing coordinates/full maps remain unchanged; no supplier transaction is initiated by reconciliation.

Rollout note: shared frontend/agent/CRUD schema additions should deploy together. Reverting to older strict schemas after new fields are persisted requires retaining compatibility or removing the added fields; no destructive database migration is introduced.
