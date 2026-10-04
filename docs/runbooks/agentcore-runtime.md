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

Create the Runtime using the `HTTP` protocol and `CUSTOM_JWT` authorization. Configure its Cognito OIDC discovery URL, access-token client/scope restrictions, and `Authorization` request-header allowlist. Configure the Runtime execution role for ECR image access, outbound CRUD and Gateway access, the required AgentCore Memory operations, and `secretsmanager:GetSecretValue` for the OpenAI API key secret. Supply `CRUD_BASE_URL`, `COGNITO_*`, `AGENTCORE_GATEWAY_URL`, `AGENTCORE_MEMORY_ID`, `AGENT_MCP_TRANSPORT=agentcore`, `AGENT_MODEL_PROVIDER`, and model configuration to the Runtime environment. When OpenAI is selected, set `OPENAI_API_KEY_SECRET_ARN` to a Secrets Manager ARN; the Runtime loads the key at startup without exposing the secret value in its environment or image.

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

The Runtime resource itself is not created by this repository change. Deploy it only after the ECR image, execution role, Cognito authorizer, header allowlist, network path, and secrets are configured.
