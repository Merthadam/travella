# Research Summary: Travella

**Domain:** Conversational travel research and planning
**Researched:** 2026-09-26
**Overall confidence:** MEDIUM-HIGH

## Executive Summary

Travella's accepted architecture is aligned with current agent-product patterns: Cognito provides managed identity and JWT authorization, LangGraph provides durable interruptible orchestration, AG-UI provides the live agent/frontend event boundary, and MCP can isolate provider tools behind a private service. The ecosystem reinforces the repository's decision to keep raw external content, provider credentials, and durable Plan mutations outside the browser and outside model-controlled state.

The strongest product differentiators are not autonomous booking or broad itinerary generation. They are trustworthy control mechanisms: editable traveler context, explicit challenge-and-commit mutations, compact evidence-backed recommendations, a validated adaptive workspace, and clear distinction between research, saved Plan decisions, and external booking.

The roadmap should establish identity, lifecycle, CRUD revision/idempotency, and event contracts before investing in provider breadth or generative UI. LangGraph persistence and AG-UI interrupts make recovery feasible, but only if checkpoint state is versioned and reconciled with CRUD's authoritative snapshot.

## Key Findings

**Stack:** Preserve Cognito, AG-UI, LangGraph, AWS, and the four-service boundary; keep database, compute, provider, and final generative-UI choices behind explicit contracts.
**Architecture:** Browser → Cognito/AG-UI/CRUD; Agent → CRUD + private Connector/MCP; CRUD alone owns durable Plan state.
**Critical pitfall:** Never turn transient or stale research into a saved choice or describe a supplier redirect as a booking.

## Implications for Roadmap

1. **Identity and private Plan foundation** — establish Cognito validation, ownership, lifecycle, revision, idempotency, deletion, and recovery.
   - Addresses: account and Draft Plan table stakes.
   - Avoids: account enumeration, cross-traveler access, unsafe retries, and irreversible deletion.
2. **Conversation, Brief, and destination discovery** — build one Plan-scoped graph with evidence normalization, interruption, compact candidates, and explicit destination confirmation.
   - Addresses: conversational differentiation.
   - Avoids: prompt injection, stale results, raw research persistence, and silent agent decisions.
3. **Requirements and validated map-first workspace** — define WorkspaceManifest, approved components, permanent map, optional surface gating, and challenge-and-commit mutations.
   - Addresses: adaptive workspace and traveler control.
   - Avoids: empty speculative surfaces and executable generated UI.
4. **Provider-backed search and comparison** — add one functional provider mode at a time with normalized results, estimated totals, explicit refresh, retry, comparison, and final recheck.
   - Addresses: core travel research table stakes.
   - Avoids: false aggregation, stale price, fabricated fallback, and provider-specific leakage.
5. **Planning Canvas and saved choices** — connect selected options, Map Pins, Custom Map Pins, list/map views, replacement confirmation, and reconnect behavior.
   - Addresses: editable planning value.
   - Avoids: confusing transient results with durable Plan data.
6. **Verified supplier handoff and release security** — implement recheck, changed-term acceptance, verified destination host, same-tab navigation, unknown booking status, and security review.
   - Addresses: complete MVP journey without owning checkout.
   - Avoids: open redirects and implied bookings.

**Phase ordering rationale:** every later flow depends on authenticated ownership, durable revisions, and explicit mutation contracts; provider search depends on destination/workspace context; supplier handoff depends on saved provider-backed options and verified rechecks.

## Confidence Assessment

| Area | Confidence | Notes |
|---|---|---|
| Stack | MEDIUM-HIGH | Accepted choices have strong official documentation; database/compute/provider choices remain open. |
| Features | MEDIUM | Domain table stakes are stable, but provider and market behavior varies. |
| Architecture | HIGH | Service/data ownership is explicit in repository contracts and supported by protocol guidance. |
| Pitfalls | HIGH | Security, stale inventory, authorization, and mutation-control risks are directly evidenced by accepted stories and official guidance. |

## Gaps to Address

- Exact database and checkpoint backing store, retention, and purge mechanics.
- Final AG-UI event schemas and validated generative-UI component catalog.
- Provider access, terms, coverage, normalization, attribution, and freshness semantics.
- AWS compute/networking/observability topology and deployment automation.
- Wireframes and usability validation for chat, search, Canvas, confirmation, and handoff.
- Concrete evaluation and monitoring strategy for recommendation quality, source grounding, stale-result prevention, and traveler-control violations.

## Sources

- Repository source-of-truth: `CONTEXT.md`, `docs/overview.md`, `docs/planning/`, `docs/adr/`, `docs/user-stories/`
- https://docs.aws.amazon.com/cognito/latest/developerguide/amazon-cognito-user-pools-using-the-access-token.html
- https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-settings-mfa.html
- https://docs.aws.amazon.com/cognito/latest/developerguide/managing-security.html
- https://ag-ui.ai/en/technologies/ag-ui
- https://github.com/ag-ui-protocol/ag-ui
- https://langchain-ai.github.io/langgraph/concepts/breakpoints/
- https://langchain-ai.github.io/langgraphjs/how-tos/cross-thread-persistence-functional/
- https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/docs/specification/2025-06-18/basic/authorization.mdx
