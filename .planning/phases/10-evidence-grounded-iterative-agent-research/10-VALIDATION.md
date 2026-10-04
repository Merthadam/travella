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
| Research ordering and bounded refinement | TBD | TBD | DISC-07, DISC-10 | T-10-01 | Evidence is returned before answer synthesis; deterministic pass limits terminate the loop. | unit/integration | `uv run pytest services/agent/tests -q` | ✅ existing suite; cases to add | ⬜ pending |
| Page extraction and evidence normalization | TBD | TBD | DISC-09, TRUST-04 | Unavailable pages are explicit; unread snippets cannot become citations; web text remains untrusted. | unit/integration | `uv run pytest services/mcps/tests -q` | ✅ existing suite; cases to add | ⬜ pending |
| Citation projection and candidate preservation | TBD | TBD | DISC-09, DISC-10 | Only read evidence IDs project; destination candidates remain unchanged by synthesis. | integration | `uv run pytest services/agent/tests -q` | ✅ existing suite; cases to add | ⬜ pending |
| Freshness, checkpoint bounds, and interruption | TBD | TBD | DISC-06, DISC-07, TRUST-04 | Stale evidence refreshes; compact allowed state resumes; cancelled/superseded runs cannot publish. | unit/integration | `uv run pytest services/agent/tests -q` | ✅ existing suite; cases to add | ⬜ pending |

*The planner assigns plan/task numbers and ensures each task has an executable `<automated>` verify command. These requirement-level rows should be mapped to the resulting tasks before execution.*

---

## Wave 0 Requirements

- [ ] Add deterministic fake search, page-read, and model-decision fixtures for normal CI.
- [ ] Add regression cases for evidence-before-synthesis, cap exhaustion, unread pages, unsupported citations, prompt injection, destination-candidate preservation, and superseded runs.
- [ ] Confirm the deployed Bedrock endpoint/model/SDK path before selecting JSON constrained output.

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
