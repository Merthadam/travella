# Phase 10: Evidence-grounded iterative agent research — Research

**Researched:** 2026-10-04  
**Domain:** LangGraph research orchestration, Tavily retrieval, Claude on Amazon Bedrock  
**Confidence:** HIGH for current code seams and documented service capabilities; MEDIUM for target loop details, which are implementation choices.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Research behavior
- **D-01:** Research factual questions about any country or place, not only destination-shortlist prompts. Normal conversational follow-ups can use relevant evidence already available without searching again.
- **D-02:** Read relevant content from linked pages before using those pages as evidence. If a page cannot be read, flag that limitation; do not present its search snippet as though the page was inspected.
- **D-03:** Claude receives normalized retrieved evidence and decides whether it is sufficient. It may request a better-targeted follow-up search for a small, bounded number of passes; the exact per-turn cap and query strategy are implementation decisions for research/planning.
- **D-04:** When the research budget is exhausted, answer with the supported information and clearly state what remains uncertain. Do not fill evidence gaps with unattributed general knowledge.
- **D-05:** If sources disagree, explain the disagreement and cite both sources rather than silently choosing one.
- **D-06:** Prefer official sources for rules and requirements; use reputable sources for travel advice.
- **D-07:** Refresh facts whose values can change over time. Reuse recent evidence for stable facts. Evidence may be reused across a resumed Plan chat while it remains relevant and sufficiently fresh; freshness policy can vary by fact type.
- **D-08:** Show links to the sources used beneath the relevant assistant reply. Research claims and explanation belong in the assistant's natural-language response; do not return links without an explanation.

#### Candidate results, Plan authority, and memory
- **D-09:** Destination-discovery requests keep the current structured candidate results and add Claude's source-grounded explanation. Research responses do not themselves select a destination or make any other durable Plan change.
- **D-10:** Use relevant existing structured Plan context where it helps interpret or tailor research. This phase does not add personal-memory RAG, vector search, or new long-term-memory behavior.

#### Agent/frontend boundary and trust
- **D-11:** A prompt or skill may guide Claude's research behavior, but explicit search and page-reading tools retrieve the evidence. Claude must receive the retrieved evidence before composing the answer.
- **D-12:** Stream assistant-visible answer text and approved source references through the existing chat contract. Keep internal reasoning, tool activity, raw provider/page payloads, credentials, and personal memory contents out of browser events and persisted checkpoints.
- **D-13:** Treat retrieved web content as untrusted evidence, never as instructions to follow or authority to call tools or change a Plan. Preserve run ordering and interruption behavior so obsolete research cannot surface after newer traveler input.

### the agent's Discretion
- Choose the concrete bounded pass count, query-refinement policy, tool-call contract, extraction limits, evidence freshness representation, and short-term evidence reuse/cache design after inspecting current SDK/MCP support.
- Decide whether an Anthropic skill artifact is supported and useful for this deployed Claude SDK path; the retrieval tools remain the actual source of web data.
- Keep evidence compact and Plan-scoped. Do not persist raw provider payloads, full-page bundles, or reasoning in a checkpoint. A safe mechanism for reusing source evidence after resumption is open to the phase researcher/planner.

### Deferred Ideas (OUT OF SCOPE)
- Personal-memory RAG, vector databases, unstructured memory search, and new long-term-memory behavior.
- New research UI, context drawers, or frontend layout work.
- Autonomous destination selection, silent Plan mutations, booking, and supplier actions.
- Expanding to non-country/place topics or other research providers.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|---|---|---|
| DISC-06 | Full-screen Plan chat loads existing Plan message history. | Existing chat/context path remains the UI contract; no redesign in this phase. |
| DISC-07 | Replies stream incrementally in order. | Existing SSE text projection can be reused for final synthesis text; never stream retrieval internals. |
| DISC-09 | Allow-listed source references appear with the reply. | Current response projection already attaches bounded HTTPS source refs; extend to citations whose pages were actually read. |
| DISC-10 | Browser receives only approved assistant text, source references, and terminal metadata. | Preserve explicit service projection; keep research state/evidence private and bounded. |
| TRUST-04 | External content cannot instruct tools or mutate Plan; only validated text/references cross stream. | Keep web text as untrusted evidence and separate retrieval tool allow-list from Plan mutation capabilities. |
</phase_requirements>

## Summary

Use the existing Python `AgentGraph` and Claude adapter as the single orchestration path. The live graph currently routes `conversation → research → END`; the research node is candidate-focused and no post-retrieval Claude answer/sufficiency pass exists. Extend the graph with explicit bounded control flow so the model reviews normalized page evidence, may request a better-targeted search while budget remains, and otherwise synthesizes a supported answer with uncertainty. `[VERIFIED: services/agent/graph/builder.py:16-35; services/agent/graph/nodes/research.py:33-95]`

