---
status: resolved
trigger: User reports the local preview shows Interrupted for every trip-planning reply.
created: 2026-11-04
updated: 2026-11-04
---

## Symptoms

Expected: submitting a ski-trip request produces a conversation reply.
Actual: two assistant turns show Interrupted and Retry with no reply text.
Reproduction: manual testing at the provided localhost:5200 preview.

## Current Focus

Root cause: Anthropic rejects the configured API key. Healthy web/auth checks did not exercise live model access.
Next action: none. User refreshed the expired key; settings were pulled, the isolated preview rebuilt and a real example-account conversation verified.

## Evidence

- App container is running, exit code 0, OOMKilled false.
- Generic stream exceptions map to the displayed Interrupted state.
- Existing isolated Chrome DevTools connection is available.
- Runtime recorded chat_failed code=ResultError twice, matching the reported turns.
- Read-only Anthropic models request from the running container returned HTTP 401 authentication_error.
- Refreshed shared development settings from Secrets Manager. The key matches the running container and is also rejected with HTTP 401 authentication_error. No credential values were printed.
- Existing example-account browser session is authenticated; user Plan was left untouched. A separate empty diagnostic Plan was created and deleted through the authenticated API.

## Resolution

Resolved after the user updated the expired key. Provider authentication now returns 200; actual Chrome DevTools ski-trip conversation completed and survived reload. Preview remains at http://localhost:5200. No application code changed. User Plan, conversation and Docker volumes preserved; temporary test Plan deleted. Evidence: artifacts/testing/2026-11-04-chat-credential-recovery/verification.md. GSD debug executed inline.
