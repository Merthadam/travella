---
quick_id: 261004-runtime
status: complete
---

# Summary

Added AgentCore Runtime-compatible health and invocation endpoints to the existing Agent app. Configured the auth-side `AgentClient` to route all agent operations to Runtime when `AGENTCORE_RUNTIME_ARN` is set, including OAuth streaming, stable opaque per-user/Plan sessions, transient 409 retries, and signed Runtime session stop for cancellation. Local service routing remains the fallback.

Added an ARM64 image recipe and a deployment runbook describing Cognito JWT authorization, forwarding the `Authorization` header, required service roles/secrets, and rollout checks. The AWS Runtime itself was not created or deployed.

Verification: Ruff passed for changed Python modules; Python compilation passed; `git diff --check` passed. `docker compose config` could not run because this environment's Docker CLI has no Compose plugin. No automated tests were run.
