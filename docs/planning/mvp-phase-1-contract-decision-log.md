# MVP phase 1 contract decision log

This log records the narrow contract choices made while converting the accepted stories into the phase-1 service contract. It does not supersede the product decisions in the user stories or ADR-0001.

| ID | Decision | Status / reason |
| --- | --- | --- |
| C-001 | Use **Planning Requirements** to mean a versioned, traveler-confirmed snapshot of the active Planning Brief, rather than introduce a duplicate data structure. | Contract decision. It gives workspace generation a stable, reviewable input while preserving the existing Brief terminology. |
| C-002 | Treat the first workspace as ready only after one destination/city and a requirements snapshot are confirmed. | Contract decision based on the single-destination MVP and the need to center the permanent map. It does not require all optional travel inputs. |
| C-003 | Make the map a permanent, approved frontend workspace component; never ask the agent to generate executable UI for it. | Confirmed user direction, expressed as an implementation boundary. |
| C-004 | Include flight, accommodation, and car-rental surfaces only when the corresponding need is confirmed, its minimum inputs are confirmed, and a provider capability is functional. | Confirmed user direction plus existing provider-visibility rule. It prevents empty, speculative, or demo surfaces. |
| C-005 | Generate the workspace as a validated `WorkspaceManifest`, not a model-generated screen and not an automatic search. | Contract decision that applies the existing validated-UI/security direction. |
| C-006 | Use a two-step challenge-and-commit flow for requirements confirmation, with CRUD as the only confirmation-token verifier. | Consistent with US-002's single-use, exact-change confirmation requirement and CRUD durable-data ownership. |
| C-007 | Preserve a map-only fallback when agent/capability composition is unavailable. | Contract decision. A confirmed Plan remains usable and no provider outage should remove the map. |
| C-008 | Keep raw research/provider content transient; checkpoint only compact candidate/evidence references and persist only confirmed Plan data through CRUD. | Existing story and architecture decision, made explicit at the contract boundary. |
| C-009 | Keep the first browser Plan API limited to active Draft Plans and Recently deleted. Soft deletion uses `DELETE`; opening and creation use `GET /plans/{planId}` and `POST /plans`. | Confirmed user direction. Past/completed holiday views are deferred so this does not introduce a new lifecycle state or date-derived classification. |

## Decisions still requiring product or technical review

- Whether a traveler may deliberately confirm a map-only workspace before dates, party, or transport needs are known, and the exact minimum requirement set by journey type.
- The exact confirmation challenge TTL, digest, revocation, and UI presentation.
- The source and health semantics of the provider-capability registry.
- The exact workspace-manifest schema and approved component catalog.
- The atomic persistence/reconciliation design for CRUD revisions and agent checkpoints.
