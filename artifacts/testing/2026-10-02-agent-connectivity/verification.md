# Agent connectivity verification — 2026-10-02

## Result

The frontend reaches the Agent API and the Agent API authenticates the signed-in Cognito user. A live Claude reply is still blocked by AWS Bedrock Anthropic onboarding: the direct model request returns `FTUFormNotFilled`. The AWS account API reports the account state as `ACTIVE`; that does not confirm available credits or payment-plan limits. AgentCore Gateway is also not provisioned in `eu-north-1`, so the research/map tools are unavailable independently of the Claude form.

## Browser journey

- Opened the local Travella app, signed in with the configured local test account, opened the Copilot drawer, and sent a message.
- The browser POST to `/v1/agent/plans/{plan_id}/events` returned HTTP 200 after the agent scope was aligned with the Cognito access token.
- The drawer displayed the generic provider-unavailable state because the model invocation failed with `FTUFormNotFilled`.
- The Google map loaded and its relevant requests returned HTTP 200. The browser console showed Maps API deprecation/performance warnings, with no JavaScript errors related to the Agent request.
- Screenshot: [Copilot awaiting Bedrock Anthropic access](implementation/copilot-bedrock-access-required.jpg).

## AWS checks

- `aws account get-account-information --region eu-north-1 --query '{accountState:AccountState,accountStatus:AccountStatus}' --output json` returned `accountState: ACTIVE` and no account status value.
- A direct minimal Anthropic Messages SDK call through Bedrock in `eu-north-1` returned HTTP 404 `FTUFormNotFilled`, stating that Anthropic use-case details must be submitted before using the model.
- After the user submitted the Anthropic form, an immediate retry returned the same `FTUFormNotFilled` response, now explicitly instructing us to retry in 15 minutes. The form has not yet been verified as applied.
- The selected Claude model was listed as active in `eu-north-1` during the earlier connectivity check.
- `aws bedrock-agentcore-control list-gateways --region eu-north-1` returned an empty list. The Agent health endpoint reports `gateway_configured: false` and `memory_enabled: false`.
- The user confirmed this is a Paid account plan with credits. The direct model error therefore is not explained by the Free account plan; it specifically remains an Anthropic form propagation/access block.

## Automated checks

| Check | Result |
|---|---|
| `uv run --locked pytest -q services/agent/tests services/mcps/tests/test_gateway_provisioning.py services/mcps/tests/test_transport.py` | Passed: 32 tests |
| `docker-compose -p travella-local-single -f compose.local-single.yaml config --quiet` | Passed |
| `git diff --check` | Passed |
| `npm test -- --run` from `frontend/` | 16 passed, 1 failed: existing sign-in privacy test reads `localStorage.length`, but the jsdom environment does not expose that storage object under the current Node/Vitest setup. No product assertion or app code failure was reported. |
| `bash scripts/check.sh` | Failed at lint: 17 reported issues in `services/crud/repository.py`, which is unchanged by this connectivity fix. |

## Remaining steps

1. Retry the minimal Bedrock model call after AWS's stated 15-minute propagation window, then retry a Copilot message if the model call succeeds.
2. Provision and configure the private AgentCore Gateway and its research/map MCP targets before testing destination research tools.
3. Re-run the Copilot browser journey after Bedrock access is granted; the local agent is not verified end-to-end until it returns a model-generated response.
