# Architecture foundations

This is the current planning baseline for Travella. It records user decisions from the system-design interview, distinguishes them from open questions, and intentionally does not prescribe implementation code or cloud products.

## MVP outcome and boundary

Travella helps an authenticated traveler research a holiday conversationally, refine results in the UI, save a plan, and maintain an editable planning canvas.

The initial external-booking boundary is a **supplier redirect**. Travella must not call a redirect a completed booking or promise tickets until a supplier supplies verified confirmation.

The MVP excludes agentic onboarding. Flights and car rental are intended search capabilities, but their UI remains hidden until both a real provider integration is functional and confirmed traveler needs make the surface relevant. Demonstration-only data must be labeled honestly if it is ever shown.

## Traveler and plan lifecycle

- A traveler signs in before beginning a persisted planning session.
- A conversation is associated one-to-one with a plan.
- Plans may be drafts. A deleted draft is recoverable for seven days, then its identifiable plan and conversation data is permanently removed.
- Two-step verification is available through the managed identity system, using authenticator-app codes.

## Planning canvas

The initial canvas is a one-destination/city map, not a route-optimization surface. Once a requirements-confirmed Plan opens its workspace, the map is permanent. Flight, accommodation, and car-rental surfaces are optional: the frontend renders them only from a validated workspace projection when the traveler has confirmed the corresponding need and required inputs and a functional provider capability exists.

Selected items appear as category-specific map pins:

- stay or apartment
- airport
- car rental
- restaurant
- activity

Pins do not require day or time assignment in the MVP. Airport and car-rental pins appear only once the traveler selects a specific option. The exact interaction for adding an agent recommendation to a plan is intentionally deferred to wireframe testing.

## Service tree

```text
Browser frontend
  ├─ AG-UI → Agent service
  └─ HTTPS API → CRUD backend

Agent service
  ├─ HTTPS API → CRUD backend
  └─ private API/MCP → Connector service

Connector service
  └─ external provider APIs → travel, map, and place providers
```

### Frontend

Renders the chat, planning canvas, ordinary plan-management screens, and validated generative UI. It calls the agent service and CRUD backend as separate public services.

### Agent service

Owns conversational orchestration and communicates with the frontend using AG-UI. It does not own durable traveler data and obtains it through the CRUD backend.

### CRUD backend

Is the sole owner of durable users, plans, conversations, pins, selected options, and deletion/recovery state. It enforces authorization for these resources.

### Connector/MCP service

Is a separately deployed, private service for provider calls. It owns provider-specific requests, credentials, request validation, rate limiting, and provider-response normalization. The browser never calls it directly.

## Identity and service trust

- The browser authenticates directly with the managed identity provider over HTTPS/TLS. Passwords, verification codes, and two-step-verification codes never reach Travella services.
- The frontend presents the same managed-identity access token to both public backend services.
- Each public backend service independently validates the token and applies its own authorization rules.
- The connector service is reachable only from Travella services inside the private network.

## Agent and UI protocols

AG-UI is the selected agent-to-frontend interaction protocol for streamed messages, tool activity, and state updates.

The exact validated generative-UI format remains open. A2UI-style declarative schemas are the leading candidate because they allow the frontend to render an approved component catalog without executing generated code. CopilotKit MCP Apps remain an alternative for later, isolated external applets rather than a settled MVP dependency.

## Provider status

Skyscanner is a candidate flight provider, but access is pending and is not a committed dependency. The connector API tree must be provider-neutral until access and integration scope are confirmed.

Google Maps/Places is the intended map and place-search capability. It is a candidate integration, not yet an implementation commitment.

## Security gates

1. Review the architecture and API tree before implementation.
2. Review authentication, authorization, supplier credentials, prompt/tool injection, schema validation, redirects, and deletion behavior before public deployment.

## Open decisions

- Database and data-model technology, including whether any NoSQL store is warranted.
- Exact provider set and supplier-access terms.
- Final validated generative-UI format and component catalog.
- Whether agent recommendations can add items automatically or always require an explicit traveler action.
- Exact frontend layout and wireframes for chat, map, search results, and selection.
- AWS compute, networking, database, observability, and deployment choices.

## Planning sequence

1. Convert this foundation into a provider-neutral API tree and event/data contract.
2. Produce low-fidelity wireframes for login, chat/search, result selection, map canvas, and supplier redirect.
3. Define the data model and deletion/recovery behavior from the accepted interaction flows.
4. Produce an AWS infrastructure diagram and deployment plan without prematurely choosing compute or database products.
5. Run the first security review before implementation.
