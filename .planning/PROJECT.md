# Travella

## What This Is

Travella is an authenticated, conversational travel-research and planning product for travelers shaping a holiday around one destination or city. It combines an agent-guided Conversation with an editable, map-first Planning Canvas so a traveler can research, compare, and deliberately save useful options before continuing to an external supplier to complete any booking.

The initial project covers the full documented MVP: private account access, Draft Plan lifecycle and recovery, destination discovery, traveler-confirmed Planning Requirements, a generated workspace, provider-backed search and comparison, saved options and map pins, and a safe supplier handoff. Travella remains a planning product in this MVP; a supplier redirect is never presented as a Travella booking or booking confirmation.

## Core Value

A traveler can move from a holiday idea to a trustworthy, editable single-destination Plan while remaining in explicit control of every consequential choice.

## Business Context

- **Customer**: Travelers researching and organizing a personal holiday
- **Revenue model**: Not yet decided; the MVP must not depend on an unconfirmed commercial arrangement
- **Success metric**: A traveler can create, resume, and meaningfully develop a Plan through saved choices and a safe supplier handoff
- **Strategy notes**: `docs/overview.md` and the accepted user stories under `docs/user-stories/` are the current product source of truth

## Requirements

### Validated

- ✓ Selected-C account settings with reusable preference edits, light/dark mode, canonical identity and guarded security flows — Phase 13; API/SQL and Chrome verified. Live email activation remains unavailable.

### Active

- [ ] Travelers can securely register, verify, sign in, recover access, use optional two-step verification, refresh a session, and sign out without exposing private data.
- [ ] Travelers can create, resume, rename, delete, and restore multiple private Draft Plans, with one linked Conversation per Plan and a seven-day Recovery Period.
- [ ] A traveler can begin with a known destination or an open-ended intent and progressively shape an editable Planning Brief through one focused conversational decision at a time.
- [ ] Travella can research and compare destination candidates with compact evidence, visible uncertainty, interruptible work, and explicit traveler confirmation before any Plan mutation.
- [ ] Traveler-confirmed Planning Requirements compose a generated workspace containing the permanent map and only the relevant functional travel-planning surfaces.
- [ ] Travelers can search and compare provider-backed stays, return flights, and same-location car rentals using honest price, availability, provider, freshness, and failure states.
- [ ] Travelers can explicitly save, replace, edit, and remove Selected Options and categorized Map Pins on a map-first Planning Canvas without confusing transient results with saved Plan data.
- [ ] Eligible saved provider-backed options can initiate a verified external supplier handoff after a final recheck and explicit confirmation, without Travella inferring a booking outcome.
- [ ] Durable Plan data, agent state, provider access, browser projections, and authentication remain separated across the documented service boundaries and authorization model.
- [ ] Refresh, reconnect, retries, duplicate delivery, interruption, deletion, and restoration recover the latest consistent state without duplicating actions or presenting partial work as saved.

### Out of Scope

- Multi-destination Plans, routes, and day-by-day or time-assigned itineraries — the MVP centers each Plan on one destination or city.
- Autonomous Plan changes, automatic selection, autonomous booking, or automatic addition of recommendations — consequential choices require explicit traveler confirmation.
- In-app checkout, payment, passenger details, tickets, receipts, booking confirmation, cancellation, refunds, or booking-status tracking — suppliers own the transaction.
- Multi-provider aggregation, backup-provider failover, or fabricated provider availability — only functional integrations may be exposed.
- Social sign-in, phone-number collection, traveler-managed sign-out-everywhere, and support-led loss-of-all-factors recovery — deferred beyond the account MVP.
- Finalized/completed Plans, sharing, collaboration, duplication, or archival — active Plans remain Draft Plans until deleted in the MVP.
- Booking-email or document import and secure booking-document storage — requires a later consent, retention, and security design.
- Unbounded model-generated executable UI — agent-facing UI is restricted to validated schemas and an approved component catalog.

## Context

