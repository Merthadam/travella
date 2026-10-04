# Phase 10: Evidence-grounded iterative agent research — Pattern Map

**Mapped:** 2026-10-04  
**Files analyzed:** 15 likely implementation/test files  
**Analogs found:** 15 / 15 (the workflow is an extension of existing agent and private MCP seams; some roles have only a partial match)

## File Classification

The scope below is inferred from `10-CONTEXT.md` and `10-RESEARCH.md`. Exact file additions remain a planning choice. This phase is backend Agent/MCP only; no frontend redesign or CRUD changes.

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `services/agent/graph/builder.py` | graph/orchestrator | event-driven | same file | exact |
| `services/agent/graph/nodes/conversation.py` | graph node | request-response / streaming | same file | exact |
| `services/agent/graph/nodes/research.py` or new evidence/review/synthesis node modules | graph nodes | request-response / event-driven | same file | role-match |
| `services/agent/state/contracts.py` | state model | transform / checkpoint | same file | exact |
| `services/agent/claude/adapter.py` | provider/tool adapter | request-response | same file | exact |
| `services/agent/claude/messages.py` | model client | request-response / streaming | same file | exact |
| `services/agent/turn.py` | context/prompt utility | transform | same file | exact |
| `services/agent/prompts/research-v1.md` | prompt config | transform | same file and `conversation-v1.md` | exact |
| `services/agent/checkpoint.py` | checkpoint boundary | persistence / transform | same file | exact |
| `services/agent/service.py` | turn controller / projection | streaming / event-driven | same file | exact |
| `services/mcps/research_server.py` | MCP tool/provider service | request-response / external I/O | same file | exact |
| `services/agent/tests/test_agent_graph.py` | test | event-driven | same file | exact |
| `services/agent/tests/test_agent_turn.py` | test | request-response / streaming | same file | exact |
| `services/agent/tests/test_agent_checkpoint.py` | test | persistence / transform | same file | exact |
| `services/mcps/tests/test_research_security.py` and `test_mcp_tools.py` | tests | request-response / external I/O | same files | exact |

## Pattern Assignments

### `services/agent/graph/builder.py` (orchestrator, event-driven)

**Analog:** `services/agent/graph/builder.py`

This is the only graph composition seam. Nodes are injected with the adapter; state transitions are LangGraph edges. The current end edge after research is the missing synthesis/refinement path. Keep the graph's hard pass counter/routing explicit in graph state and route exhausted or sufficient research to synthesis.

**Imports and composition pattern** (lines 7–16, 26–35):

```python
from langgraph.graph import END, START, StateGraph
from ..state import AgentState
from .nodes import ConversationNode, ResearchNode

flow = StateGraph(AgentState)
flow.add_node("conversation", ConversationNode(adapter))
flow.add_node("research", ResearchNode(adapter))
flow.add_edge(START, "conversation")
flow.add_conditional_edges(
    "conversation", _after_conversation, {"research": "research", "end": END}
)
flow.add_edge("research", END)
self.compiled = flow.compile(checkpointer=checkpointer)
```

**Request-scoped authorization and streaming callback** (lines 37–50):

```python
context_token = bind_authorization_token(authorization_token)
text_token = bind_text_delta_callback(on_text_delta)
try:
    result = await self.compiled.ainvoke(state)
finally:
    reset_text_delta_callback(text_token)
    reset_authorization_token(context_token)
```

Extend the conditional graph pattern rather than adding an independent recursive driver. Always reset context variables in `finally`.

### `services/agent/graph/nodes/conversation.py` (graph node, request-response)

**Analog:** `services/agent/graph/nodes/conversation.py`

**Bounded state-to-context adaptation and model call** (lines 30–45):

```python
context = TurnContext(
    traveler_scope=str(state["traveler_scope"]),
    plan_id=str(state["plan_id"]),
    conversation_id=state.get("conversation_id"),
    plan_revision=int(state.get("plan_revision", 1)),
    brief=state.get("brief", {}),
    recent_messages=tuple(state.get("recent_messages", [])),
    research_state=state.get("research_state", {}),
    generation=int(state.get("generation", 0)),
)
result = await complete(
    message=message,
    context=context,
    authorization_token=state.get("authorization_token", ""),
)
```

