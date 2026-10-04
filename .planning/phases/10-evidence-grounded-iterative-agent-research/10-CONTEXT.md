# Phase 10: Evidence-grounded iterative agent research - Context

**Gathered:** 2026-10-04  
**Status:** Ready for planning

<domain>
## Phase Boundary

Give the Plan chat an evidence-grounded research loop for factual questions about any country or place. The agent searches the web, reads relevant linked-page content, passes normalized evidence to Claude, lets Claude decide whether a better-targeted follow-up search is needed within a small per-turn limit, then streams a useful conversational answer with links to sources it used. If the request is destination discovery, preserve the existing structured candidate results alongside the explanation.

This phase improves the Agent/research tool path and its response contract. It does not redesign the chat UI, add a personal-memory RAG system, change durable Plan requirements, or add booking behavior. Research does not silently mutate a durable Plan; the traveler remains in control of destination selection and other consequential changes.

</domain>

<decisions>
## Implementation Decisions

### Research behavior
- **D-01:** Research factual questions about any country or place, not only destination-shortlist prompts. Normal conversational follow-ups can use relevant evidence already available without searching again.
- **D-02:** Read relevant content from linked pages before using those pages as evidence. If a page cannot be read, flag that limitation; do not present its search snippet as though the page was inspected.
- **D-03:** Claude receives normalized retrieved evidence and decides whether it is sufficient. It may request a better-targeted follow-up search for a small, bounded number of passes; the exact per-turn cap and query strategy are implementation decisions for research/planning.
- **D-04:** When the research budget is exhausted, answer with the supported information and clearly state what remains uncertain. Do not fill evidence gaps with unattributed general knowledge.
- **D-05:** If sources disagree, explain the disagreement and cite both sources rather than silently choosing one.
- **D-06:** Prefer official sources for rules and requirements; use reputable sources for travel advice.
- **D-07:** Refresh facts whose values can change over time. Reuse recent evidence for stable facts. Evidence may be reused across a resumed Plan chat while it remains relevant and sufficiently fresh; freshness policy can vary by fact type.
- **D-08:** Show links to the sources used beneath the relevant assistant reply. Research claims and explanation belong in the assistant's natural-language response; do not return links without an explanation.

### Candidate results, Plan authority, and memory
- **D-09:** Destination-discovery requests keep the current structured candidate results and add Claude's source-grounded explanation. Research responses do not themselves select a destination or make any other durable Plan change.
- **D-10:** Use relevant existing structured Plan context where it helps interpret or tailor research. This phase does not add personal-memory RAG, vector search, or new long-term-memory behavior.

### Agent/frontend boundary and trust
- **D-11:** A prompt or skill may guide Claude's research behavior, but explicit search and page-reading tools retrieve the evidence. Claude must receive the retrieved evidence before composing the answer.
- **D-12:** Stream assistant-visible answer text and approved source references through the existing chat contract. Keep internal reasoning, tool activity, raw provider/page payloads, credentials, and personal memory contents out of browser events and persisted checkpoints.
- **D-13:** Treat retrieved web content as untrusted evidence, never as instructions to follow or authority to call tools or change a Plan. Preserve run ordering and interruption behavior so obsolete research cannot surface after newer traveler input.

### the agent's Discretion
- Choose the concrete bounded pass count, query-refinement policy, tool-call contract, extraction limits, evidence freshness representation, and short-term evidence reuse/cache design after inspecting current SDK/MCP support.
- Decide whether an Anthropic skill artifact is supported and useful for this deployed Claude SDK path; the retrieval tools remain the actual source of web data.
- Keep evidence compact and Plan-scoped. Do not persist raw provider payloads, full-page bundles, or reasoning in a checkpoint. A safe mechanism for reusing source evidence after resumption is open to the phase researcher/planner.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.** The decisions in this context are the product source of truth for Phase 10. Older docs below are background for existing contracts; where their research behavior conflicts with D-01–D-13, this context wins.

### Product scope and constraints
- `.planning/ROADMAP.md` — Phase 10 goal and success criteria.
- `.planning/PROJECT.md` — Plan authority, privacy, service ownership, and resilience constraints.
- `.planning/REQUIREMENTS.md` — Relevant existing conversation and trust requirements, especially DISC-06–DISC-10 and TRUST-04–TRUST-05.

