---
quick_id: 261002-ryd
status: in-progress
---

# Bundle Travella frontend, auth gateway, CRUD API, and agent into one local app container

## Goal

Provide a one-command local Docker setup that runs the frontend, auth gateway, CRUD API, and agent in one app container, with PostgreSQL remaining a separate persistent service.

## Tasks

### 1. Add a local all-in-one app image and compose path

- Add a multi-stage Dockerfile that combines the existing locked Python environment and frontend dependencies without copying `.env` or credentials into the image.
- Add an entrypoint that applies CRUD migrations and runs CRUD, agent, auth, and Vite as supervised child processes using loopback service URLs.
- Add a local Compose file with one app service plus the existing PostgreSQL service and named data volume.
- Route `scripts/start-local.sh` through this setup and document URLs, port overrides, and shutdown.

### 2. Validate the container and user-facing flow

- Run Compose configuration validation and build the image.
- Start the app on free host ports without stopping existing containers; verify the service health endpoints and frontend proxy.
- Exercise the frontend in Chrome, inspect relevant console/network behavior, and save an implementation screenshot plus a verification record.
- Run focused existing frontend and service tests and record their results.

## Verification

- `docker-compose -f compose.local-single.yaml config --quiet`
- Build and start the local single-container Compose stack.
- Confirm `/health` for auth and agent, `/ready` for CRUD, and the Vite root response.
- `npm test --prefix frontend`
- `uv run --locked pytest -q services/auth/tests services/agent/tests services/crud/tests`

## Done When

- The launcher starts one application container and one PostgreSQL container.
- All four app processes become healthy and the frontend reaches the auth gateway through its Vite proxy.
- Existing independent service images and the standard compose file remain available.
- Verification evidence records passed, skipped, and blocked checks accurately.
