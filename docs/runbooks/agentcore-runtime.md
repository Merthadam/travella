# AgentCore Runtime for Travella's LangGraph flow

## Architecture

In local Compose, the auth service continues to call the local Agent service. When `AGENTCORE_RUNTIME_ARN` is set, the auth service invokes AgentCore Runtime directly using the traveler Cognito access token. Runtime hosts the existing `services.agent.app:create_app` FastAPI app and its `AgentGraph`; it does not replace LangGraph.

The Runtime app independently validates the forwarded Cognito token, reads Plan context from CRUD, runs the existing graph, and calls the existing AgentCore Gateway tools. CRUD remains the authority for Plan and profile data. Profile memory remains advisory AgentCore Memory. The onboarding graph stays isolated from the Plan graph while being hosted by the same Runtime app.

## Runtime contract

The container uses AgentCore's `HTTP` server protocol. It listens on `0.0.0.0:8080`, implements `GET /ping`, and handles JSON `POST /invocations`. Invocation envelopes have an `operation` and a validated application payload. Supported operations are `turn`, `stream`, `onboarding`, `profile_sync`, and `cancel`.

`Authorization` must be included in the Runtime request-header allowlist. AgentCore validates the Cognito access token before dispatch and forwards the header; the Travella app verifies it again before authorizing Plan access or using traveler-scoped memory. The auth service calls Runtime over HTTPS because AgentCore's SDK invocation method does not support OAuth bearer authentication. The auth service uses the AWS SDK's SigV4 `StopRuntimeSession` operation for explicit cancellation, so its execution role needs `bedrock-agentcore:StopRuntimeSession` scoped to this Runtime. Runtime session identifiers are stable opaque hashes of the verified token subject and Plan scope; neither identity nor Plan IDs are sent as session headers.

## Build and publish the image

Build for ARM64 and push the image to ECR in the Runtime's AWS region:

```sh
docker buildx build --platform linux/arm64 \
  -f Dockerfile.agent-runtime \
  -t <account>.dkr.ecr.<region>.amazonaws.com/travella-agent-runtime:<tag> \
  --push .
```

Create the Runtime using the `HTTP` protocol and `CUSTOM_JWT` authorization. Configure its Cognito OIDC discovery URL, access-token client/scope restrictions, and `Authorization` request-header allowlist. Configure the Runtime execution role for ECR image access, outbound CRUD and Gateway access, the required AgentCore Memory operations, and `secretsmanager:GetSecretValue` for the Anthropic API key secret. Supply `CRUD_BASE_URL`, `COGNITO_*`, `AGENTCORE_GATEWAY_URL`, `AGENTCORE_MEMORY_ID`, `AGENT_MCP_TRANSPORT=agentcore`, `AGENT_MODEL_PROVIDER`, and model configuration to the Runtime environment.

The research stage defaults to `AGENT_RESEARCH_BACKEND=claude-agent-sdk`. Set `ANTHROPIC_API_KEY_SECRET_ARN` to the full ARN of a Secrets Manager secret. At startup, `ResearchWorkerConfig.from_env()` reads that exact secret in the ARN's region. It accepts a raw Anthropic key or a JSON object containing `ANTHROPIC_API_KEY` (including the shared development secret format). Explicit ARN configuration is authoritative: a denied, missing, or malformed secret produces a sanitized configuration failure, without falling back to a local key. The loaded value stays in process memory and the isolated SDK child's environment; it is not written to the image, graph state, health response, or logs. Restart after rotating the secret.

For the Runtime execution role, scope retrieval to the selected secret:

```json
{
  "Effect": "Allow",
  "Action": "secretsmanager:GetSecretValue",
  "Resource": "arn:aws:secretsmanager:<region>:<account>:secret:<name-and-suffix>"
}
```

A customer-managed KMS key also requires `kms:Decrypt` on that key. Local secret sync does not grant the Runtime role any access. Use a dedicated production secret to avoid granting access to unrelated development credentials.

Conversation and onboarding support `AGENT_MODEL_PROVIDER=anthropic`, `openai`, or `bedrock`. Local Compose defaults to `anthropic`, using the same Anthropic credential resolver and `ANTHROPIC_MODEL`; production should set its provider explicitly. The OpenAI adapter reads `OPENAI_API_KEY` directly from its server environment; **`OPENAI_API_KEY_SECRET_ARN` is not implemented**. Deployments using OpenAI must provide its key through their existing secure environment injection path, or select the existing Bedrock provider with IAM credentials. The Anthropic secret also configures conversation/onboarding when their provider is `anthropic`.

## Research worker bounds and local startup

