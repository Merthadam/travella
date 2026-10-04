---
phase: 10-evidence-grounded-iterative-agent-research
verified: 2026-10-04T15:23:35Z
status: human_needed
score: 23/23 must-haves verified
covered_files:
  - .planning/REQUIREMENTS.md
  - .planning/phases/10-evidence-grounded-iterative-agent-research/10-01-PLAN.md
  - .planning/phases/10-evidence-grounded-iterative-agent-research/10-01-SUMMARY.md
  - .planning/phases/10-evidence-grounded-iterative-agent-research/10-02-PLAN.md
  - .planning/phases/10-evidence-grounded-iterative-agent-research/10-02-SUMMARY.md
  - .planning/phases/10-evidence-grounded-iterative-agent-research/10-03-PLAN.md
  - .planning/phases/10-evidence-grounded-iterative-agent-research/10-03-SUMMARY.md
  - .planning/phases/10-evidence-grounded-iterative-agent-research/10-04-PLAN.md
  - .planning/phases/10-evidence-grounded-iterative-agent-research/10-04-SUMMARY.md
  - .planning/phases/10-evidence-grounded-iterative-agent-research/10-05-PLAN.md
  - .planning/phases/10-evidence-grounded-iterative-agent-research/10-05-SUMMARY.md
  - .planning/phases/10-evidence-grounded-iterative-agent-research/10-06-PLAN.md
  - .planning/phases/10-evidence-grounded-iterative-agent-research/10-06-SUMMARY.md
  - .planning/phases/10-evidence-grounded-iterative-agent-research/10-AI-SPEC.md
  - .planning/phases/10-evidence-grounded-iterative-agent-research/10-CONTEXT.md
  - .planning/phases/10-evidence-grounded-iterative-agent-research/10-RESEARCH.md
  - services/agent/checkpoint.py
  - services/agent/claude/adapter.py
  - services/agent/claude/messages.py
  - services/agent/evals/fixtures/research_cases.json
  - services/agent/evals/test_research_eval.py
  - services/agent/graph/builder.py
  - services/agent/graph/nodes/conversation.py
  - services/agent/graph/nodes/research.py
  - services/agent/prompts/conversation-v1.md
  - services/agent/prompts/research-v1.md
  - services/agent/service.py
  - services/agent/state/contracts.py
  - services/agent/tests/test_agent_api.py
  - services/agent/tests/test_agent_checkpoint.py
  - services/agent/tests/test_agent_graph.py
  - services/agent/tests/test_agent_turn.py
  - services/agent/tests/test_local_mcp.py
  - services/agent/tests/test_model_provider.py
  - services/mcps/research_server.py
  - services/mcps/tests/test_mcp_tools.py
  - services/mcps/tests/test_research_security.py
covered_digest: "v1:sha256:ac2d9e539f223a96ab18ffaed08eb4732794f1dd85dcc34aadbce143270eade1"
behavior_unverified: 0
overrides_applied: 0
human_verification:
  - test: "Have a travel adviser/destination specialist, immigration or consular information specialist, travel-medicine clinician, and safety/security reviewer label the high-consequence reference cases before release."
    expected: "Review confirms applicability, audience/geographic scope, recency, official source choice, and clinician referral boundaries; critical misses are corrected and reviewed again."
    why_human: "The deterministic evaluation corpus checks case shape and required caveats, but cannot judge whether real answers and sources are domain-appropriate. The AI-SPEC and Plan 10-06 explicitly require specialist review."
  - test: "Run a factual country/place question in an authenticated environment with the configured Tavily and Claude providers."
    expected: "The answer follows successful page reads, source links support the adjacent explanation, and an unavailable or conflicting source is disclosed."
    why_human: "The submitted verification evidence covers offline fake-provider tests; live provider configuration and current external responses were not exercised."
---

# Phase 10: Evidence-grounded iterative agent research Verification Report

