# Quick Task 261002-ryd: Bundle Travella frontend, auth gateway, CRUD API, and agent into one local app container - Context

**Gathered:** 2026-10-02
**Status:** Ready for planning

<domain>
## Task Boundary

Run the frontend, auth gateway, CRUD API, and agent as processes inside one local development container, while keeping PostgreSQL in its own persistent container.

</domain>

<decisions>
## Implementation Decisions

### Container boundary
- Put the frontend, auth, CRUD, and agent processes in one app container.
- Keep PostgreSQL separate so its named data volume survives app rebuilds and restarts.

### Local development behavior
- Provide this as the local startup path while retaining the existing separately deployable service images and Compose setup.
- Run the existing Vite development server inside the app container so current frontend development behavior is preserved.
- Keep credentials out of the image; pass configured environment values through Compose at runtime.

### the agent's Discretion
- Process supervision, internal service URLs, port overrides, health checks, and documentation details.

</decisions>

<specifics>
## Specific Ideas

One container for all application services, with PostgreSQL still separate and durable.

</specifics>

<canonical_refs>
## Canonical References

- `AGENTS.md` — project architecture, local GSD workflow, and testing requirements.
- `compose.yaml` — existing service configuration and environment contract.
- `docs/skills/travella-testing/SKILL.md` — frontend/backend verification and evidence requirements.

</canonical_refs>