- Account, onboarding, Plans and conversational features are implemented locally; prior-phase acceptance debt remains documented. Phase 13 account settings passed independent verification.
- `CONTEXT.md` defines stable product terminology. `docs/overview.md`, `docs/planning/`, `docs/adr/`, and the accepted user stories under `docs/user-stories/` are the current source-of-truth documents.
- The documented browser experience includes ordinary plan-management screens, an AG-UI Conversation, and a map-first Planning Canvas with validated generative UI.
- The accepted service topology has four independently deployable responsibilities: browser frontend, Agent service, CRUD backend, and private Connector/MCP service.
- Amazon Cognito is the selected managed identity provider. AG-UI is the selected agent-to-frontend protocol. LangGraph is the intended orchestration model for one end-to-end Plan flow. Amazon Bedrock AgentCore Memory is the intended long-term-memory capability behind an abstraction.
- The CRUD backend is the sole durable-data owner for Plans, Conversations, Planning Brief data, Planning Requirements, Selected Options, Map Pins, handoff records, and deletion/recovery state.
- The Agent service owns conversational orchestration and Plan-scoped checkpoint state but accesses durable Plan data only through the CRUD API.
- The private Connector service owns provider credentials, requests, validation, normalization, rate limiting, and verified supplier handoff generation. The browser never calls it directly.
- Provider access and exact provider choices remain open. Skyscanner and Google Maps/Places are candidates, not committed dependencies.
- The exact database, checkpoint store, AWS compute/networking/observability choices, final validated generative-UI schema, and detailed wireframes remain open for later design phases.

## Constraints

- **Product authority**: Every destination, Planning Requirement, Selected Option, Map Pin, and other durable Plan change requires an explicit traveler action and exact confirmation — the agent cannot silently mutate a Plan.
- **Scope**: One destination or city per Plan, return flights only, and car rentals returned to the same location — keeps the first planning model coherent.
- **Provider honesty**: Unavailable provider modes remain hidden; stale, estimated, conflicting, or unavailable results must be labeled rather than invented or overstated.
- **Booking boundary**: Travella may redirect only from an eligible saved option to a server-generated URL on a verified provider host — it never claims a supplier transaction succeeded.
- **Data ownership**: The CRUD backend exclusively owns durable Plan data; the Agent and Connector services cannot bypass its authorization and revision contracts.
- **Privacy and security**: Tokens, credentials, verification codes, email addresses, raw provider payloads, and internal reasoning must not leak through URLs, logs, checkpoints, or browser projections.
- **Authorization**: Public services independently validate managed-identity tokens and authorize resources using token-derived traveler identity, never a browser-supplied user identifier.
- **Resilience**: User actions and events are idempotent; obsolete research cannot surface after interruption; only complete, consistent snapshots may be presented as saved.
- **Deletion**: Deleted Draft Plans and their scoped data are recoverable for seven days and then their identifiable Plan data must be permanently removed.
- **Architecture**: The frontend, Agent service, CRUD backend, and private Connector service begin as independent deployables in one AWS environment.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Keep account preferences on SQL for this delivery; plan DynamoDB next | Explicit user decision; preserve current API and revision protections | Phase 13 complete; follow-up captured |
| Treat the repository context documents as the current source of truth | They contain the accepted product language, stories, service boundaries, and explicit open decisions | — Pending |
| Scope the initial GSD project to the full documented MVP | The project should roadmap the complete traveler journey rather than only the current Phase 1 contract slice | — Pending |
| Keep the traveler in explicit control of every consequential Plan change | Travel decisions, provider activity, and saved data must not be silently changed by an agent | — Pending |
| Use one final destination or city per MVP Plan | A focused boundary keeps discovery, workspace composition, search, and map behavior tractable | — Pending |
| Make the map permanent and generate only validated optional planning surfaces | Demonstrates adaptive UI without allowing uncontrolled model-generated application code | — Pending |
| Separate Agent orchestration, durable data, and provider connectivity into distinct services | Isolates credentials and responsibilities while preserving clear authorization and data ownership | — Pending |
| Use external supplier redirect as the MVP booking boundary | Enables a complete planning journey without claiming transaction capabilities Travella does not own | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `$gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `$gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-10-06 after Phase 13 completion*
