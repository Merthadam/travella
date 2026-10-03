# Agent connection verification

## Outcome

The current checkout now has a frontend-to-agent path in source. The Copilot drawer loads persisted plan messages and submits plan-scoped events. The browser calls the same-origin auth service with its HttpOnly session cookie; auth forwards its encrypted, server-held access token to the agent service. The browser never receives that token.

The live stack was not running this checkout, so a real browser turn against Bedrock/AgentCore remains unverified.

## Automated checks

- `uv run --locked pytest -q services/auth/tests services/agent/tests services/crud/tests` — **127 passed, 4 skipped**. Covers the auth-to-agent proxy, server-token forwarding, safe scope errors, agent API behavior, and conversation-history retrieval through the auth-to-CRUD client. The CRUD tests use the actual FastAPI handlers and isolated SQLite persistence.
- `npm test --prefix frontend` — **17 passed**. Covers same-origin agent request construction with no browser bearer token, drawer history, send/response rendering, candidate display, loading, and history errors.
- `npm run build --prefix frontend` — **passed**.
- `uv run --locked ruff check services/auth services/agent` — **passed**.
- `uv run --locked ruff format --check` on the six changed auth files — **passed**.
- `git diff --check` — **passed**.
- Ruby YAML parser on `compose.yaml` — **passed**. `docker compose config` could not run because the installed Docker CLI has no Compose plugin.

## Chrome DevTools checks

- Signed in with the supplied example account on the existing `localhost:5173` app.
- Opened this checkout's Vite UI at `localhost:5174`. `/auth/session` returned **200**, but `GET /v1/plans?view=active` returned **404** (`Not Found`). The current UI consequently shows “Please try again” and has no plan from which to open Copilot. The app at `localhost:5173` still displays the older “Plan management is coming in the next phase” page.
- Opened the actual `ConversationDrawer` component in a temporary review page using deterministic in-memory API test doubles. Loaded sample history, entered a request, clicked Send in Chrome DevTools, and saw the returned response and destination card. This also confirmed the swipe handler no longer captures pointer events from interactive controls. This verifies browser rendering and interaction only; it did not call the agent service.
- At a 1200px desktop viewport, the drawer measured 420px. At a 390px mobile viewport, it measured 358px and the document remained 390px wide with no horizontal overflow. The message area scrolls independently from the composer.
- The legacy app's plan-list 404 is the only console/network failure observed for the application route. The component review page had no relevant console errors.

## Evidence

- [Copilot design sketch](plan/copilot-drawer-plan.png) and [sketch source](plan/copilot-drawer-plan.html). This records the intended layout; it is not a pre-change production screenshot.
- [Component browser preview (desktop)](implementation/copilot-component-preview.png) and [mobile](implementation/copilot-component-mobile.png). These use deterministic test doubles.
- [Current runtime blocker screenshot](implementation/current-runtime-plan-list.png).
- [Acceptance criteria and runtime target](plan/acceptance.md).

## Remaining runtime gate

Run this checkout's updated auth, CRUD, and agent services together, then repeat the authenticated browser journey against an existing test plan and confirm that the agent token has the `travella/agent` scope and the Bedrock/AgentCore configuration accepts the call. Those checks were not possible against the older service currently exposed through the local ports.