**Phase Goal:** A traveler can ask about any country or place and get a useful answer grounded in retrieved source content, with bounded iterative research, clear citations, and remaining uncertainty stated.
**Verified:** 2026-10-04T15:23:35Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|---|---|---|
| 1 | Factual country/place questions trigger research; relevant recent evidence may be reused across a resumed Plan chat, while time-sensitive facts are refreshed. | ✓ VERIFIED | `ResearchNode` routes factual intent through retrieval; `_reusable_evidence` checks same Plan, topic relevance, read status, explicit expiry, and fact-type age limits. `test_reusable_evidence_obeys_fact_type_freshness` and `test_research_node_answers_from_resumed_evidence_without_searching_again` exercise these transitions; full phase suite passed (121 tests). |
| 2 | Research reads relevant linked-page content where available; inaccessible pages are identified, and answer claims are grounded in evidence actually retrieved. | ✓ VERIFIED | `research_server.py` extracts explicitly selected HTTPS URLs and returns `read`/`unavailable`; `ResearchNode` passes read content to evidence review and validates cited IDs. `test_scoped_source_can_read_page_and_marks_failed_page_unavailable`, `test_unavailable_page_returns_limit_without_citation`, and `test_foreign_evidence_id_is_not_accepted_as_citation` cover the behavior. |
| 3 | Claude evaluates retrieved evidence and can make a bounded number of targeted follow-up searches before answering; source disagreements are explained with both sources cited. | ✓ VERIFIED | `ResearchDecision.parse` accepts only bounded answer/refine decisions and known evidence IDs; `builder.py` caps the loop at three search passes. `test_named_evidence_gap_allows_two_targeted_refinements_then_cites_both_conflicting_sources` and invalid/repeated-query tests exercise routing and cap behavior. |
| 4 | Replies stream as natural-language answers with supporting source links beneath the relevant reply; when evidence remains incomplete, the answer states what is uncertain. | ✓ VERIFIED | Claude synthesis feeds the existing text-delta stream; `service.py` attaches only validated cited reads to terminal metadata. `test_plan_stream_projects_only_cited_read_sources_beneath_the_answer` and graph cap/unavailable-page tests cover the response contract. Existing `PlanConversation` hydrates and renders per-message links; `PlansApp.test.jsx` covers full-page chat history and streaming integration. |
| 5 | Destination-discovery requests preserve structured candidates alongside the explanation, and no destination or other durable Plan data changes without explicit traveler action. | ✓ VERIFIED | Discovery candidate fields and order are retained through synthesis in `builder.py`/`ResearchNode`; factual research emits no unsolicited candidate list. `test_discovery_explanation_preserves_complete_candidate_snapshot_and_order`, `test_destination_refinement_preserves_initial_candidate_ids`, and read-only plan tests cover this. |
| 6 | A researched place answer is composed only after the private tool has returned successfully read page content. | ✓ VERIFIED | `ResearchNode` filters out non-read/empty pages before `_review`; `test_factual_place_question_does_not_enter_candidate_path` plus evidence-order tracer tests pass. |
| 7 | The graph returns a natural-language explanation and source identities while preserving the existing candidate response path. | ✓ VERIFIED | `AgentGraph.invoke` projects assistant text and validated read-source identities alongside shortlist candidates; candidate preservation tests pass. |
| 8 | Retrieved page text is passed to Claude as untrusted evidence and cannot expand the tool allow-list. | ✓ VERIFIED | Research prompt labels retrieved content untrusted; decisions are schema-validated and cannot name tools. `test_adversarial_page_text_cannot_change_candidates_or_enable_extra_tools` passes. |
| 9 | Search snippets are not represented as read-page evidence. | ✓ VERIFIED | The MCP returns search source metadata separately; extraction sets read status and content only on successful Tavily Extract results. `test_page_extraction_deduplicates_and_caps_selected_https_urls` and failed-read security fixtures pass. |
| 10 | Extraction selects a bounded relevant set of URLs and reports each unavailable page. | ✓ VERIFIED | MCP caps selected sources at three and reports explicit unavailable results; page and turn character limits are enforced by tests. |
| 11 | Rules prefer official sources and travel guidance prefers reputable publishers. | ✓ VERIFIED | `research_server.py` classifies hosts as advisory source quality without promoting the class to claim evidence; `test_source_quality_is_advisory_and_host_based` passes. |
| 12 | Claude may request a targeted follow-up only when it can name a concrete evidence gap. | ✓ VERIFIED | `ResearchDecision.parse` requires a nonempty gap and bounded query for `refine`; malformed/oversized decision fixtures are rejected. |
| 13 | A hard deterministic research-pass cap ends the loop with supported facts and stated uncertainty. | ✓ VERIFIED | `_after_research` routes only while pass count is below three; terminal synthesis records unsupported remainder. Named gap/cap and duplicate-refinement tests pass. |
| 14 | Conflicting sources are attributed and cited together. | ✓ VERIFIED | Synthesis retains both conflicting evidence IDs; the graph test for two conflicting sources verifies both citations. |
| 15 | The assistant explains findings and presents only relevant successfully read source links under that reply. | ✓ VERIFIED | API projection resolves cited IDs against read evidence; the SSE source projection test verifies reply-level placement and rejection of unread/foreign sources. |
| 16 | Only validated assistant text, approved HTTPS source references, and terminal metadata cross the existing chat stream. | ✓ VERIFIED | `service.py` constructs allow-listed stream events and `_validated_research_sources` checks current evidence, expiry, and HTTPS; API tests reject malformed URLs and unapproved IDs. |
| 17 | Destination candidates remain intact and synthesis cannot mutate the destination or other durable Plan data. | ✓ VERIFIED | Candidate snapshots are preserved and research uses no CRUD mutation path; graph and turn tests assert unchanged candidates and read-only behavior. |
| 18 | Relevant fresh evidence can support a follow-up after a Plan conversation resumes. | ✓ VERIFIED | The checkpoint persists a bounded research-state allow-list; graph reuse tests prove same-Plan resumed evidence is passed to Claude without another search. |
| 19 | Stale time-sensitive evidence is refreshed and stable evidence is reusable only while eligible. | ✓ VERIFIED | Freshness windows are 30 days (stable), 24 hours (rules/schedules), and 1 hour (live); fake-clock tests cover each class, expiry, and foreign/unread evidence. |
| 20 | Checkpoint state contains compact Plan-scoped evidence metadata, never raw pages or hidden reasoning. | ✓ VERIFIED | `safe_checkpoint_state` keeps only six read entries with 1,200-character excerpts, URL and timestamp checks, schema version 2, and a 50,000-byte ceiling. Checkpoint privacy/size tests pass. |
| 21 | Fixture-backed tests cover source faithfulness, high-consequence uncertainty, bounded tools, and useful explanations. | ✓ VERIFIED | The 20-case fixture has the required category counts and caveats; the evaluation harness checks corpus shape, safety annotations, and terminal contracts. **Limitation:** it validates deterministic fixture contracts, not model answer quality; specialist labeling is required below. |
| 22 | Prompt-injection content cannot invoke tools, leak private state, or mutate destination candidates. | ✓ VERIFIED | Adversarial graph/MCP/API fixtures assert tool allow-list isolation, candidate identity, and absence of private state in projections. |
| 23 | Cancelled or superseded research cannot publish obsolete text or links. | ✓ VERIFIED | `AgentTurnService` checks Plan generation before publishing. `test_superseded_research_cannot_emit_late_text_or_sources` exercises late completion suppression. |

