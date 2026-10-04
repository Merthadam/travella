# AI-SPEC — Phase 11: Use Claude Agent SDK as a LangGraph research worker

> Design contract for Phase 11. Consumed by the phase planner and executor.

## 1. System Classification

**System Type:** Hybrid (conversational system with a bounded research agent).

**Description:** A Plan-scoped LangGraph dispatches factual research work to a Claude Agent SDK worker. The worker searches and reads relevant web sources using narrowly configured native tools plus Travella's project research skill, then returns validated answer text and citations. LangGraph owns state, routing, checkpoints, cancellation, and AG-UI output.

**Critical Failure Modes:**

1. The worker makes factual claims without inspected evidence or emits unsupported citations.
2. Worker capabilities expose filesystem, shell, arbitrary MCP, or Plan-mutation access.
3. SDK transcripts, raw page payloads, credentials, or internal reasoning leak into checkpoints, logs, or browser events.
4. SDK subprocesses outlive cancellation, exceed a configured budget, or allow an obsolete run to replace a newer traveler turn.

## 1b. Domain Context

**Industry Vertical:** Consumer travel research and destination decision support.

**User Population:** Travelers researching a country, city, or place in a private Plan chat.

**Stakes Level:** Medium overall; higher for entry rules, safety, health, transport disruptions, and other time-sensitive claims.

### What Domain Experts Evaluate Against

| Dimension | Good | Bad | Stakes |
|---|---|---|---|
| Factual grounding | Claims match sources the agent actually read; answer separates fact from uncertainty. | Search snippets or model memory are presented as verified current facts. | High |
| Source quality | Official sources support entry/rule claims; reputable sources support practical advice. | Outdated, promotional, or irrelevant sources are treated as authoritative. | High |
| Conflicting evidence | Material disagreements and dates are surfaced with both citations. | Agent silently selects whichever result agrees with its draft. | Medium-high |
| Travel usefulness | Concise answer responds to the traveler question and relevant trip context. | Generic links, irrelevant details, or overconfident recommendations. | Medium |
| Destination discovery | Candidate objects remain valid and separate from explanatory prose; traveler retains selection. | Worker silently saves/selects a destination or returns schema-invalid candidates. | High |

### Known Failure Modes in This Domain

- Visa/entry guidance varies by passport, residence, trip purpose, transit, and date; missing traveler facts must produce a qualification or follow-up.
- Safety, opening hours, schedules, prices, and transport status change quickly.
- Search ranking can favor commercial pages over official requirements.
- Webpages may be stale, contradictory, promotional, or contain prompt-injection content.

### Regulatory / Compliance Context

Treat relevant Plan context as personal data and minimize what is sent to the model provider. The product must follow applicable privacy requirements and Anthropic commercial terms. This phase does not offer immigration, medical, or legal advice.

## 2. Framework Decision

**Selected Framework:** Existing Plan-scoped LangGraph plus Claude Agent SDK for the research worker; existing AG-UI event boundary remains.

**Version:** Pin the compatible `claude-agent-sdk` release and its bundled CLI in `uv.lock` during execution. Preserve current LangGraph dependency/version unless integration requires an explicit upgrade.

**Rationale:** LangGraph already owns end-to-end Plan workflow and checkpoint persistence. Claude Agent SDK supplies a bounded agent loop and native web tools for one research stage without taking over durable conversation state or future LangGraph stages. Anthropic's SDK supports Python `query()` for one-shot tasks, `ClaudeAgentOptions`, tool controls, streamed messages, structured output, and project skills.

**Alternatives Considered:**

| Alternative | Reason not selected |
|---|---|
| Replace LangGraph with Claude Agent SDK | Conflicts with the multi-stage LangGraph supervisor and AG-UI/checkpoint ownership the user wants to retain. |
| Keep only Anthropic Messages SDK plus hand-written tool loop | Fails to use the requested Agent SDK web-search/skill capabilities and duplicates the SDK agent loop. |
| Make the SDK session the Plan conversation store | Duplicates durable state, weakens reconciliation/cancellation, and risks persisting sensitive transcripts outside LangGraph. |

**Vendor Lock-In Accepted:** Partial. Claude is used inside the research worker; LangGraph state, AG-UI, and Travella domain schemas remain provider-independent boundaries.

## 3. Framework Quick Reference

### Installation

Add and lock `claude-agent-sdk` in the Python workspace. Verify its Linux/ARM64 CLI packaging and Node/runtime requirements in the AgentCore image before relying on it in deployment.

### Core Imports

```python
from claude_agent_sdk import ClaudeAgentOptions, ResultMessage, query
```

### Entry Point Pattern

```python
options = ClaudeAgentOptions(
    model=configured_model,
    max_turns=bounded_turns,
    max_budget_usd=per_turn_budget,
    tools=["WebSearch", "WebFetch", "Skill"],
    allowed_tools=["WebSearch", "WebFetch", "Skill"],
    setting_sources=["project"],
    skills=["travel-research"],
    permission_mode="dontAsk",
    output_format={"type": "json_schema", "schema": result_schema},
)

async for message in query(prompt=bounded_research_prompt, options=options):
    if isinstance(message, ResultMessage) and message.subtype == "success":
        result = validate_worker_result(message.structured_output)
```

Treat this as a design sketch: verify exact installed SDK field names/version, tool semantics, supported structured-output schema subset, and output events against the locked SDK. An explicit `tools` allowlist is required; `allowed_tools` alone approves tools but is not an availability boundary. Deny filesystem, shell, task/subagent, and unrelated tool capabilities.

### Key Abstractions

