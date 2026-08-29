# Travella overview

This is the current source-of-truth overview for Travella. It consolidates confirmed product and system decisions; unresolved items remain explicitly open.

## Product purpose

Travella is an authenticated, conversational travel-research and planning product with an editable map-based planning canvas.

For the MVP, a traveler can research a single destination or city, refine options with the agent and UI, save selections to a plan, and open an external supplier to complete booking. A supplier redirect is not a Travella booking confirmation and must not be presented as one.

## MVP traveler journey

1. The traveler creates an account or signs in before starting a saved session.
2. The traveler creates or resumes one draft plan for one destination/city.
3. The traveler works in one linked conversation for that plan and remains in control of choices.
4. Travella searches functional provider integrations for flights, accommodation, cars, and places; unavailable modes remain hidden.
5. The traveler refines results through the UI and selects options.
6. Selected stays/apartments, airports, car rentals, restaurants, and activities appear on the map with distinct category colours.
7. The traveler opens a supplier site to complete a booking externally.
8. The traveler can return to the saved plan later, or delete a draft and restore it within seven days.

## Current architecture

```text
Browser frontend
  ├─ managed identity provider: authentication
  ├─ AG-UI → Agent service
  └─ HTTPS API → CRUD backend

Agent service
  ├─ HTTPS API → CRUD backend
  └─ private API/MCP → Connector service

Connector service
  └─ external provider APIs
```

- The frontend, agent service, CRUD backend, and connector/MCP service are independent deployables in one initial AWS environment.
- The CRUD backend is the sole durable-data owner for plans, conversations, pins, selected options, and deletion/recovery state.
- The agent service orchestrates conversations through AG-UI and uses the CRUD API rather than a shared data store.
- The connector/MCP service is private; it owns provider credentials, normalization, request validation, and rate limiting. The browser never calls it directly.
- The browser authenticates directly with a managed identity provider. Travella services receive and validate access tokens; passwords and two-step codes never enter Travella services.

## Confirmed security rules

- HTTPS/TLS protects all browser and service calls.
- Tokens, passwords, verification codes, email addresses, and other credentials are never put in URLs or logs.
- Each public Travella service validates tokens and authorizes access using the traveler identity in the token, never a browser-supplied user identifier.
- Supplier credentials remain server-side in the private connector service.

## Current documentation

- [Domain glossary](../CONTEXT.md)
- [Architecture foundations](planning/architecture-foundations.md)
- [Service-boundary ADR](adr/0001-separate-agent-data-and-connector-services.md)
- [Login user story](user-stories/login/README.md)
- [Login use-case diagram](user-stories/login/login-use-case.drawio)
- [Login API sequence diagram](user-stories/login/login-api-sequence.drawio)

## Deliberately open

- Identity-provider product and its exact authentication endpoint formats.
- Database technology and detailed data model.
- Provider set and supplier access, including Skyscanner availability.
- Final validated generative-UI format and component catalog; A2UI remains a candidate, not a decision.
- Exact chat/search/map wireframes and the rule for automatic versus explicit addition to a plan.
- AWS compute, networking, database, observability, and deployment choices.
- Whether and when a BFF/API gateway should be introduced; it is not required for the MVP.