**Score:** 23/23 truths verified (0 present, behavior-unverified)

## Required Artifacts

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `services/mcps/research_server.py` | Bounded private search/page extraction and read outcomes | ✓ VERIFIED | Substantive extraction and fail-closed normalization; connected through the Agent research adapter. |
| `services/agent/graph/nodes/research.py` | Evidence-first research, refinement, freshness reuse | ✓ VERIFIED | Retrieval, page-read filtering, evidence review, bounded answer path, reuse validation. |
| `services/agent/claude/messages.py` | Claude evidence review and synthesis adapter | ✓ VERIFIED | Receives normalized evidence; validates structured output locally. |
| `services/agent/graph/builder.py` | Bounded graph loop and browser-safe result projection | ✓ VERIFIED | Conditional route uses deterministic pass counter; projection includes only cited read-source identities. |
| `services/agent/service.py` | Validated SSE/source projection and stale-run protection | ✓ VERIFIED | Wired to graph output and generation authority before terminal response. |
| `services/agent/state/contracts.py` | Typed research decisions and bounded graph state | ✓ VERIFIED | Decision schema enforces action, query, citation, uncertainty, and text limits. |
| `services/agent/checkpoint.py` | Versioned safe evidence checkpoint projection | ✓ VERIFIED | Read-only bounded allow-list; raw evidence and secret fields are excluded. |
| `services/agent/evals/fixtures/research_cases.json` | 20 labeled sanitized cases | ✓ VERIFIED | 5 entry, 4 health/safety, 3 season/transport, 3 unread/conflict, 5 adversarial/control. |
| `services/agent/evals/test_research_eval.py` | Offline evaluation contract harness | ✓ VERIFIED | Substantive fixture schema/category/caveat assertions; no network or provider calls. |
| `services/agent/tests/test_agent_graph.py` | Research flow behavior coverage | ✓ VERIFIED | Covers ordering, bounds, conflicts, candidate integrity, freshness and adversarial content. |
| `services/agent/tests/test_agent_api.py` | Stream projection and interruption coverage | ✓ VERIFIED | Covers validated sources, event projection, and late superseded-run suppression. |
| `services/agent/tests/test_agent_checkpoint.py` | Checkpoint privacy, scope, size and freshness coverage | ✓ VERIFIED | Exercises bounded serialization and rejected evidence classes. |