### Existing service contracts and domain background
- `docs/planning/mvp-phase-1-service-contracts.md` — authenticated Plan-scoped service boundaries, event ordering, and durable-data ownership. Use as implementation background, not as authority for Phase 10's broader research behavior.
- `docs/user-stories/agentic-plan-research/README.md` — current candidate/evidence domain model and travel-research terminology. Older candidate-only, on-demand source-panel, and retention assumptions do not override this phase's decisions.

### Live implementation integration points
- `services/agent/graph/builder.py` — current graph has one conversation stage, one research stage, then END; the synthesis/refinement path is missing.
- `services/agent/graph/nodes/conversation.py` — current Claude conversation decision and streamed assistant text.
- `services/agent/graph/nodes/research.py` — current one-pass candidate research and map resolution.
- `services/agent/service.py` — Plan context, candidate actions, source inspection, source attachment, and response/SSE projection.
- `services/agent/claude/adapter.py` — current model and MCP adapter boundary.
- `services/mcps/research_server.py` — Tavily candidate search and Plan/run-scoped source excerpt retrieval; current search does not read linked pages.
- `frontend/src/features/plans/components/PlanConversation.jsx` — existing chat streaming and source-link presentation; Phase 10 does not redesign this UI.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `AgentGraph` in `services/agent/graph/builder.py` already owns a Plan-scoped LangGraph with conditional routing and streaming callbacks.
- `ConversationNode` and the Claude adapter already build bounded conversational context from current Plan data and recent messages.
- The private research MCP already calls Tavily, normalizes result evidence, issues Plan/run-scoped evidence IDs, and exposes a separate source-detail tool.
- `AgentTurnService` already validates current candidate actions and attaches allow-listed source references to assistant responses.
- The frontend already streams assistant text and renders links beneath their reply.

### Established Patterns
- Agent calls are authorized with traveler/Plan scope and the caller's verified token; browser does not call Tavily or MCP directly.
- Candidate snapshots and evidence references are bounded and normalized before browser projection.
- Research text is currently streamed from the initial conversation call. There is no post-retrieval Claude synthesis call, and the graph currently ends after one research node.
- The current Tavily search sets `include_answer` and `include_raw_content` to false. `get_candidate_sources` returns stored excerpts on an explicit inspect action; it does not fetch page contents for automatic synthesis.
- The project requires source content to remain untrusted and forbids raw provider payloads, credentials, and internal reasoning from leaking to browser projections or checkpoints.

### Integration Points
- Extend the Agent graph/orchestration path so evidence returns to Claude for sufficiency evaluation, bounded query refinement, and final synthesis.
- Extend the private research tool boundary to read relevant page content and return normalized evidence for the model, with safe unavailable-page outcomes.
- Preserve the existing candidate projection for destination discovery while adding an assistant answer and citations to the same turn response.
- Reuse the existing Plan-scoped state and event cancellation/order controls; keep structured Plan changes owned by CRUD and explicit traveler action.

</code_context>

<specifics>
## Specific Ideas

- Desired experience: a knowledgeable travel researcher in a plain GPT-like Plan chat. It should explain what it found, use links as evidence for the answer, and continue researching when it identifies a specific evidence gap.
- The loop is: traveler message and relevant Plan context → search → read useful page content → evidence returned to Claude → Claude either refines the research within a small limit or answers with cited links and uncertainty.
- No interface for research progress or tool traces is requested. Keep the existing full-chat presentation.
- Relevant stable Plan context can inform research. Personal preferences remain structured context; this is not a personal-memory RAG feature.

</specifics>

<deferred>
## Deferred Ideas

- Personal-memory RAG, vector databases, unstructured memory search, and new long-term-memory behavior.
- New research UI, context drawers, or frontend layout work.
- Autonomous destination selection, silent Plan mutations, booking, and supplier actions.
- Expanding to non-country/place topics or other research providers.

</deferred>

---

*Phase: 10-evidence-grounded-iterative-agent-research*  
*Context gathered: 2026-10-04*
