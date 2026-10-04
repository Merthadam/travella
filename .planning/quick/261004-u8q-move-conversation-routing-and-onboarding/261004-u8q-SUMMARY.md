# Pure Claude Agent SDK model execution

## Delivered

- All production conversation routing, ordinary replies, onboarding and research model calls use Claude Agent SDK.
- Removed direct Anthropic/OpenAI Python clients, their dependency entries and lockfile packages, model-provider switches and the legacy LangGraph refinement engine. No runtime fallback to those clients exists.
- Retained LangGraph stage/state ownership, AgentCore advisory profile input, verified private candidate/map tools and existing AG-UI streaming.
- Added an SDK structured routing contract and dedicated prompt, with bounded saved history, active brief and relevant traveler preferences. Short follow-ups resolve into a standalone research request before reaching the tools.
- Normal replies use a tool-free SDK streaming call; onboarding uses SDK structured output with existing user-quote validation. The router no longer parses arbitrary Messages API prose as JSON.
- Shared secret sync tolerates retired names only for migration compatibility and removes them from managed local files; it does not mutate shared AWS credentials. Local startup skill and runbooks describe the SDK-only path.
- Retired tests targeting deleted direct providers and the removed multi-pass LangGraph research engine. Updated existing API, local transport and secret-sync fixtures for SDK injection. Existing SDK worker coverage remains. No new tests or test runs were performed.

## Verification performed

- Ruff across services/agent and touched secret helper/tests passed.
- Python compilation and locked dependency resolution passed.
- Local Compose app and tool images rebuilt; database volume preserved.
- Example-account sign-in, session check and temporary sign-out passed.
- Runtime health: model_provider=claude-agent-sdk, research_backend=claude-agent-sdk, both models claude-opus-4-5, memory enabled.
- Running package inspection: claude_agent_sdk present; anthropic and openai absent.
- SHA-256 match for six representative source files (app, SDK conversation, research worker, SDK graph node, research projection and routing prompt).
- No live model reply, research/citation, cancellation or onboarding query was exercised; those remain manual/runtime validation gates. Startup evidence is not an end-to-end research pass.

## Scope and operational notes

The SDK still requires ANTHROPIC_API_KEY (or its Secrets Manager ARN); removing the standalone Python client does not remove that credential requirement. Model configuration remains ANTHROPIC_MODEL with AGENT_RESEARCH_MODEL taking precedence for the shared SDK configuration. A conversation stage has its configured time/cost allowance, and a following research stage has a separate allowance. Rollback requires deploying an earlier image.

The current HTTP composition still does not provide durable cross-restart research evidence checkpoints; saved chat/profile persistence remains as before. Canonical local URL is http://localhost:5174. No cloud deployment or push was performed.

Official implementation reference: https://code.claude.com/docs/en/agent-sdk/structured-outputs
