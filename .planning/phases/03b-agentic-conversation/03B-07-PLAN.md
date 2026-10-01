---
phase: 03b-agentic-conversation
plan: '07'
type: execute
wave: 1
depends_on: []
files_modified: [services/agent/prompts/conversation-v1.md, services/agent/prompts/research-v1.md, services/agent/turn.py, services/agent/graph.py, services/agent/claude.py, services/agent/tests/test_agent_turn.py]
autonomous: true
gap_closure: true
requirements: [DISC-01, DISC-02, DISC-03, DISC-04, DISC-05, DISC-06, DISC-09, TRUST-04]
estimate: {tokens: 26000, raw_tokens: 26000, tasks: 2, confidence: low}
must_haves:
  truths:
    - Claude receives a versioned system prompt, bounded prior conversation, current active Brief values, tentative inferences, and compact research state for an owned Plan turn.
    - One conversational stage returns a useful answer with at most one focused question, or routes to research; early answers, skips, corrections, and redirects do not depend on message length.
    - The graph has only conversation and research stages unless a distinct branching/retry/resume need is documented; assistant text is preserved as an allowlisted projection.
  artifacts:
    - {path: services/agent/prompts/conversation-v1.md, provides: D-02 versioned conversational policy}
    - {path: services/agent/prompts/research-v1.md, provides: D-06 cited destination assessment policy}
    - {path: services/agent/turn.py, provides: D-03 typed bounded turn context and prompt construction}
    - {path: services/agent/graph.py, provides: D-01 two-stage LangGraph flow}
  key_links:
    - {from: services/agent/graph.py, to: services/agent/claude.py, via: Anthropic Messages SDK conversation call using system field}
---

<objective>
Make a Plan turn conversational and context-aware through a small LangGraph and the chosen Anthropic Messages SDK.
Purpose: Replace fixed-question and message-length behavior while preserving focused traveler control (D-01, D-02, D-03).
Output: Versioned prompts, typed turn context, two-stage graph, and deterministic SDK-call tests. Backend only; no frontend design or browser claim.
</objective>
<execution_context>
@/Users/adammerth/.codex/gsd-core/workflows/execute-plan.md
@/Users/adammerth/.codex/gsd-core/templates/summary.md
</execution_context>
<context>
@.planning/phases/03b-agentic-conversation/03B-CONTEXT.md
@.planning/phases/03b-agentic-conversation/03B-RESEARCH.md
@docs/user-stories/agentic-plan-research/README.md
@docs/planning/mvp-phase-1-service-contracts.md
@services/agent/graph.py
@services/agent/claude.py
</context>
<tasks>
<task type="tracer" tdd="true">
  <name>Answer one Plan turn from a versioned prompt and typed context</name>
  <files>services/agent/prompts/conversation-v1.md, services/agent/turn.py, services/agent/claude.py, services/agent/tests/test_agent_turn.py</files>
  <behavior>Given a verified Plan context and brief conversation history, the SDK call has a top-level system prompt and bounded user/assistant messages; a short meaningful request can initiate research while a long skip can receive one question or a redirect; raw tool blocks and credentials are absent from the public reply.</behavior>
  <action>Per D-02 and D-03, create a discoverable versioned conversation prompt grounded in the user-story journey and service contracts. Define typed TurnContext with verified actor/Plan/Conversation identifiers, CRUD revision, active Brief values with origin, inactive historical values excluded from ranking, tentative proposals, bounded recent messages, prior complete shortlist and generation. Load the prompt from a fixed allowlisted path, use AsyncAnthropic.beta.messages.create with system= and bounded messages=, and validate text/decision blocks before projecting. Keep the SDK provider configurable behind the existing adapter, but use the selected Anthropic Python SDK in this executable path. Test actual SDK request arguments and no secret/raw-MCP leakage. The final CRUD context loader is introduced by 03B-08; this tracer uses typed fixture context without claiming persistence.</action>
  <verify><automated>uv run pytest -q services/agent/tests/test_agent_turn.py</automated><fails_when>The SDK call lacks system/history/current Brief context, or a short valid intent is routed by character count.</fails_when></verify>
  <done>A bounded, valid Plan turn returns useful assistant text with at most one question or a research decision under the versioned prompt.</done>
</task>
<task type="auto" tdd="true">
  <name>Collapse the graph to conversation and research decisions</name>
  <files>services/agent/prompts/research-v1.md, services/agent/graph.py, services/agent/claude.py, services/agent/tests/test_agent_turn.py</files>
  <behavior>Conversation and research are the only execution stages; map lookup and projection are operations inside research; an assistant reply and research decision survive graph state without an extra formatting node.</behavior>
  <action>Per D-01 and D-06, replace entry/focused_question/map_resolution/projection nodes with conversation and research stages. Route using validated model turn decision plus explicit candidate action, never message length. Conversation stage preserves the assistant reply and at most one focused question; research stage applies the versioned research prompt and current compact context, returning only complete candidate assessment proposals. Keep bounded routing, one graph invocation per event, and safe error states. Defer final Gateway tool-loop consolidation to 03B-10, but expose one adapter seam so that plan can own all tool execution without a second loop. Test stage transitions for first intent, answer, skip, redirect, research early, malformed model block, and source-content instruction attempt.</action>
  <verify><automated>uv run pytest -q services/agent/tests/test_agent_turn.py services/agent/tests/test_agent_api.py</automated><fails_when>Fixed questions or message-length routing remain active, more than one question is projected, or a nonallowlisted model block reaches the response.</fails_when></verify>
  <done>One small graph handles focused dialogue and intentional research from typed Plan context.</done>
</task>
</tasks>
<threat_model>
## Trust Boundaries
| Boundary | Description |
|---|---|
| CRUD/turn context → model | Only current authorized Plan facts and bounded history may be sent. |
| Model output → response | Text and decisions are untrusted until validated. |
## STRIDE Threat Register
| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|---|---|---|---|---|---|
| T-03B-07-01 | Information disclosure | prompt/context | high | mitigate | TurnContext allowlist excludes credentials, inactive ranking values, raw provider payloads, and foreign Plan data. |
| T-03B-07-02 | Tampering | model decision | high | mitigate | Validate decision/question schema and stage transitions before projection. |
</threat_model>
<verification>Run focused SDK request and graph tests; this plan does not certify CRUD persistence, live provider access, or a browser Conversation.</verification>
<success_criteria>D-01/02/03 prompt and graph behavior is executable with deterministic typed context; D-06 research prompt is ready for the single tool loop in 03B-10.</success_criteria>
<output>Create .planning/phases/03b-agentic-conversation/03B-07-SUMMARY.md when done.</output>