**Validation and safe failure shape** (lines 46–59):

```python
if not isinstance(result, dict):
    return {
        "status": "unable to continue",
        "error": "Conversation response was invalid.",
        "turn_decision": "respond",
    }
decision = result.get("decision")
if decision not in {"question", "research", "respond"}:
    decision = "research"
```

Use the existing node pattern for each evidence decision/review/synthesis stage: accept typed state, validate model output before routing, bound strings, and return state deltas rather than mutating global state. Keep the initial model call from emitting unsupported factual answer text on turns that need research; stream only after evidence-grounded synthesis.

### `services/agent/graph/nodes/research.py` (retrieval node, request-response / external I/O)

**Analog:** `services/agent/graph/nodes/research.py`

This is currently candidate-focused and couples retrieval to map resolution. It should remain the reference for authenticated tool invocation and preserving the existing candidate path, but generic country/place evidence likely merits a distinct node/tool contract.

**Authenticated tool call** (lines 47–53):

```python
result = await self.tools.research(
    message=message,
    traveler_scope=state["traveler_scope"],
    plan_id=state["plan_id"],
    event_id=state["event_id"],
    authorization_token=current_authorization_token(),
)
```

**Fail-closed result validation** (lines 54–71):

```python
if status not in {"ready", "shortlist_ready"}:
    return {"status": "unable to continue", "error": "Research is temporarily unavailable."}
try:
    candidates = _bounded_candidates(result.get("candidates", []))
except ValueError:
    return {"status": "unable to continue", "error": "Research results were invalid."}
```

For generic research, validate status and each evidence item's schema/read status/length. Do not require candidates for an ordinary factual question. Keep candidate/map enrichment conditional on destination-discovery intent.

### `services/agent/state/contracts.py` and `services/agent/checkpoint.py` (state model and persistence boundary)

**Analogs:** same files.

**Typed graph state** (`contracts.py`, lines 11–32):

```python
class AgentState(TypedDict, total=False):
    traveler_scope: str
    plan_id: str
    event_id: str
    generation: int
    message: str
    candidates: list[dict[str, Any]]
    evidence: list[dict[str, Any]]
    research_state: dict[str, Any]
    assistant_text: str
    turn_decision: str
```

**Checkpoint allow-list and byte bound** (`checkpoint.py`, lines 22–30):

```python
allowed = {"traveler_scope", "plan_id", "plan_revision", "event_id", "generation",
           "message", "status", "question", "candidates", "evidence", "run_id",
           "error", "projection", "research_state", "assistant_text", "turn_decision"}
output = {key: value for key, value in state.items() if key in allowed and key not in _SECRET_KEYS}
output["checkpoint_schema_version"] = CHECKPOINT_SCHEMA_VERSION
encoded = json.dumps(output, ensure_ascii=False, default=str)
if len(encoded) > 50000:
    raise ValueError("checkpoint state exceeds bounded size")
```

Add only compact, normalized, explicitly allow-listed evidence reuse metadata. Treat the checkpoint allow-list and schema version as an intentional persistence contract; raw page content, raw provider payloads, and model reasoning do not belong there. The existing 50,000-byte check is the final guard, not a substitute for per-field bounds.

### `services/agent/claude/adapter.py` and `services/agent/claude/messages.py` (provider adapter and model client)

**Analogs:** same files.

`ClaudeGatewayAdapter` separates model calls (`ClaudeMessagesClient`) from allow-listed private tool calls (`GatewayToolClient`). Keep that separation: structured sufficiency/refinement/synthesis belongs in the model client; web retrieval stays in private MCP tools.

**Tool allow-list and verified-token boundary** (`adapter.py`, lines 69–78):

```python
if tool not in ALLOWED_TOOLS:
    raise ValueError("tool is not allowlisted")
if not authorization_token:
    raise GatewayProtocolError("verified Cognito token is required")
if not self.gateway_url:
    raise GatewayProtocolError("AgentCore Gateway is not configured")
return await self._gateway(authorization_token).call_tool(tool, arguments)
```

**Provider request construction** (`messages.py`, lines 146–195):

