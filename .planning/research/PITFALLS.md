# Domain Pitfalls

**Domain:** Conversational travel research and planning
**Researched:** 2026-09-26
**Overall confidence:** HIGH for product/security pitfalls; MEDIUM for provider-specific behavior

## Critical pitfalls

### Treating search results as saved decisions

**What goes wrong:** A transient result, comparison entry, or stale offer silently becomes a Selected Option or Map Pin.
**Why it happens:** Agent convenience bypasses a distinct confirmation and revision boundary.
**Consequences:** Loss of traveler control, incorrect plans, duplicate or stale choices.
**Prevention:** Exact challenge-and-commit flow in CRUD; search and comparison remain transient.
**Detection:** Any provider/search event directly mutates durable Plan state.
**Phase:** CRUD contracts and Canvas before provider search.

### Claiming a booking after redirect

**What goes wrong:** A redirect is shown as booked, paid, ticketed, or confirmed.
**Consequences:** Legal/trust harm and incorrect recovery behavior.
**Prevention:** Server-generated verified host, same-tab handoff, durable status `Opened provider; booking status unknown` only.
**Detection:** UI copy or data model includes a successful booking state without supplier confirmation.
**Phase:** Supplier handoff phase and release security review.

### Stale price or availability

**What goes wrong:** A traveler saves or follows an offer that changed after search.
**Prevention:** Explicit refresh and mandatory exact-option recheck before add-to-Plan and handoff; changed terms require fresh acceptance.
**Detection:** No query version/recheck token, or a late provider result replaces a newer complete set.
**Phase:** Connector/search contracts.

### Prompt/tool injection through external content

**What goes wrong:** A webpage or provider payload is treated as agent instruction or gains tool authority.
**Prevention:** Normalize untrusted content into typed evidence; isolate tool credentials; allow-list tool effects; never pass raw source text as instructions.
**Detection:** Raw HTML/provider text enters system/developer prompts or can trigger mutations directly.
**Phase:** Agent and Connector security design.

### Cross-traveler data leakage

**What goes wrong:** Browser-supplied IDs or weak token handling expose another traveler's Plan or conversation.
**Prevention:** Derive identity from verified Cognito token at every public service; authorize every Plan-scoped operation server-side.
**Detection:** Endpoints accept authoritative traveler IDs or only check authentication, not ownership.
**Phase:** Identity and CRUD foundation.

## Moderate pitfalls

### Raw research persistence

Raw source bundles become stale, expensive, and privacy-sensitive. Persist compact candidate/evidence references and fetch source detail on demand.

### Partial or replayed agent state

Interrupted work can overwrite newer traveler input or surface partial candidate cards. Use versioned checkpoints, cancellation markers, ordered events, and complete-shortlist delivery.

### Empty adaptive surfaces

Generating a flight/stay/car surface before need, inputs, and provider capability are confirmed creates dead ends. Gate each surface on all three conditions.

### Provider normalization drift

Different providers encode prices, fees, cancellation, currencies, and availability differently. Keep provider-neutral normalized contracts and preserve uncertainty/estimated-total labels.

### Overbuilding infrastructure before contracts

Choosing database, compute, or provider products before identity, mutation, event, and recovery contracts causes rework. Sequence architecture work from contracts outward.

## Minor pitfalls

- Calling every option a “booking” or every place a “Selected Option”; preserve glossary terms.
- Hiding provider outages behind empty results instead of retaining prior complete results and offering Retry.
- Allowing browser-provided external redirect URLs or open redirects.
- Letting automatic Plan titles overwrite traveler-entered titles.
- Treating inactive/deleted Brief entries as active ranking preferences.

## Phase-specific warnings

| Phase topic | Likely pitfall | Mitigation |
|---|---|---|
| Identity and lifecycle | Account enumeration or cross-Plan access | Neutral recovery responses, verified JWTs, ownership tests |
| CRUD/data model | Non-idempotent retries and unsafe delete | Request IDs, expected revisions, atomic soft-delete/restore, purge job |
| Agent graph | Stale work after interruption | LangGraph interrupt/checkpoint, cancellation, single active session |
| Workspace/UI | Model-generated executable UI | Validated WorkspaceManifest and component catalog |
| Search/providers | Misleading price/freshness | Provider identity, estimated totals, explicit refresh, final recheck |
| Canvas | Temporary results mistaken for saved pins | Distinct visual/state types and explicit confirmation |
| Supplier handoff | Open redirect or implied booking | Verified provider registry, server URL generation, unknown-status record |
| Operations | Sensitive logs and unbounded retries | Redaction, bounded retries, trace IDs without raw content |

## Sources

- Repository source-of-truth stories and contracts under `docs/user-stories/` and `docs/planning/`
- https://docs.aws.amazon.com/cognito/latest/developerguide/managing-security.html
- https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/docs/specification/2025-06-18/basic/authorization.mdx
- https://ag-ui.ai/en/technologies/ag-ui
- https://langchain-ai.github.io/langgraph/concepts/breakpoints/