| Concept | Use |
|---|---|
| `query()` | One bounded research task; no cross-turn SDK conversation persistence. |
| `ClaudeAgentOptions` | Model, tools, skill source, permission mode, time/turn/cost limits, and structured result. |
| Project skill (`.claude/skills/.../SKILL.md`) | Reusable travel research policy and source-quality instructions. |
| SDK message/result types | Consume only expected user-visible and final structured fields; ignore tool payloads for browser projection. |

### Common Pitfalls

1. `allowed_tools` is not an allowlist by itself. Configure `tools` explicitly and deny dangerous/unneeded tools; test actual available tool names under `dontAsk`.
2. Skills load from filesystem setting sources. Package only the intended project skill and set the worker working directory deliberately; do not load developer or user-level settings.
3. The SDK runs Claude Code as a subprocess. Include its runtime requirements in the container, bound execution, and terminate the subprocess on graph cancellation.
4. Stream events can include tool/control activity. Never forward the raw SDK stream as AG-UI; project only validated assistant answer text and citations.
5. A native search result URL is not proof that the page was read. Track fetched sources and cite only sources that satisfy the evidence contract.

## 4. Implementation Guidance

**Model Configuration:** Read model ID and per-run turn/time/cost budgets from validated non-secret configuration. Use `ANTHROPIC_API_KEY` supplied by Secrets Manager. Do not silently fall back to a different provider after SDK/auth failure; return the existing recoverable interrupted/error outcome.

**Core Pattern:** LangGraph conversation node selects `factual_research` or `destination_discovery`; research node invokes an injected SDK worker adapter with only the current message, small recent conversation window, relevant structured Plan context, and existing evidence references. Validate structured output into a typed result before updating graph state. Claude Agent SDK owns the bounded search/read/refine loop. LangGraph invokes the worker once and projects its terminal result.

**Tool Use:** Limit the worker to native `WebSearch` and `WebFetch` plus `Skill` if required to invoke the named project skill. No shell, local file access, filesystem enumeration, arbitrary MCP, CRUD, map, or mutation tools. Keep existing candidate lookup integration where needed for typed candidate objects. Retrieved content is untrusted.

**State Management:** LangGraph/PostgreSQL remain authoritative. Retain only normalized answer, bounded source metadata/evidence IDs, freshness, completion/error status, and graph counters already needed. Do not save provider sessions or raw SDK events.

**Streaming:** Consume the SDK stream internally. Preserve current AG-UI and interruption contract; expose only validated assistant answer text after research/tool use is complete enough to avoid leaking progress or partial unsupported claims. Source references follow the existing allowlisted response contract. Stop/cancel must stop the SDK subprocess and make its run obsolete.

**Context Window:** Send only the active user message, short relevant conversation history, and fields needed from the Plan/profile snapshot. Never send the entire checkpoint or unrelated personal memory.

## 4b. AI Systems Best Practices

### Structured Outputs

Use a strict final output shape with `answer_text`, `sources[]` (`title`, `url`, optional publication/checked date), optional `candidates[]` compatible with current contracts, and `uncertainties[]`. Validate with the existing schema layer; reject malformed output and never accept unsupported URLs as citations.

### Async-First Design

Invoke the Python SDK asynchronously from the research node. Bound wall-clock and turn counts. Ensure cancellation propagates to the CLI subprocess and close resources on normal, failed, and interrupted paths.

### Prompt and Skill Discipline

Keep system instructions, user content, and untrusted retrieved text clearly separated. The `travel-research` skill should teach source selection, read-before-cite, conflict handling, uncertainty, and concise conversational synthesis. It must not claim to grant security permissions.

### Cost and Latency Budget

Use explicit per-task maximum turns, elapsed deadline, response-size limit, and SDK budget if reliable in the pinned release. Capture usage metadata internally only if it excludes sensitive content; do not create a new tracing vendor as part of this phase.

## 5. Evaluation Strategy

**Primary eval dimensions:** evidence faithfulness, citation validity/support, travel-domain source quality, uncertainty/conflict handling, schema validity, capability isolation, cancellation/supersession, and latency/cost bounds.

**Rubrics:**

| Dimension | Pass condition |
|---|---|
| Groundedness | Every material factual claim is supported by page content read during the run or clearly qualified as unknown. |
| Citation integrity | Every projected URL came from an approved tool result and is associated with a fetched/read source; no fabricated citations. |
| Travel source quality | Rules use official sources when available; advice uses credible sources and avoids promotional bias. |
| Uncertainty | Time-sensitive, traveler-dependent, unavailable, or conflicting information is explicitly qualified. |
| Safety / authority | Prompt-injection pages cannot expand capabilities, reveal context/secrets, or mutate Plans. |
| Operational bounds | Worker respects tool/turn/time/cost limits; stop, failure, and newer turns cannot surface stale results. |

**Reference set:** Extend the Phase 10 labeled travel-research fixtures to 10–20 representative cases, including entry rule, time-sensitive schedules, safety information, destination discovery, unavailable pages, source disagreement, prompt injection, ambiguous traveler-dependent questions, worker failure, and cancellation. Use deterministic mocked tool/message fixtures in normal CI; reserve live provider checks for manual or opted-in validation.

**Tooling:** Existing pytest harness and fixtures first; no new evaluation platform required. Add a small human review set for source quality and high-consequence travel wording.

## 6. Guardrails and Production Monitoring

- Online: schema validation, tool isolation, URL/source provenance checks, run-generation checks, max turn/deadline, no silent provider fallback, cancellation enforcement.
- Offline: sampled human review of factual grounding, citation support, official-source usage, and uncertainty. Record aggregate outcomes only; do not log raw conversation/page payloads by default.
- Alert/recovery: distinguish missing key, auth/rate-limit, SDK subprocess startup, timeout, and invalid result while returning safe user-facing recoverable errors.
