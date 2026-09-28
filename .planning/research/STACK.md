# Technology Stack

**Project:** Travella
**Researched:** 2026-09-26
**Overall confidence:** MEDIUM-HIGH

## Accepted foundations

These are product decisions from the repository and are not reopened by ecosystem research:

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

1. Define token and service authorization contracts before implementing agent or connector tools.
2. Define the allow-listed AG-UI event/component schemas before generative UI work.
3. Select the CRUD database only after lifecycle, revision, idempotency, and deletion/recovery requirements are modeled.
4. Build provider-neutral connector interfaces so Skyscanner/Maps candidates remain replaceable until access is confirmed.

## Sources

- https://docs.aws.amazon.com/cognito/latest/developerguide/amazon-cognito-user-pools-using-the-access-token.html
- https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-settings-mfa.html
- https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-how-to-authenticate.html
- https://ag-ui.ai/en/technologies/ag-ui
- https://github.com/ag-ui-protocol/ag-ui
- https://langchain-ai.github.io/langgraph/concepts/breakpoints/
- https://langchain-ai.github.io/langgraphjs/how-tos/cross-thread-persistence-functional/
- https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/docs/specification/2025-06-18/basic/authorization.mdx