```python
request = {"model": self.model, "max_tokens": max_tokens, "messages": input_messages}
if system:
    request["system"] = system
return await self._client().messages.create(**request)
```

**Existing assistant-visible stream extraction** (`messages.py`, lines 293–306):

```python
decision = json.loads(parser.raw)
if not isinstance(decision, dict) or decision.get("decision") not in {"question", "research", "respond"}:
    return {"decision": "respond", "assistant_text": "I couldn’t complete that reply. Please try again.", "question": None}
assistant_text = decision["assistant_text"][:2000]
```

The existing Anthropic Messages/Bedrock path parses JSON itself; do not presume strict schema decoding is available on that endpoint. Validate model-produced action/evidence IDs in Python and retain provider-specific request construction in this client. Keep streaming tied to the final `assistant_text` field only.

### `services/agent/turn.py` and `services/agent/prompts/research-v1.md` (context utility and prompt config)

**Analogs:** `services/agent/turn.py`, `services/agent/prompts/conversation-v1.md`, and the existing `research-v1.md`.

`TurnContext` builds a bounded history (`MAX_HISTORY = 12`, `MAX_TEXT = 2000`) and serializes only known Plan context into the prompt. Follow this when providing retrieved evidence: pass compact explicit structured evidence, clearly separated as untrusted web text. Prompt instructions can establish behavior, evidence sufficiency, and uncertainty wording, but deterministic graph/tool limits and tool authorization must enforce it.

### `services/mcps/research_server.py` (private MCP service, request-response / external I/O)

**Analog:** `services/mcps/research_server.py`; supporting auth boundary: `services/mcps/transport.py`.

**Bounded constants, normalized untrusted text, and URL gate** (lines 21–25, 64–75):

```python
MAX_CANDIDATES = 5
MAX_SOURCES = 10
MAX_EXCERPT = 700

def _clean_text(value: object, limit: int = MAX_EXCERPT) -> str:
    text = re.sub(r"\s+", " ", str(value or "")).strip()
    text = re.sub(r"[\x00-\x1f\x7f]", " ", text)
    return text[:limit].strip()

def _canonical_url(value: object) -> str | None:
    url = str(value or "").strip()
    if not url.lower().startswith("https://") or len(url) > 2048:
        return None
    return url.split("#", 1)[0]
```

**Tenant/Plan authorization, input bound, private provider call, generic failure** (lines 236–273):

```python
context = require_tool_context(plan_id=plan_id)
query = " ".join(theme.split()).strip()
if not query or len(query) > 500:
    raise ValueError("theme must contain between 1 and 500 characters")
api_key = required_secret(McpSettings.from_env().tavily_api_key, "TAVILY_API_KEY")
try:
    async with httpx.AsyncClient(timeout=20, follow_redirects=True) as client:
        response = await client.post(TAVILY_SEARCH_URL, json=payload)
        response.raise_for_status()
        data = response.json()
except (httpx.HTTPError, ValueError):
    return {"status": "unable_to_continue", "plan_id": plan_id, "run_id": run_id,
            "error": "research provider unavailable"}
```

**Plan/run/expiry-scoped evidence retrieval** (lines 327–373):

```python
context = require_tool_context(plan_id=plan_id)
requested = [str(item).strip() for item in evidence_ids
             if re.fullmatch(r"[A-Za-z0-9_-]{1,180}", str(item).strip())][:MAX_SOURCES]
if (not item or item.get("subject") != context.subject or item.get("plan_id") != plan_id
        or item.get("run_id") != run_id or int(item.get("expires_at", 0)) <= now):
    continue
```

Use this tool boundary for Tavily Extract/page reading: authenticate with `require_tool_context`, bound URL/page count and extracted text, retain per-page success/failure metadata, normalize outputs, and never return credentials/raw HTTP payloads. Existing registry lookups enforce subject, Plan, run, and expiry. Confirm redirect/URL safety and provider page failures explicitly when extending to arbitrary URLs.

### `services/agent/service.py` (turn controller, streaming / projection)

**Analog:** same file.

**Graph state and scoped invocation** (lines 186–205):

