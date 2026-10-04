# Local SDK startup complete

- Accepted ANTHROPIC_MODEL in shared secret sync and as the research-model fallback.
- User explicitly approved Anthropic for conversation routing because the shared secret no longer contains an OpenAI key.
- Added direct Anthropic conversation/onboarding adapter using the existing sanitized secret resolver. Local Compose defaults to Anthropic; explicit OpenAI/Bedrock selection remains available.
- Rebuilt and recreated the local app and MCP containers without deleting database volumes or mutating AWS resources.
- Cognito pool/client precheck passed. Example-account sign-in, session check and temporary sign-out passed.
- Agent health reports anthropic / claude-opus-4-5, research claude-agent-sdk / claude-opus-4-5, memory enabled.
- Five representative source files match their running container copies by SHA-256.
- Ruff and diff whitespace checks passed. No model research query was run; the user will manually exercise chat.

Canonical URL: http://localhost:5174. Local tools use the existing local MCP transport; this does not claim deployment to AgentCore Runtime.
