---
status: complete
---
# Separate preview stack ready

Started current application source 74df777 in Compose project `travella-research-preview`, app container `travella-research-preview-app-1`.

- Frontend/origin: http://localhost:5175
- Auth port: 8004; agent port: 8104.
- Fresh project-scoped PostgreSQL, research evidence and flight-checkout volumes; existing volumes untouched.
- Existing `travella-local-single` on 5174 remained healthy with uninterrupted uptime.
- Existing Cognito precheck passed. Launcher build/start and health passed. Example-account sign-in → session check → sign-out passed without exposing credentials.
- SHA-256 comparisons matched Research flight backend, Research chat component and A2UI preview source against the new running container.
- No application source changed. Model/provider search was not rerun for this startup-only task; the same source's previous verification remains recorded in quick 261016-l5g.

Start/rebuild command:

```bash
COMPOSE_PROJECT_NAME=travella-research-preview TRAVELLA_FRONTEND_PORT=5175 TRAVELLA_AUTH_PORT=8004 TRAVELLA_AGENT_PORT=8104 FRONTEND_ORIGIN=http://localhost:5175 TRAVELLA_LOCAL_ORIGIN=http://localhost:5175 bash scripts/start-local-ready.sh
```
