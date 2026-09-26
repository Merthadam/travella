# Architecture Patterns

**Domain:** Conversational travel research and planning
**Researched:** 2026-09-26
**Overall confidence:** HIGH for boundaries; MEDIUM for open infrastructure choices

## Recommended architecture

```text
Browser frontend
  ├─ Cognito user-pool authentication
  ├─ AG-UI stream ↔ Agent service
  └─ HTTPS CRUD API

Agent service
  ├─ Plan-scoped LangGraph flow + durable checkpointer
  ├─ CRUD API (durable Plan authority)
  └─ private Connector/MCP API

Connector service
  ├─ provider capability registry
  ├─ request validation, credentials, rate limits, normalization
  └─ external travel/map/place providers
```

The repository's service ownership and trust boundaries are accepted architecture, not research proposals.

## Component boundaries

| Component | Responsibility | Must not own |
|---|---|---|
| Browser | Render authorized projections, collect explicit actions, maintain transient map/query state | Traveler identity authority, provider credentials, durable mutation authority |
| Cognito | Account identity, authentication challenges, tokens, MFA, recovery | Travella Plans or Conversations |
| Agent service | Conversation orchestration, research runs, evidence synthesis, checkpoint coordination, AG-UI events | Durable Plan writes outside CRUD, provider secrets, unvalidated UI |
| CRUD backend | Durable Plans, Conversations, Briefs, Requirements, Options, Pins, handoffs, revisions, deletion/recovery | Model reasoning, provider calls, browser-authored identity |
| Connector/MCP | Provider calls, credentials, normalization, capability health, verified handoff URLs | Browser sessions, Plan ownership, direct Plan mutations |
| Checkpointer/memory | Plan-scoped resumable graph state and bounded traveler-scoped advisory memory | Source of truth for current Plan decisions |

## Data and event flow

1. Browser authenticates with Cognito; each public service independently validates the access token.
2. Browser opens a Plan; CRUD returns an authorized projection and the Agent service creates or resumes one Plan-scoped graph session.
3. Browser actions become typed, server-validated AG-UI inputs with server-owned traveler/Plan/session IDs and idempotency keys.
4. Agent reads/writes durable Plan data only through CRUD; tentative research and candidate state remain checkpointed and compact.
5. Agent calls private Connector tools for provider/search operations; raw provider content stays transient and is normalized before synthesis.
6. Agent emits only allow-listed AG-UI events: progress, messages, validated choices, complete shortlist, workspace manifest, search results, and confirmation prompts.
7. CRUD applies only exact, single-use confirmation challenges bound to traveler, Plan, revision, and change digest.
8. Reconnect loads the latest matched CRUD/checkpoint snapshot; it does not replay arbitrary browser history or expose partial work.

## Build order implications

1. Define identity, service authorization, resource ownership, and problem envelopes.
2. Define Plan lifecycle, revisions, idempotency, deletion/recovery, and CRUD projections.
3. Define Conversation/Brief/Requirements contracts and the first WorkspaceManifest.
4. Implement the map-first Canvas with static/validated components and explicit mutation confirmation.
5. Implement LangGraph session/checkpoint/reconnect/interruption behavior with AG-UI event schemas.
6. Add provider-neutral Connector interfaces and one functional mode at a time; add recheck/error semantics before broad provider coverage.
7. Add candidate evidence/source inspection and destination discovery on top of the stable graph and data contracts.
8. Add verified supplier handoff only after saved-option, recheck, redirect-domain, and audit contracts exist.
9. Run security review and end-to-end recovery tests before public deployment.

## Patterns to follow

### Challenge-and-commit mutation

Prepare an exact normalized change, display it, issue a short-lived single-use token, then have CRUD verify the token, digest, revision, and traveler/Plan binding. Never accept an edited snapshot from the browser at commit time.

### Snapshot-first recovery

Checkpoint only normalized, versioned state. Mark a checkpoint saved only when its digest matches the CRUD revision. Restore the latest complete snapshot rather than replaying historical events.

### Allow-listed UI projection

Treat AG-UI events and generative UI payloads as untrusted data. Validate shape, component type, fields, and allowed actions at the Agent boundary and again at the browser boundary.

### Provider capability gating

Expose a mode only when its capability registry says the provider is functional and the required inputs are present. Preserve prior complete results during refresh and never fabricate a fallback.

## Anti-patterns to avoid

- Shared database access from Agent or Connector services.
- Browser-supplied traveler IDs, Plan ownership, provider option identity, or redirect URLs.
- Treating checkpoint memory, caches, raw provider responses, or UI state as authoritative Plan data.
- Replaying all chat/events to rebuild current state after reconnect.
- Passing raw external content as instructions to the model or exposing it directly to the browser.
- Letting a model emit executable UI or directly invoke durable mutations.

## Sources

- `docs/overview.md`
- `docs/planning/architecture-foundations.md`
- `docs/planning/mvp-phase-1-service-contracts.md`
- https://langchain-ai.github.io/langgraph/concepts/breakpoints/
- https://langchain-ai.github.io/langgraphjs/how-tos/cross-thread-persistence-functional/
- https://ag-ui.ai/en/technologies/ag-ui
- https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/docs/specification/2025-06-18/basic/authorization.mdx