## Key Link Verification

| From | To | Via | Status | Details |
|---|---|---|---|---|
| `ResearchNode` | private MCP `research_server.py` | authenticated research/source adapter | ✓ WIRED | `ResearchNode` calls `tools.research` and `tools.sources`; MCP extraction reads only scoped selected IDs. |
| `ResearchNode` | Claude messages adapter | normalized successfully read evidence before answer synthesis | ✓ WIRED | `_review` receives filtered `research_evidence`; prompt marks page text untrusted. |
| `AgentGraph` | `ResearchNode` | conditional research edge | ✓ WIRED | `_after_research` routes only validated `refine` with pass count below three. |
| `AgentGraph` | `AgentTurnService` | graph result projection to existing stream | ✓ WIRED | Service invokes graph and validates the returned source projection before SSE. |
| `AgentTurnService` | Plan conversation API | ordered assistant deltas, terminal status and approved sources | ✓ WIRED | Existing stream adapter receives text callbacks and returns validated source references. |
| `safe_checkpoint_state` | resumed research node | bounded Plan-scoped research state | ✓ WIRED | Checkpoint stores versioned entries; node rechecks Plan, relevance, read state, and freshness. |
| evaluation harness | `research_cases.json` | fixture-driven contracts | ✓ WIRED | Harness loads the colocated fixture file and validates count, category, and case fields. |

All six plan artifact checks passed (14/14 artifacts) and all six plan key-link checks passed (7/7 links).

## Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|---|---|---|---|---|
| MCP search/extraction | selected source IDs and normalized `content` | private Tavily Search and Extract responses | Yes; provider output validated, bounded, and failures returned unread | ✓ FLOWING |
| Research graph | `research_evidence` | current search result plus successful page extraction, or eligible same-Plan checkpoint evidence | Yes; unread pages and stale/foreign entries are omitted | ✓ FLOWING |
| Claude synthesis | validated answer and `evidence_ids` | evidence review response parsed against available IDs | Yes; malformed decisions fail closed | ✓ FLOWING |
| Graph projection | assistant text and source identities | terminal answer plus IDs matched to successfully read evidence | Yes; only matched IDs are projected | ✓ FLOWING |
| Browser stream | text deltas, approved HTTPS links, terminal status | `AgentTurnService` projection and existing SSE contract | Yes; tool data, raw page content, and reasoning are excluded | ✓ FLOWING |
| Checkpoint | compact evidence excerpt and provenance | allow-listed same-Plan read evidence | Yes; raw provider/page bundles excluded | ✓ FLOWING |

