# Phase 03B plan 10 execution checkpoint

Status: **partial / executing**. Plan 10 and Phase 03B are not complete.

## Implemented

- The Claude model adapter uses `AsyncAnthropicBedrock` with the global Claude Sonnet 4.5 inference-profile ID, region/model environment settings, and the server-only `AWS_BEARER_TOKEN_BEDROCK` or AWS credential chain.
- Conversation routing now parses the versioned prompt's JSON decision instead of inferring research from keywords. Plan context is serialized as JSON.
- The LangGraph adapter calls the allowlisted AgentCore Gateway through the MCP client and forwards the verified Cognito bearer token and Plan-scoped arguments. It no longer sends Anthropic-hosted `mcp_servers`/`mcp_toolset` fields.
- Gateway calls fail closed when the verified token or Gateway URL is missing; traveler IDs are never substituted as bearer tokens.
- Local Compose now defines an `agent` service on port 8002 and passes Bedrock variables only into that service. The health route reports model provider/profile and whether a Gateway URL is configured, without exposing credentials.
- Phase 03B context, research, and plan 10 record the Bedrock and Gateway decisions.

## Verification

- `uv run pytest -q services/agent/tests/test_agent_turn.py services/agent/tests/test_agent_api.py services/mcps/tests/test_transport.py` — 18 passed.
- Ruff and `git diff --check` passed.
- `docker compose` validation could not run because this environment's Docker CLI has no Compose plugin (`docker compose` is unavailable).
- One CLI Converse call initially returned text. Subsequent CLI and SDK calls returned `404 Model use case details have not been submitted`; live model access is therefore unverified and currently blocked on Anthropic's first-time-use form.
- `bedrock-agentcore-control list-gateways` returned no gateways in Stockholm, Frankfurt, or Ireland. Live MCP calls are blocked until a Gateway and targets exist.

## Remaining before plan completion

1. Submit the Anthropic first-time-use form for the AWS account, then repeat the live SDK call.
2. Provision the AgentCore Gateway and its targets, then complete the authenticated live `tools/call` flow.
3. Replace and integration-test the Gateway ownership callback with the authenticated CRUD Plan ownership check specified in task 1.
4. Finish cited candidate synthesis and source-inspection checks from task 2.

Do not write a plan 10 SUMMARY or mark the plan complete until these criteria pass.
