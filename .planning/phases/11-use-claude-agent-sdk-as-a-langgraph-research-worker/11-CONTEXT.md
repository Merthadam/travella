# Phase 11: Use Claude Agent SDK as a LangGraph research worker — Context

**Gathered:** 2026-10-04  
**Status:** Ready for planning

<domain>
## Phase Boundary

Use the Claude Agent SDK as a bounded research worker inside Travella's existing Plan-scoped LangGraph. LangGraph remains the single end-to-end supervisor, owns state/checkpoints and conditional routing, and emits the existing AG-UI contract. The SDK worker handles the research stage using Claude's agent loop, native web search/fetch, and a small set of packaged Travella research skills. Return a validated answer and source metadata to LangGraph for projection through existing chat behavior.

This phase builds on Phase 10's evidence-grounded iterative research behavior. It does not replace LangGraph with Claude Agent SDK, move durable state or future workflow stages into SDK sessions, redesign the chat, add personal-memory RAG, or grant the worker authority to mutate durable Plan data.
</domain>

<decisions>
## Decisions

### Framework ownership
- **D-01:** LangGraph stays the top-level supervisor and the only durable orchestration/checkpoint owner. Claude Agent SDK is a worker invoked by the research node.
- **D-02:** Future planning stages remain LangGraph nodes. Do not grow this worker into a second product workflow or move the whole conversation to Claude SDK.
- **D-03:** The research worker is stateless across user turns. LangGraph supplies the current user request and relevant bounded Plan/conversation context; no SDK session ID or transcript becomes authoritative or durable.

### Research behavior
- **D-04:** Use Claude Agent SDK's native web search/fetch loop for factual country/place questions and the existing Travella research skill(s) for reusable domain guidance.
- **D-05:** Preserve Phase 10 behavior: read linked pages before treating them as evidence; favor official sources for rules and reputable sources for advice; identify unavailable pages and conflicting facts; answer from inspected evidence and state residual uncertainty.
- **D-06:** Keep search/refinement bounded per turn. Exact turn, wall-clock, tool-call, and result-size limits are implementation values to document and validate.
- **D-07:** Keep destination-discovery candidate generation and its structured result contract. The SDK's explanatory answer may accompany candidates; it cannot finalize or save a destination.

### State, streaming, and authority
- **D-08:** LangGraph owns run ordering, interruption, cancellation, and the existing streamed user-facing answer. SDK tool activity, internal reasoning, and intermediate research commentary are not browser events.
- **D-09:** Validate the worker's final structured result at the adapter boundary. Project only answer text plus source references that were actually returned by approved search/fetch tools and pass application validation.
- **D-10:** Checkpoints may contain only bounded, normalized context/evidence needed for current Phase 10 reuse. Never checkpoint SDK transcripts, raw tool/page payloads, credentials, or hidden reasoning.
- **D-11:** Web content is untrusted data. It cannot alter tool permissions, override system/skill instructions, or authorize Plan mutations.

### Credentials and deployment
- **D-12:** Use direct Anthropic API-key authentication through `ANTHROPIC_API_KEY` for the SDK worker. The value exists in the shared local-development AWS secret; it must be fetched/forwarded only through the established secret mechanism and must never be logged, embedded in the image, or checkpointed.
- **D-13:** Keep current model calls outside the research worker on their current provider configuration unless integration proves a change is required; this phase specifically moves research-worker execution to Claude Agent SDK.
- **D-14:** No frontend redesign. Reuse current AG-UI/chat response, citations, cancellation, and Plan candidate projections.

### Execution clarification
- **D-15 (2026-10-04):** The user explicitly confirmed that Claude Agent SDK owns the complete search/read/refine/finish loop. LangGraph invokes the worker once per research turn; it must not wrap the worker in a second refinement loop. A separate tool-free SDK synthesis call inside the worker provides real final-text streaming without exposing research commentary.

