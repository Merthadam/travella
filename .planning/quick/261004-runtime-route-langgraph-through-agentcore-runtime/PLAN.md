---
quick_id: 261004-runtime
status: complete
---

# Route the main LangGraph flow through AgentCore Runtime

## Goal

Run Travella's existing authenticated agent application and LangGraph flow in AgentCore Runtime when configured, while preserving the local Agent service fallback, current auth/CRUD boundaries, streamed events, and separate onboarding graph.

## Implementation

1. Add the AgentCore HTTP Runtime `/ping` and `/invocations` contract around the existing use cases.
2. Add OAuth HTTPS invocation routing in `AgentClient`; forward Cognito authorization without putting it in payloads, use opaque traveler/Plan session IDs, and stop active sessions through the signed Runtime API.
3. Add an ARM64 Runtime container recipe and deployment runbook for Runtime role, Cognito authorizer, request-header allowlist, secrets, and auth-service routing.

## Acceptance

- Existing LangGraph is the workflow executed by Runtime.
- Auth and CRUD ownership remain in existing services; Runtime revalidates forwarded Cognito tokens.
- Existing local Agent URL remains the fallback when no Runtime ARN is configured.
- Runtime streaming preserves the existing SSE events.
- Static checks pass; no AWS resources are created by this task.

## Verification scope

Run Python lint and compilation checks plus whitespace diff validation. Do not run tests for this task. Do not create or deploy AWS resources.
