# First-login onboarding verification

## Implementation summary

- Successful session establishment is followed by a profile read. Travelers with no completed profile see the selected lightweight intake; completed profiles open Plans.
- The browser sends bounded chat history to an authenticated onboarding endpoint. The endpoint invokes the isolated, one-node LangGraph intake graph. The graph does not read profiles, save, search, call tools, or create Plans.
- The graph validates candidate values against the latest user message and discards obvious street-address candidates. The API returns only candidate topic/value; source quotes remain internal to extraction validation.
- The traveler reviews and may edit candidate details before an explicit save. Skip saves an empty, completed profile so the traveler is not repeatedly prompted.
- The CRUD profile is the durable source of truth, keyed by token-derived traveler subject. It supports a departure city/airport, citizenships, food/allergy needs, accessibility needs, and interests. There is no exact-address field.
- AgentCore Memory remains disabled and is not used as canonical profile storage.

## Automated verification

- `uv run --locked pytest -q services/crud/tests/test_api.py services/crud/tests/test_migrations.py services/auth/tests/test_api.py services/agent/tests/test_agent_api.py services/agent/tests/test_onboarding_intake.py` — **77 passed, 1 skipped**. Coverage includes durable create/read/update through CRUD HTTP handlers, ownership isolation, unknown-field/street-address rejection, auth BFF proxy headers, authenticated onboarding endpoint, candidate quote omission, skip/save UI behavior via React tests, and isolated node behavior. The skipped test needs a dedicated PostgreSQL `TEST_DATABASE_URL`.
- `uv run --locked ruff check <changed Python files>` — passed.
- `git diff --check` — passed.
- `npm test` — **26 passed**.
- `npm run build` — passed.

## Live browser gate: incomplete

The project requires authenticated Chrome DevTools inspection, console/network review, screenshots, and a reload check. The gate could not be completed:

1. `bash scripts/start-local-ready.sh` first found the missing ignored file `services/mcps/.env`; an empty local copy was created from `.env.example` (no credentials). Startup then built the services, but the app did not become healthy because the checkout has no `OPENAI_API_KEY` and no Cognito/session configuration (`COGNITO_USER_POOL_ID`, `COGNITO_APP_CLIENT_ID`, `COGNITO_ISSUER`, `COGNITO_JWKS_URL`, `SESSION_ENCRYPTION_KEY`). The readiness script did not attempt the example-user password.
2. Chrome DevTools `list_pages` reports its browser profile is already running and offers an isolated launch, but the available DevTools interface exposes no profile/user-data-dir launch option. No plan or implementation screenshots, console/network capture, or authenticated browser reload check were produced. Per the project testing skill, another browser tool is not a substitute.

The focused frontend tests exercise initial routing, conversational candidate review, explicit save, and skip; they do not satisfy the live-browser gate. The UI work is therefore **implemented but not fully browser-verified**.

## Remaining integration boundary

The saved profile is reusable durable account data, but this increment does not yet feed it into later Plan agent context or provider searches. That use should be wired outside the intake node in a follow-up. It also does not add a profile settings page for editing a completed profile.
