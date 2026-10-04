---
phase: "10"
slug: "evidence-grounded-iterative-agent-research"
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-10-04"
---

# Phase 10 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | pytest (existing Python services) |
| **Config file** | `pyproject.toml` |
| **Quick run command** | `uv run pytest services/agent/tests services/mcps/tests -q` |
| **Full suite command** | `uv run pytest -q` |
| **Estimated runtime** | ~120 seconds; confirm at Wave 0 |

---

## Sampling Rate

- **After every task commit:** Run the focused Agent/MCP tests for the changed modules.
- **After every plan wave:** Run `uv run pytest services/agent/tests services/mcps/tests -q`.
- **Before `$gsd-verify-work`:** Run the full Python test suite.
- **Max feedback latency:** 120 seconds for the focused Agent/MCP suites.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 10-01-T1 | 10-01 | 1 | DISC-07, DISC-09 | T-10-01 | Page read precedes synthesis; unread evidence cannot be cited. | integration | `uv run pytest -q services/agent/tests/test_agent_graph.py services/agent/tests/test_agent_turn.py services/mcps/tests/test_mcp_tools.py` | ✅ existing suites; cases added | ⬜ pending |
| 10-01-T2 | 10-01 | 1 | DISC-07, DISC-10 | T-10-02 | Only validated research/discovery intents route; invalid intent asks or safely fails. | unit | `uv run pytest -q services/agent/tests/test_agent_graph.py services/agent/tests/test_agent_turn.py` | ✅ existing suites; cases added | ⬜ pending |
| 10-02-T1 | 10-02 | 2 | DISC-09, TRUST-04 | T-10-03 | Extraction is bounded; failed reads remain unavailable and ineligible. | unit/integration | `uv run pytest -q services/mcps/tests/test_mcp_tools.py` | ✅ existing suite; cases added | ⬜ pending |
| 10-02-T2 | 10-02 | 2 | TRUST-04 | T-10-04 | Unsafe URLs and hostile page instructions cannot escape private retrieval controls. | security/unit | `uv run pytest -q services/mcps/tests/test_research_security.py services/mcps/tests/test_mcp_tools.py` | ✅ existing suites; cases added | ⬜ pending |
| 10-03-T1 | 10-03 | 3 | DISC-07, DISC-09, TRUST-04 | T-10-05 | Decisions validate schema and evidence IDs; high-consequence claims are scoped. | unit | `uv run pytest -q services/agent/tests/test_agent_turn.py` | ✅ existing suite; cases added | ⬜ pending |
| 10-03-T2 | 10-03 | 3 | DISC-07, DISC-10 | T-10-06 | Search count never exceeds the hard cap; terminal answer states unresolved uncertainty. | unit/integration | `uv run pytest -q services/agent/tests/test_agent_graph.py services/agent/tests/test_agent_turn.py` | ✅ existing suites; cases added | ⬜ pending |
| 10-04-T1 | 10-04 | 4 | DISC-09, DISC-10, TRUST-04 | T-10-07 | Only validated read-source references and allow-listed fields reach SSE. | integration | `uv run pytest -q services/agent/tests/test_agent_api.py services/agent/tests/test_agent_turn.py` | ✅ existing suites; cases added | ⬜ pending |
| 10-04-T2 | 10-04 | 4 | DISC-09, DISC-10 | T-10-08 | Discovery preserves candidate IDs; factual research causes no durable Plan mutation. | integration | `uv run pytest -q services/agent/tests/test_agent_graph.py services/agent/tests/test_agent_turn.py services/agent/tests/test_agent_api.py` | ✅ existing suites; cases added | ⬜ pending |
| 10-05-T1 | 10-05 | 5 | TRUST-04 | T-10-09 | Checkpoints store compact allow-listed evidence metadata, never pages/secrets/reasoning. | unit | `uv run pytest -q services/agent/tests/test_agent_checkpoint.py` | ✅ existing suite; cases added | ⬜ pending |
| 10-05-T2 | 10-05 | 5 | DISC-06, DISC-07, TRUST-04 | T-10-10 | Reuse respects fact-type freshness and Plan scope; obsolete runs cannot publish. | unit/integration | `uv run pytest -q services/agent/tests/test_agent_graph.py services/agent/tests/test_agent_checkpoint.py` | ✅ existing suites; cases added | ⬜ pending |
| 10-06-T1 | 10-06 | 6 | DISC-07, DISC-10, TRUST-04 | T-10-11 | Adversarial pages cannot trigger forbidden tools; stopped/superseded runs emit no late events. | security/integration | `uv run pytest -q services/agent/tests/test_agent_graph.py services/agent/tests/test_agent_api.py services/mcps/tests/test_research_security.py` | ✅ existing suites; cases added | ⬜ pending |
| 10-06-T2 | 10-06 | 6 | DISC-07, DISC-09, TRUST-04 | T-10-12 | 20 sanitized cases assert retrieval, citation, cap, and output contracts without live providers. | eval/unit | `uv run pytest -q services/agent/evals` | ❌ created by this task | ⬜ pending |

*These are required pre-execution checks; task-level commands and failing conditions are the source for implementation verification.*

---

## Wave 0 Requirements

- [x] Existing pytest infrastructure covers all phase requirements; no framework installation is needed.
- [x] Add deterministic fake search, page-read, and model-decision fixtures as part of Plans 10-01 through 10-06.
- [x] Add regression cases for evidence-before-synthesis, cap exhaustion, unread pages, unsupported citations, prompt injection, candidate preservation, and superseded runs across those tasks.
- [x] Plan 10-01 requires confirmation of deployed Bedrock endpoint/model/SDK compatibility before enabling constrained output.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Domain quality for entry, health, and safety outputs | TRUST-04 | Fixtures and judges cannot independently establish expert applicability for consequential travel guidance. | Have the relevant immigration/consular, travel-health, or safety reviewer assess the labeled high-consequence scenarios and cited official pages. |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 120s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
