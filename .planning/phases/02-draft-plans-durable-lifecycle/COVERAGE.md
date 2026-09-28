# API Coverage — Identity and CRUD Boundary

> Full coverage by default. Opt-outs are explicit and scoped to later phases.

| capability | decision | reason |
|---|---|---|
| Cognito JWT issuer/signature/JWKS validation | INTEGRATE | Required for independent public-service authorization. |
| Cognito audience/client and token-use validation | INTEGRATE | Required to distinguish access tokens from ID tokens and reject wrong clients. |
| Cognito expiry/scope validation | INTEGRATE | Required before any private Plan projection or mutation. |
| CRUD Plan list/open/create/activity/title/delete/restore operations | INTEGRATE | Phase 2 lifecycle contract. |
| PostgreSQL transaction and migration API | INTEGRATE | CRUD durable-data ownership and atomic lifecycle transitions. |
| Agent/provider/MCP API calls | OPT-OUT | No agent orchestration, destination/provider search, Connector, or supplier handoff is implemented in Phase 2. |
| Cognito registration/verification/password/MFA operations | OPT-OUT | Account flows are Phase 1 responsibilities; Phase 2 consumes the existing authenticated session boundary. |