## Behavioral Spot-Checks

The orchestrator reported the full phase command as passed: `uv run pytest -q services/agent/evals services/agent/tests services/mcps/tests` — **121 passed**. Targeted Ruff checks also passed. This agent additionally ran the named spot-checks below individually; all passed. The full suite was not repeated.

| Behavior | Test | Result | Status |
|---|---|---|---|
| Page reads precede answer and unread pages cannot be cited | `uv run pytest -q services/mcps/tests/test_mcp_tools.py::test_scoped_source_can_read_page_and_marks_failed_page_unavailable` | 1 passed; also included in reported 121-test suite | ✓ PASS |
| Iterative search terminates at the bound and keeps both conflicting citations | `uv run pytest -q services/agent/tests/test_agent_graph.py::test_named_evidence_gap_allows_two_targeted_refinements_then_cites_both_conflicting_sources` | 1 passed; also included in reported 121-test suite | ✓ PASS |
| Only cited successfully read sources appear with the reply | `uv run pytest -q services/agent/tests/test_agent_api.py::test_plan_stream_projects_only_cited_read_sources_beneath_the_answer` | 1 passed; also included in reported 121-test suite | ✓ PASS |
| Superseded run cannot emit late text/source refs | `uv run pytest -q services/agent/tests/test_agent_api.py::test_superseded_research_cannot_emit_late_text_or_sources` | 1 passed; also included in reported 121-test suite | ✓ PASS |
| Resumed same-Plan evidence meets freshness rules | `test_research_node_answers_from_resumed_evidence_without_searching_again`; `test_reusable_evidence_obeys_fact_type_freshness` | Included in reported 121-test suite | ✓ PASS |
| Checkpoint retains bounded allow-listed evidence | `uv run pytest -q services/agent/tests/test_agent_checkpoint.py::test_checkpoint_persists_only_bounded_allowlisted_same_plan_evidence` | 1 passed; also included in reported 121-test suite | ✓ PASS |
| Twenty evaluation cases have expected categories and safety contracts | `uv run pytest -q services/agent/evals/test_research_eval.py::test_fixture_corpus_has_exact_required_count_and_category_mix` | 1 passed; also included in reported 121-test suite | ✓ PASS |

## Probe Execution

No probe-based checks are declared by this phase's plans or success criteria; no `scripts/*/tests/probe-*.sh` files were found.

| Probe | Command | Result | Status |
|---|---|---|---|
| None declared | — | Not applicable | ✓ PASS |

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|---|---|---|---|---|
| DISC-06 | 10-01, 10-04, 10-05, 10-06 | Full-screen Plan chat loads existing history | ✓ SATISFIED | Existing `PlanConversation` loads `conversationMessages`; frontend integration test `opening a Plan goes straight to full-page chat and streams a reply` verifies saved history appears. Phase 10 preserves this path. |
| DISC-07 | 10-01, 10-03, 10-04, 10-05, 10-06 | Ordered incremental assistant replies | ✓ SATISFIED | API/turn tests cover ordered text deltas and superseded-run suppression; the Plan chat renders incremental text events. |
| DISC-09 | 10-01, 10-02, 10-04, 10-06 | Allow-listed inline source references | ✓ SATISFIED | Source projection test plus `PlanConversation` source hydration/rendering; only cited current successfully read HTTPS sources are projected. |
| DISC-10 | 10-01 through 10-06 | Browser receives only approved answer text, source refs, and terminal metadata | ✓ SATISFIED | Service allow-list and adversarial API/MCP/graph tests confirm private evidence and reasoning do not cross stream. |
| TRUST-04 | 10-01 through 10-06 | Web content cannot issue instructions, call tools, mutate Plan, or bypass validated projection | ✓ SATISFIED | Prompt-injection regression, tool-scope boundaries, candidate preservation, and source projection tests. |

