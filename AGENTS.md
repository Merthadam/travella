# Travella agent rules

For every frontend change, frontend planning/design session, or backend CRUD change, **read and follow [the mandatory planning and testing skill](docs/skills/travella-testing/SKILL.md)** before starting work and before reporting completion. This includes the frontend planning prototype offer. Its applicable verification and evidence requirements are delivery gates.

<!-- GSD:project-start source:PROJECT.md -->

## Project

**Travella**

Travella is an authenticated, conversational travel-research and planning product for travelers shaping a holiday around one destination or city. It combines an agent-guided Conversation with an editable, map-first Planning Canvas so a traveler can research, compare, and deliberately save useful options before continuing to an external supplier to complete any booking.

The initial project covers the full documented MVP: private account access, Draft Plan lifecycle and recovery, destination discovery, traveler-confirmed Planning Requirements, a generated workspace, provider-backed search and comparison, saved options and map pins, and a safe supplier handoff. Travella remains a planning product in this MVP; a supplier redirect is never presented as a Travella booking or booking confirmation.

**Core Value:** A traveler can move from a holiday idea to a trustworthy, editable single-destination Plan while remaining in explicit control of every consequential choice.

### Constraints

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

<!-- GSD:project-end -->

<!-- GSD:stack-start source:research/STACK.md -->

## Technology Stack

## Accepted foundations

- Amazon Cognito user pools for Travella-owned registration, verification, password recovery, JWT access tokens, and optional authenticator-app MFA.
- AG-UI as the agent-to-frontend event boundary.
- LangGraph as the single end-to-end, Plan-scoped orchestration graph.
- Separate browser frontend, Agent service, CRUD backend, and private Connector/MCP service.
- AWS as the initial deployment environment.

## Recommended Stack

### Identity and authorization

| Technology | Purpose | Why |
|---|---|---|
| Amazon Cognito User Pools | Authentication, email verification, access/refresh tokens, TOTP MFA | Cognito issues JWT access tokens for API authorization and supports software-token MFA. Public services must independently verify issuer, signature, audience/client, token use, expiry, and scopes. |
| OIDC/JWT verification middleware | Token validation at each public service | Cognito access and ID tokens use distinct signing keys; services must not trust unverified claims. |

### Agent runtime and interaction

| Technology | Purpose | Why |
|---|---|---|
| LangGraph (Python or TypeScript, choose one per service) | One inspectable Plan-scoped graph | Checkpointers support interrupt/resume and thread-scoped state; stores support cross-thread long-term memory. Use a durable checkpointer in production. |
| AG-UI SDK/core | Ordered agent/frontend events, state, tools, interrupts | AG-UI is an event-based interaction boundary, not a UI component library. Keep an allow-listed projection between graph state and browser events. |
| Validated schema layer (JSON Schema/Pydantic or TypeScript equivalent) | Validate AG-UI payloads and generative UI proposals | The browser renders only approved component types; generated executable code is not accepted. |
| MCP over private service transport | Agent-to-Connector tool boundary | MCP is appropriate for tools/data, but private deployment, audience-bound authorization, and server-side credential handling are mandatory. |

### Durable data and state

| Technology | Purpose | Recommendation |
|---|---|---|
| CRUD API with a transactional durable store | Plans, Conversations, Briefs, Requirements, Options, Pins, handoffs, lifecycle state | Keep database choice open for a dedicated data-model phase. Select a store that supports revision checks, idempotency, seven-day recovery, and atomic Plan mutations. |
| LangGraph durable checkpointer | Plan-scoped agent state and human-in-the-loop interruptions | Keep checkpoint state separate from CRUD ownership and reconcile with CRUD revision/snapshot before exposing it. |
| Long-term memory adapter | Traveler-scoped advisory memory | Keep the AgentCore Memory choice behind an interface; memory never outranks current Plan or traveler instruction. |

### Infrastructure

| Technology | Purpose | Recommendation |
|---|---|---|
| AWS managed container/serverless primitives | Independent deployables | Choose compute/networking only after API, event, data, and security contracts are fixed. |
| AWS secrets/KMS/observability services | Provider credentials, encryption, operational traces | Connector credentials stay private; logs exclude raw conversation, provider payloads, credentials, and personal data by default. |
| Private network controls and service identity | Connector isolation | Browser never calls Connector; Agent calls it through authenticated service-to-service access. |

## Alternatives considered

| Category | Recommended | Alternative | Why not for initial MVP |
|---|---|---|---|
| Agent/UI boundary | AG-UI | Provider-specific UI SDK | Locks the frontend to one agent vendor and weakens the accepted protocol decision. |
| Tool boundary | Private MCP/typed connector API | Browser-to-provider calls | Leaks credentials, bypasses normalization and rate limits, and breaks the documented trust boundary. |
| Agent state | LangGraph checkpointer + CRUD reconciliation | Browser-only state or chat replay | Cannot safely resume, interrupt, or guarantee consistent Plan state. |
| Authentication | Cognito User Pools | Hand-rolled passwords/sessions | Violates the accepted managed-identity boundary and increases credential risk. |
| Provider strategy | One functional provider per mode initially | Multi-provider aggregation | Creates false comparability and multiplies access, attribution, and freshness complexity. |

## Research implications

## Sources

- https://docs.aws.amazon.com/cognito/latest/developerguide/amazon-cognito-user-pools-using-the-access-token.html
- https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-settings-mfa.html
- https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-how-to-authenticate.html
- https://ag-ui.ai/en/technologies/ag-ui
- https://github.com/ag-ui-protocol/ag-ui
- https://langchain-ai.github.io/langgraph/concepts/breakpoints/
- https://langchain-ai.github.io/langgraphjs/how-tos/cross-thread-persistence-functional/
- https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/docs/specification/2025-06-18/basic/authorization.mdx

<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->

## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->

## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->

## Project Skills

- `.agents/skills/travella-local/SKILL.md` — start the local Docker stack and verify example-account authentication.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->

## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:

- `$gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `$gsd-debug` for investigation and bug fixing
- `$gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->

## Developer Profile

> Profile not yet configured. Run `$gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