### the agent's Discretion
- Choose exact compatible SDK/CLI versions, worker module shape, output schema, tool allowlist and denylist, skill packaging, process/time/cost limits, secret ARN/env convention, and any compatibility fallback after checking current deployment and SDK behavior.
- Determine whether native WebSearch/WebFetch alone satisfies evidence capture or whether a narrow existing private retrieval capability should remain as a fallback. Preserve source integrity and Phase 10 behavior either way.
- Select code and human evaluation coverage and rollout sequencing; do not add a new observability vendor in this phase.
</decisions>

<canonical_refs>
## Canonical References

- `.planning/ROADMAP.md` — Phase 11 scope and success criteria.
- `.planning/PROJECT.md` — Agent/CRUD ownership, data authority, privacy, and resilience constraints.
- `.planning/phases/10-evidence-grounded-iterative-agent-research/10-CONTEXT.md` — authoritative Phase 10 research behavior; carry forward D-01–D-13 unless this Phase 11 context narrows implementation only.
- `.planning/phases/10-evidence-grounded-iterative-agent-research/10-AI-SPEC.md` — existing research domain rubrics and risk profile.
- `docs/runbooks/agentcore-runtime.md` — current Runtime and Secrets Manager deployment contract.
- `services/agent/graph/builder.py`, `services/agent/graph/nodes/research.py`, `services/agent/state/contracts.py`, `services/agent/claude/adapter.py`, and `services/agent/service.py` — live graph, state, adapter, and projection integration points.
- `Dockerfile.agent-runtime`, `pyproject.toml`, `uv.lock`, and `scripts/local_secrets.py` — runtime image, dependency lock, and local secret sync.
- Official SDK overview: https://code.claude.com/docs/en/agent-sdk/overview
- Official Python reference: https://code.claude.com/docs/en/agent-sdk/python
- Official SDK skills guide: https://code.claude.com/docs/en/agent-sdk/skills
- Official SDK security deployment guide: https://code.claude.com/docs/en/agent-sdk/secure-deployment
</canonical_refs>

<code_context>
## Existing Code Insights

- `AgentGraph` is already the Plan-scoped LangGraph and routes conversation to research; it owns bounded follow-up passes and compiles against the configured checkpointer.
- `ClaudeGatewayAdapter` separates model calls from private AgentCore Gateway tools; `ClaudeMessagesClient` currently calls the Anthropic Messages API or OpenAI Responses API.
- `AgentState`, the research node, and `AgentTurnService` already maintain evidence/run identity, source validation, cancellation/order, and response projection. Reuse those boundaries.
- Phase 10 already has passing research fixtures and a reference evaluation corpus; extend those for the SDK worker and do not replace with live-web-only tests.
- `Dockerfile.agent-runtime` currently installs locked Python dependencies into a minimal Debian image. SDK packaging must account for its bundled Claude Code CLI/runtime subprocess and verify the deployed Linux/ARM64 path.
- `docs/runbooks/agentcore-runtime.md` documents `OPENAI_API_KEY_SECRET_ARN` and a startup secret-loading expectation, but the current application composition does not visibly implement that loader. Verify the actual branch/runtime wiring before copying that convention for Anthropic.
</code_context>

<specifics>
## Specific Ideas

- The target loop remains: traveler message → LangGraph decision → Claude Agent SDK researcher uses search/read tools and a Travella skill → validated answer/sources return to LangGraph → current AG-UI streams answer and citations.
- No context drawer, research trace panel, or frontend state changes are requested.
- The visible chat continues to behave like GPT: explain findings in natural language and cite links instead of returning unexplained links.
</specifics>

<deferred>
## Deferred Ideas

- Replacing the top-level LangGraph, AG-UI, or durable checkpoint model with Claude Agent SDK sessions.
- Moving future trip-planning stages into Claude Agent SDK.
- Long-term traveler-memory/RAG redesign.
- New UI for research progress/tool traces, personal preferences, booking, or automatic durable Plan changes.
</deferred>
