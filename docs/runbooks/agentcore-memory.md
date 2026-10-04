# AgentCore Memory for traveler profiles

Travella keeps the traveler profile in the CRUD service as the canonical record. After an authenticated profile save succeeds, the auth service asks the Agent service to mirror the allow-listed profile fields to AgentCore Memory. The first-login intake node remains stateless and only asks questions and returns answer candidates.

## Configure

Set these variables in the deployment environment (or the repository root `.env` for Compose):

```dotenv
AWS_REGION=eu-north-1
AGENTCORE_MEMORY_ID=<memory-resource-id>
AGENTCORE_MEMORY_NAMESPACE_TEMPLATE=traveler/__ACTOR_ID__/profile
```

The region must match the Memory resource. When `AGENTCORE_MEMORY_ID` is empty, the integration stays disabled. Compose mounts the local AWS profile read-only; deployed services should use a task or workload IAM role.

Grant the Agent service role only these data-plane actions on the configured Memory resource ARN:

- `bedrock-agentcore:ListMemoryRecords`
- `bedrock-agentcore:BatchCreateMemoryRecords`
- `bedrock-agentcore:BatchUpdateMemoryRecords`

No Memory writes are made by the onboarding intake endpoint. The authenticated profile save triggers the mirror only after CRUD returns success. The Agent service hashes the verified Cognito subject for the Memory namespace; it never uses an email address or browser-supplied traveler identifier. Profile values are allow-listed and are excluded from LangGraph state/checkpoints. The Plan agent uses a retrieved AgentCore profile only when its values and `updated_at` still match the current CRUD profile; otherwise it uses the CRUD profile.

For production, configure encryption and retention on the AgentCore Memory resource for the sensitivity of citizenship and allergy preferences. Keep CloudTrail enabled and avoid logging request bodies or AgentCore records.

## Status and recovery

Profile-save responses include `memory_sync`: `synced`, `disabled`, `unavailable`, or `not_configured`. CRUD remains successful if AgentCore is unavailable. Saving the profile again retries the mirror. Plan turns fall back to the current CRUD profile when AgentCore is disabled, unavailable, or stale.