Keep search and page extraction in the private research MCP. Tavily documents separate search and extract operations and per-URL failed results; select a small relevant URL set, read those pages, and pass compact normalized excerpts plus read status, source identity, and retrieval time to Claude. Never treat an unread search result snippet as inspected evidence. The exact pass, URL, text, and freshness bounds are product/implementation choices; enforce them deterministically in graph/tool code rather than relying on prompt instructions. [CITED: https://docs.tavily.com/documentation/api-reference/endpoint/extract] [CITED: https://docs.langchain.com/oss/python/langgraph/graph-api]

**Primary recommendation:** Add model evidence-review/synthesis calls and conditional loop routing in LangGraph; add bounded automatic page extraction to the existing private MCP; validate citations against successful read evidence before projection; preserve current candidate snapshots for destination discovery. No personal-memory/RAG package is needed.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|---|---|---|---|
| Search, URL validation, page extraction, normalization | Private Connector/MCP | Agent | Provider credentials and external web calls stay server-side; model receives normalized evidence only. |
| Sufficiency, targeted refinement, synthesis | Agent service / LangGraph | Claude adapter | The graph owns limits, ordering, cancellation and checkpointing; Claude supplies structured decisions and answer prose. |
| Evidence and citation checks | Agent service | MCP | Agent validates every cited ID/status before browser projection; MCP preserves source/read metadata. |
| Browser stream and links | Existing chat contract | Frontend | Reuse assistant text and approved source references; no new research-progress UI. |
| Durable Plan choices | CRUD backend + traveler | — | Research never selects a destination or mutates Plan requirements. |

## Standard Stack

| Component | Version/choice | Purpose | Evidence |
|---|---|---|---|
| LangGraph | Existing Python dependency; selected in 10-AI-SPEC | Own one bounded loop and Plan-scoped execution. | `[VERIFIED: services/agent/graph/builder.py:26-35]`; [LangGraph Graph API](https://docs.langchain.com/oss/python/langgraph/graph-api) |
| Anthropic Python SDK | Existing `AsyncAnthropicBedrock` adapter | Claude decisions and synthesis. | `[VERIFIED: services/agent/claude/messages.py:11, 134-195]`; [SDK](https://github.com/anthropics/anthropic-sdk-python) |
| Tavily Search + Extract API | Existing private Tavily service plus Extract endpoint | Search pages and retrieve their actual text, including explicit failures. | `[VERIFIED: services/mcps/research_server.py:250-275]`; [Extract API](https://docs.tavily.com/documentation/api-reference/endpoint/extract) |
| Pydantic / typed state | Existing request contracts and `AgentState` | Validate model decisions, retrieval outcomes, evidence refs, and response projection. | `[VERIFIED: services/agent/http_contracts.py:9-43; services/agent/state/contracts.py:11-33]` |

Do not add a second agent runtime or a new RAG/vector store. No external package addition is indicated by this phase; use the repository lock and existing dependencies.

## Architecture Patterns

### Current seams

- `AgentGraph` currently creates only `ConversationNode` and `ResearchNode`, with a single post-research `END` edge. `[VERIFIED: services/agent/graph/builder.py:26-35]`
- `ConversationNode` builds `TurnContext`, invokes `complete_conversation`, and routes `question`, `research`, or `respond`; this initial model call currently streams text before retrieval. `[VERIFIED: services/agent/graph/nodes/conversation.py:12-79]`
- `ResearchNode` calls one MCP `research` method, requires candidates, optionally resolves map locations, and returns `shortlist_ready`; adapt it or add distinct generic retrieval/evidence-review/synthesis nodes without regressing candidate flow. `[VERIFIED: services/agent/graph/nodes/research.py:33-95]`
- The MCP uses Tavily `/search` with `include_answer=False` and `include_raw_content=False`; current detail retrieval is an explicit source inspection path, not automatic page reading. `[VERIFIED: services/mcps/research_server.py:250-260; services/agent/service.py:140-174]`
- `AgentTurnService` emits SSE text deltas and terminal metadata, attaches sources, and handles interruption/generation ordering. Citation attachment must use the synthesis result's validated sources, not only candidate evidence. `[VERIFIED: services/agent/service.py:304-365,428-458]`

### Recommended bounded loop

`conversation/intent → search → extract selected pages → validate/normalize evidence → Claude evidence review → (targeted search while under cap AND concrete gap) OR synthesis → citation/read-status validation → existing stream/projection`

Represent the hard search-pass budget in graph state, increment it in deterministic code, and route to synthesis whenever it is spent. Also bound independent dimensions: query size, URLs/page count per pass, extracted characters/tokens, retained evidence entries, model output, and total graph steps. LangGraph offers conditional edges and runtime recursion controls; use a domain pass counter as the product limit, with graph recursion as a backstop. [CITED: https://docs.langchain.com/oss/python/langgraph/graph-api]

Do not stream model “answer” prose from the initial conversation decision when research is needed: it precedes evidence and can be displayed as unsupported claims. Stream only final synthesis text after evidence validation (or clearly labeled non-factual clarification/acknowledgment). A citation reference is valid only if its evidence ID belongs to this Plan/run and has successful page-read status. Read failures remain visible as limitations but are not eligible evidence. Keep returned candidate set stable while adding source-grounded explanation.

### Tavily boundary

Tavily Extract accepts explicit URLs (up to 20 in one request) and returns `results` and `failed_results`; the phase should set a lower application cap and extraction-size cap. Search first, choose relevant results, then extract; Tavily describes this two-step approach as allowing source curation, while including raw content in search retrieves content for irrelevant pages too. Treat extracted text as untrusted data, delimit it from instructions, and prevent it from changing tool permissions or Plan state. [CITED: https://docs.tavily.com/documentation/api-reference/endpoint/extract] [CITED: https://help.tavily.com/articles/3363168593-extracting-web-content-using-tavily]

### Claude structured-output endpoint caveat

Current code uses `AsyncAnthropicBedrock(...).messages.create(...)` for Claude JSON decisions and parses/validates JSON itself; it does not currently set a strict output schema. `[VERIFIED: services/agent/claude/messages.py:134-195,293-306]` AWS documents Claude structured outputs through Bedrock Runtime Converse/ConverseStream or InvokeModel; `output_config.format` is rejected on the `bedrock-mantle` Anthropic Messages API path. Therefore do not assume the SDK’s `messages.create` route gains constrained decoding just because Claude on Bedrock supports structured outputs. Keep deterministic JSON parsing/schema validation unless implementation deliberately selects and verifies a compatible Runtime API path. [CITED: https://docs.aws.amazon.com/bedrock/latest/userguide/claude-messages-structured-outputs.html] [CITED: https://docs.aws.amazon.com/bedrock/latest/userguide/endpoints.html]

### State and checkpoint limits

`AgentState` currently includes message/context, candidate/evidence lists, and `research_state`; checkpoint code allow-lists persisted keys, excludes tokens/raw payload keys, derives an opaque traveler+Plan thread ID, and rejects serialized state above 50,000 bytes. `[VERIFIED: services/agent/state/contracts.py:11-33; services/agent/checkpoint.py:14-45]` Store only compact normalized evidence or opaque evidence references with title/URL/read status/retrieved timestamp/expiry needed for fresh reuse. Do not checkpoint full HTML/page bundles, raw Tavily responses, hidden reasoning, or auth tokens. Existing checkpoint allow-list must be intentionally extended if reuse metadata is checkpointed. LangGraph persistence is thread-scoped and checkpoints graph state; it does not itself guarantee that arbitrary retained evidence is fresh, relevant, or safe. [CITED: https://docs.langchain.com/oss/python/langgraph/persistence]

## Don't Hand-Roll

| Problem | Avoid | Use |
|---|---|---|
| Graph routing and state transitions | Custom recursive Python driver outside graph | Existing LangGraph conditional routing and explicit counter. |
| Search-page extraction | Treating search snippets as article contents or writing a broad scraper | Tavily Extract through private MCP; expose explicit failed-read results. |
| Citation eligibility | Trusting model-generated arbitrary URLs/IDs | Deterministic allow-list from current Plan/run evidence with successful reads. |
| Durable Plan updates | Agent changing CRUD-owned destination/requirements | Existing explicit traveler-owned Plan flow; research stays read-only. |

## Common Pitfalls

1. **Unsupported early stream:** initial Claude text starts streaming before evidence retrieval. Route factual questions through evidence first; assert no factual synthesis delta precedes successful reads.
2. **Nominal loop cap only:** LangGraph recursion limits do not define the requested research-pass budget. Count provider search passes and test the cap independently; keep recursion limit as safety fallback.
3. **Snippet laundering:** search snippets or page metadata are cited as if full page text was read. Track read status per URL and exclude failed/unread pages from citation eligibility.
4. **Citation laundering:** model invents a URL/evidence ID or cites an unrelated read page. Validate citation IDs and association; test unsupported and mismatched citations.
5. **Checkpoint bloat/privacy:** full page text or hidden reasoning grows checkpoint rows or crosses projection boundaries. Persist only small allow-listed facts/refs and enforce current size guard.
6. **Endpoint/schema mismatch:** assuming strict JSON mode works through every Bedrock Anthropic endpoint. Confirm exact model, endpoint and SDK request path before enabling constrained output.
7. **Superseded run output:** a refinement pass completes after stop/newer event and appears as current. Preserve event/generation checks around each async retrieval/model return and before every stream projection.

## Validation Architecture

Repository pattern is `pytest`; current relevant suites are `services/agent/tests` and `services/mcps/tests`. Existing focused fixtures cover graph routing/token isolation, source lookup, expired evidence, candidate preservation, checkpoint allow-list/size, API streaming and provider parsing. `[VERIFIED: services/agent/tests/test_agent_graph.py; services/agent/tests/test_agent_checkpoint.py; services/agent/tests/test_agent_api.py; services/mcps/tests/test_research_security.py; services/mcps/tests/test_mcp_tools.py]`

| Requirement | Planned deterministic check | Existing location / gap |
|---|---|---|
| DISC-06/07/09/10 | Keep chat order/stream protocol; citations appear with assistant answer and only approved fields cross boundary. | `services/agent/tests/test_agent_api.py`; add synthesis stream/source cases. |
| TRUST-04 | Page prompt injection cannot call non-research tools or alter candidate/Plan data. | `services/mcps/tests/test_research_security.py`, `services/agent/tests/test_agent_graph.py`; add adversarial page fixture. |
| Evidence loop | Search→read→review order, concrete targeted refinement, hard cap, cap exhaustion partial answer. | Add fixture-backed graph-node tests; no live Tavily/Bedrock in normal CI. |
| Citation/read quality | Only successfully read current-run evidence IDs project; conflicts/unavailable pages yield both sources/limitations. | Add deterministic validator tests plus calibrated judge/human review outside core CI. |
| Fresh reuse/interruption | Stable recent evidence may be reused; stale facts refresh; cancelled/superseded generations cannot publish. | Extend checkpoint and API stream tests using clock/model/MCP fakes. |

Suggested quick validation: `uv run pytest services/agent/tests services/mcps/tests -q`. Add focused deterministic tests before/with implementation; keep provider-backed smoke/evaluation opt-in. The eval plan in `10-AI-SPEC.md` provides domain criteria and fixtures; hosted trace/eval integration is proposed and not currently present.

## Project Constraints (from AGENTS.md)

- Before any frontend change/frontend design session/backend CRUD change, read and follow `docs/skills/travella-testing/SKILL.md`; this phase has no UI redesign or CRUD mutation work.
- The CRUD backend exclusively owns durable Plan data; no direct Agent/Connector mutation bypass.
- Agent/Connector services authorize through authenticated service contracts and token-derived traveler identity.
- Browser projections exclude tokens, credentials, verification codes, raw provider payloads, and internal reasoning.
- Preserve event idempotency/order, stale-run suppression, checkpoint versioning, allow-listed projection, and explicit traveler control.
- Use a GSD workflow before repo edits; this research artifact is part of Phase 10 planning.

## Sources

- [LangGraph Graph API](https://docs.langchain.com/oss/python/langgraph/graph-api) — graph state, conditional routing, recursion handling.
- [LangGraph persistence](https://docs.langchain.com/oss/python/langgraph/persistence) — thread-scoped checkpoints.
- [Tavily Extract API](https://docs.tavily.com/documentation/api-reference/endpoint/extract) — page extraction and failed URL outcomes.
- [Tavily search/extraction guidance](https://help.tavily.com/articles/3363168593-extracting-web-content-using-tavily) — select before extracting.
- [AWS Bedrock Claude structured outputs](https://docs.aws.amazon.com/bedrock/latest/userguide/claude-messages-structured-outputs.html) — supported Runtime APIs and mantle limitation.
- [AWS Bedrock endpoints](https://docs.aws.amazon.com/bedrock/latest/userguide/endpoints.html) — API surfaces by endpoint.
- [Anthropic Python SDK](https://github.com/anthropics/anthropic-sdk-python) — existing SDK adapter.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|---|---|---|
| A1 | Short-term evidence reuse can be implemented using compact metadata/retrieval references supported by the current checkpoint and MCP design. | State and checkpoint limits | Could require a separate Plan-scoped cache or no reuse in the first release. |
| A2 | Existing candidate-focused tool can be extended or paired with a generic country/place research tool without breaking current candidate contracts. | Current seams | Tool contract and routing shape may need broader redesign during planning. |

## Open Questions for Planning

1. Set concrete per-turn search-pass, pages-per-pass, extraction-character/token, evidence-retention, and freshness bounds.
2. Decide storage/retrieval shape for resumable short-term evidence: compact checkpoint entries versus opaque registry IDs with scoped lookup.
3. Specify Claude's structured decision schema and validate the exact deployed Bedrock endpoint/API/model compatibility.
4. Define source-quality classification policy for official rules and reputable travel guidance, plus when high-consequence questions require clarification.