No orphaned requirement IDs: all five requirement IDs declared by the plans are described in `REQUIREMENTS.md`. Its canonical traceability maps DISC-06/07/09/10 to Phase 4 and TRUST-04 to Phase 4; Phase 10 is the later evidence-grounding implementation of those same contracts.

### Decision Coverage

The `workflow.context_coverage_gate` setting is absent, so the default enabled behavior was used. The checker found **13/13** trackable CONTEXT.md decisions honored by shipped artifacts; none were unaccounted for. This gate is informational and does not change status.

## Test Quality Audit

| Test File | Linked Req | Active | Skipped | Circular | Assertion Level | Verdict |
|---|---|---:|---:|---:|---|---|
| `services/agent/tests/test_agent_graph.py` | DISC-07, DISC-10, TRUST-04 | Yes | 0 found | 0 found | Behavioral/value | PASS |
| `services/agent/tests/test_agent_api.py` | DISC-06, DISC-07, DISC-09, DISC-10, TRUST-04 | Yes | 0 found | 0 found | Behavioral/value | PASS |
| `services/agent/tests/test_agent_checkpoint.py` | DISC-07, TRUST-04 | Yes | 0 found | 0 found | Behavioral/value | PASS |
| `services/mcps/tests/test_mcp_tools.py` | DISC-09, DISC-10, TRUST-04 | Yes | 0 found | 0 found | Behavioral/value | PASS |
| `services/mcps/tests/test_research_security.py` | TRUST-04 | Yes | 0 found | 0 found | Behavioral/value | PASS |
| `services/agent/evals/test_research_eval.py` | DISC-06, DISC-07, DISC-09, DISC-10, TRUST-04 | Yes | 0 found | 0 found | Corpus contract | PASS WITH HUMAN REVIEW |

Disabled tests linked to requirements: 0. Circular expected-value generation detected: 0. The eval harness checks fixture structure and expected contracts, not live model output; this is disclosed and the planned domain review remains required.

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|---|---:|---|---|---|
| None | — | No unreferenced TBD/FIXME/XXX/TODO/HACK/PLACEHOLDER markers found in phase implementation files | — | No blocker |

## Human Verification Required

### 1. Specialist review of high-consequence travel examples

**Test:** Have qualified travel, immigration/consular, travel-health, and safety/security reviewers label the relevant high-consequence reference cases and sample generated answers.
**Expected:** Reviewers confirm traveler applicability, issuing-authority audience, geographic and temporal scope, source quality, and referral boundaries. Correct and repeat review for any critical miss.
**Why human:** Fixture assertions cannot establish domain correctness or whether real evidence supports the wording. Both the AI-SPEC and Plan 10-06 explicitly make this a manual release check.

### 2. Live configured-provider answer

**Test:** In an authenticated environment, ask one current factual country/place question using the configured Tavily and Claude providers; inspect the answer, cited pages, and any stated uncertainty.
**Expected:** The explanation follows page reads, citations support adjacent claims, conflicts are attributed, and unavailable evidence is not presented as fact.
**Why human:** The 121-test suite uses offline fixtures/fakes and does not prove configured external provider behavior or current provider responses.

## Deferred Items

None. The identified follow-ups are human verification gates for this phase, not work assigned to a later roadmap phase.

## Gaps Summary

No code, artifact, or wiring gaps were found. All roadmap truths and plan must-haves are supported by implementation and behavioral test evidence. The phase is **human_needed** because the phase contract explicitly requires qualified review of high-consequence examples, and live provider behavior was not exercised by the offline suite. No phase completion should be recorded until those human checks are resolved.

---

_Verified: 2026-10-04T15:23:35Z_
_Verifier: the agent (gsd-verifier)_