```python
graph_state = {
    "traveler_scope": subject, "plan_id": plan_id,
    "plan_revision": int(context.get("revision", plan.get("revision", 1))),
    "conversation_id": context.get("conversation_id"),
    "brief": context.get("brief", {}),
    "recent_messages": context.get("messages", []),
    "event_id": request.event_id, "generation": generation, "message": query,
    "candidate_action": action,
}
result = await self.graph.invoke(graph_state, authorization_token=token,
                                 on_text_delta=on_text_delta)
```

**Superseded generation guard and validated source projection** (lines 229–275):

```python
if not await self.candidates.publish(subject, plan_id, generation, ...):
    return await finish(self._interrupted(plan_id, request.event_id, generation, prior))
source_refs = self._source_refs(projection)
if source_refs:
    projection["sources"] = source_refs
assistant_content = str(projection.get("assistant_text") or projection.get("question") or "")
assistant_content = self._message_with_sources(assistant_content, source_refs)
```

Use the service as the allow-listed browser/checkpoint projection and event ordering boundary. For Phase 10, source projection should be based on successfully page-read evidence IDs, not all candidate search results. Preserve the existing generation/interruption checks and assistant-visible text stream; do not expose tool traces, provider payloads, or evidence bodies.

## Shared Patterns

### Authorization and private tool use

**Sources:** `services/agent/claude/adapter.py:69-78`, `services/agent/graph/nodes/research.py:47-53`, `services/mcps/transport.py:166-172`.  
**Apply to:** new agent tool methods and MCP tools.

Require a verified request token at the Agent adapter; forward only through the gateway client. At the MCP target, derive the authenticated tool context and require its Plan to match. Do not accept browser-supplied identity as authorization.

```python
context = require_tool_context(plan_id=plan_id)
if not authorization_token:
    raise GatewayProtocolError("verified Cognito token is required")
```

### Bounds, validation, and generic errors

**Sources:** `services/mcps/research_server.py:21-25,64-75,247-273`; `services/agent/graph/nodes/research.py:54-71`.  
**Apply to:** evidence state, tool inputs/outputs, model-generated routing decisions.

Normalize and bound at the tool boundary; validate again in Agent nodes before state/projection. Return generic provider-unavailable messages, while retaining a structured page-read failure outcome so answer limitations can be honest.

### State, checkpoint, and privacy

**Sources:** `services/agent/state/contracts.py:11-32`; `services/agent/checkpoint.py:22-30`.  
**Apply to:** graph state and resumable evidence metadata.

Use explicit typed state fields and the checkpoint allow-list. Keep raw pages, raw provider payloads, credentials, and reasoning outside the checkpoint; compact evidence IDs/title/URL/status/timestamps can be considered subject to freshness and size policy.

### Streaming, source projection, and stale-run suppression

**Sources:** `services/agent/claude/messages.py:231-306`; `services/agent/service.py:304-365,428-458`.  
**Apply to:** final synthesis and source references.

Only stream assistant-visible final answer text after retrieved evidence has been reviewed. Validate source IDs/status in Agent code before projecting HTTPS title/URL references. Preserve message IDs, generation checks, interruption handling, and current SSE terminal metadata.

### Deterministic tests

**Sources:** `services/agent/tests/test_agent_graph.py:9-52`; `services/mcps/tests/test_research_security.py:12-51,54-97`; `services/agent/tests/test_agent_api.py`.  
**Apply to:** new graph routes, evidence tool and source projection.

Use fake adapters/provider responses and authenticated MCP test contexts, as existing tests do. Add cases for search→read→review ordering, pass/page/output bounds, failed reads, citation ID rejection, checkpoint allow-list, candidate preservation, and generation supersession. Keep live Tavily/Bedrock out of normal deterministic tests.

## No Analog Found

No exact existing implementation handles general place-question evidence extraction, Claude sufficiency/refinement decisions, or post-retrieval synthesis. Those are new behaviors. Compose them from the graph, model-client, and MCP patterns above rather than reusing the candidate-only research node as if it already supported the full loop.

## Metadata

**Analog search scope:** `services/agent/`, `services/mcps/`, their focused tests, `.agents/skills/`.  
**Tracked-source gate:** all named source analogs were verified with `git ls-files`; no ignored mirror paths are referenced.  
**Pattern extraction date:** 2026-10-04
