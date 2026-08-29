# Separate agent, data, and connector services

Travella will use independently deployed frontend, agent, CRUD-backend, and connector/MCP services in one initial AWS environment. The frontend calls the agent and CRUD services separately; the CRUD backend owns durable traveler data, while the connector service is private and is the only layer that calls external providers. This preserves clear ownership, keeps supplier credentials off the client, and allows provider workloads to scale independently when needed.

## Consequences

- The agent service accesses durable plan and conversation data through the CRUD backend's API rather than a shared database.
- The same managed-identity access token is validated by both public backend services.
- A public API gateway remains an option for a later operational simplification, not an MVP requirement.