| Setting | Default | Maximum |
| --- | --- | --- |
| `AGENT_RESEARCH_MODEL` | `claude-sonnet-4-6` | Claude model identifier |
| `AGENT_RESEARCH_MAX_TURNS` | 8 | 32 |
| `AGENT_RESEARCH_TIMEOUT_SECONDS` | 120 | 600 |
| `AGENT_RESEARCH_MAX_BUDGET_USD` | 0.5 | 10 |
| `AGENT_RESEARCH_MAX_SEARCHES` | 3 | 10 |
| `AGENT_RESEARCH_MAX_FETCHES` | 6 | 20 |

`ANTHROPIC_MODEL` is accepted as a compatibility alias when `AGENT_RESEARCH_MODEL` is unset; the explicit research setting takes precedence.

All numeric bounds must be positive and finite. Search/read/refinement runs inside one SDK research query, followed by a tool-free SDK query for genuinely streamed final text; LangGraph owns the surrounding flow, checkpoints, and browser projection.

`scripts/start-local-ready.sh` pulls shared credentials into ignored owner-only env files. Both Compose layouts pass research settings to the agent. In the combined app container, the launcher removes the Anthropic and OpenAI keys before migrations and before starting auth, CRUD, or Vite. Local development can use `ANTHROPIC_API_KEY` directly; an explicit secret ARN still takes precedence. Never print expanded Compose configuration or container environments.

The locked SDK wheel supplies the native CLI, so no global Claude installation or npm install is required. `Dockerfile.agent-runtime` checks CLI startup during the image build, runs as an unprivileged user, and includes the research skill via `COPY services`. Each worker uses its own temporary home/config directory and removes it on completion. Local combined containers retain their existing user to preserve the AWS credential mount; their SDK child still receives only its allowlisted environment.

Before publishing, build and check the native binary on the target architecture without provider credentials:

```sh
docker buildx build --platform linux/arm64 -f Dockerfile.agent-runtime \
  --load -t travella-agent-runtime:phase11 .
docker run --rm --entrypoint /app/.venv/lib/python3.12/site-packages/claude_agent_sdk/_bundled/claude \
  travella-agent-runtime:phase11 --version
```

Provide HTTPS egress to Anthropic's API, SDK web-search services and fetched public websites, plus existing CRUD, Gateway, Memory, and Secrets Manager endpoints. Do not enable shell, filesystem mutation, or application mutation tools in the researcher. CLI startup proves packaging only; it does not prove provider authorization, external networking, or cancellation during a live invocation.

For first deployment, use the `CreateAgentRuntime` API with `agentRuntimeArtifact.containerConfiguration.containerUri`, `protocolConfiguration.serverProtocol: HTTP`, `networkConfiguration`, `authorizerConfiguration.customJWTAuthorizer`, and `requestHeaderConfiguration.requestHeaderAllowlist: [Authorization]`. Use a network mode that can reach the configured CRUD endpoint, AgentCore Gateway, and model API. Restrict Runtime invocation to the Travella auth service through the selected ingress/network design.

## Route Travella through Runtime

Set these variables for the auth service after the Runtime is active:

```dotenv
AGENTCORE_RUNTIME_ARN=<runtime-arn>
AGENTCORE_RUNTIME_REGION=<runtime-region>
```

When `AGENTCORE_RUNTIME_ARN` is unset, `AGENT_BASE_URL` remains the local agent target. Runtime calls use the same Cognito token captured by the auth session and preserve the existing browser API routes and response shapes.

## Rollout checks

- `GET /ping` returns `{"status":"Healthy"}`.
- Runtime `POST /invocations` rejects absent/invalid JWTs and accepts a configured Cognito access token.
- Confirm Plan ownership is still enforced by CRUD for two distinct travelers.
- Exercise non-streaming turn, streamed turn, cancellation, onboarding intake, and profile-memory sync.
- Inspect Runtime and service logs to ensure bearer tokens and raw profile/conversation bodies are not logged.
- Route one environment through Runtime and retain the local Agent service as rollback until end-to-end verification passes.

For a canary, use a non-production Plan and the ordinary authenticated chat. Ask one factual place question and check that the explanation has supporting citations; ask for destination candidates and check that candidate selection still works. Start a longer research turn, press Stop, and verify no later answer or sidebar mutation appears. Restart/resume the Plan and check its existing context. Compact evidence reuse is supported when the caller supplies research_state; the current HTTP composition does not yet persist or reload that field across process restarts. Exercise an unavailable source and inspect only sanitized outcome logs. Confirm the worker child exits after completion, Stop, and runtime shutdown. Live provider checks incur usage and remain separate from deterministic tests.

To roll research back, set `AGENT_RESEARCH_BACKEND=legacy` and restart/redeploy the same runtime image. Keep existing connector credentials and the configured conversation model available for this path; rollback does not switch them automatically. To roll Runtime routing back, unset the auth service's `AGENTCORE_RUNTIME_ARN` and restore its local `AGENT_BASE_URL`. Preserve Plan storage and memory resources in either rollback.

The Runtime resource itself is not created by this repository change. Deploy it only after the ECR image, execution role, Cognito authorizer, header allowlist, network path, and secrets are configured.
