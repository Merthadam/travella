# Phase 11 Research: Claude Agent SDK research worker

**Date:** 2026-10-04

## Recommendation

Integrate the Python Claude Agent SDK as an injected adapter owned by the existing LangGraph research node. Invoke one stateless SDK query per research attempt, passing a bounded task context and accepting a validated structured result. Keep LangGraph responsible for the state machine, retries/refinement, checkpointer, turn generation, AG-UI projection, and cancellation.

## Official SDK Findings

- The SDK is a library that runs the Claude Code binary and exposes its agent loop, built-in tools, permissions, hooks, sessions, and skills. It is distinct from the direct Anthropic Client SDK. For this use case the product owns/runs the agent inside the Python service, so the Python SDK fits the agreed boundary. [Overview](https://code.claude.com/docs/en/agent-sdk/overview)
- Python `query()` creates a single interaction and yields async messages. `ClaudeSDKClient` is intended for interactive multi-turn sessions; that would duplicate Plan conversation state, so prefer `query()` for each LangGraph research invocation. [Python reference](https://code.claude.com/docs/en/agent-sdk/python)
- Native `WebSearch` and `WebFetch` are SDK tool surfaces. WebSearch results include query, title, and URL fields. A returned URL alone does not prove full page evidence was inspected; implementation must capture fetch provenance and only project sources meeting the existing source-read contract. [Python tool reference](https://code.claude.com/docs/en/agent-sdk/python)
- Project skills are `SKILL.md` filesystem artifacts under `.claude/skills/<name>/`; the SDK discovers them via setting sources and the skill option. Explicitly select only the product's research skill. Do not inherit user/local development settings. [Skills guide](https://code.claude.com/docs/en/agent-sdk/skills)
- Python options expose `tools`, `allowed_tools`, `disallowed_tools`, `permission_mode`, `max_turns`, `max_budget_usd`, `setting_sources`, `skills`, `output_format`, and partial message streaming. A narrow available-tools configuration plus `dontAsk`/denials is required. `allowed_tools` alone is not a strict available-tool allowlist. [Python reference](https://code.claude.com/docs/en/agent-sdk/python), [permissions](https://code.claude.com/docs/en/agent-sdk/permissions)
- Structured output and streaming are supported, but the worker must filter SDK control/tool events and return only the validated product result. The browser should continue to receive the existing AG-UI event contract. [Structured output](https://code.claude.com/docs/en/agent-sdk/structured-outputs), [streaming](https://code.claude.com/docs/en/agent-sdk/streaming-output)
- The SDK is a subprocess-backed runtime dependency, not a plain HTTP client. AgentCore image build, ARM64 compatibility, process lifecycle, filesystem access, outbound network, and secret injection all need deployment verification. [Hosting](https://code.claude.com/docs/en/agent-sdk/hosting), [secure deployment](https://code.claude.com/docs/en/agent-sdk/secure-deployment)

## Codebase Findings

- Existing LangGraph is in `services/agent/graph/builder.py`; the research stage is in `services/agent/graph/nodes/research.py` and talks through the `AgentAdapter` contract in `services/agent/claude/adapter.py`.
- Current model adapter is `ClaudeMessagesClient`; it calls Anthropic Messages via Bedrock by default or OpenAI when configured. The planned worker can be separate, avoiding a risky wholesale replacement of conversation model calls.
- `AgentTurnService` and `AgentGraph` already project assistant-visible text and validated read-source citations. Preserve these contracts and use an adapter to normalize SDK results.
- The image uses Python 3.12 on Debian Bookworm slim and uv lockfile sync. Add the SDK and update the locked dependency set; validate its bundled CLI on the AgentCore target architecture.
- The AgentCore runbook documents Secrets Manager access for OpenAI but code inspection did not find the corresponding application loader. The implementation must verify the deployed secret path rather than assume environment injection is already functional. Local development has `ANTHROPIC_API_KEY` in the shared secret (presence checked without printing value).

## Implementation Questions Resolved for Planning

1. Keep LangGraph supervisor and checkpoint: yes, required by user.
2. Use direct Anthropic key for Claude Agent SDK: yes; key is now present in shared AWS local-development secret.
3. SDK role: research worker only; future planning stages remain graph nodes.
4. UI: unchanged; keep existing full-chat answer/citation experience.

## Risks / Validation Focus

- Verify the exact pinned `tools` configuration semantics and SDK output schema against the version selected at execution; tool/permission controls are security-sensitive.
- Ensure project skills are available in the final runtime image without allowing skills to read repository files or access shell tools.
- Determine how native web tool events expose fetched page evidence and citations. Preserve the Phase 10 “read before cite” acceptance criterion.
- Test CLI subprocess cancellation under AgentCore Runtime stop/cancel and ensure graph generation checks still suppress obsolete output.
- Validate production runtime secret retrieval separately from the local shared secret; do not infer that local key presence means the deployed runtime has access.
