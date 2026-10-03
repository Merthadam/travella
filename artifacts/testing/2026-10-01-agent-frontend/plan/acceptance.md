# Copilot frontend integration

## User journey

Open a saved plan, open the right-side Copilot drawer, review prior messages, send a travel request, and see the agent response and any returned destination candidates.

## Observable acceptance criteria

- The drawer loads messages for the selected plan and shows an empty/loading/error state.
- Sending a non-empty message creates a plan-scoped agent event and renders the returned text and candidates.
- Browser requests use the existing same-origin session cookie. Cognito access tokens are never exposed to frontend JavaScript.
- The auth service validates the stored session and forwards only its server-held access token to the agent service.
- Agent and CRUD errors are sanitized before reaching the browser.

## Verification target

The local Chrome session used `travella.local@example.com`. The available `localhost:5173` runtime is an older deployment. The current checkout was opened separately on `localhost:5174`; its authenticated plan list request reached that same older auth service and returned HTTP 404. Browser verification of a real saved plan and live agent response is therefore blocked until this checkout's services are running together.
