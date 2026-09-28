---
phase: "02"
slug: "draft-plans-durable-lifecycle"
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-09-27"
---

# Phase 02 — Validation Strategy

## Test Infrastructure

| Property | Value |
|---|---|
| Framework | pytest + FastAPI TestClient/httpx; Vitest + Testing Library |
| Config | `pyproject.toml`; `frontend/package.json` |
| Quick run | `uv run pytest -q services/crud/tests` and `npm test --prefix frontend` |
| Full suite | `bash scripts/check.sh` |
| Feedback target | under 30 seconds for targeted tests |

## Per-task verification map

| Requirement group | Required automated evidence |
|---|---|
| PLAN-01, PLAN-04 | authorized list ordering and open resume-target API tests; React active-card and fallback tests |
| PLAN-02, PLAN-08, TRUST-01 | atomic Plan+Conversation create, duplicate request, stale timestamp/digest, and concurrent retry tests |
| PLAN-03 | NFC/Unicode title validation, manual provenance, automatic proposal non-overwrite, and rename conflict tests |
| PLAN-05, PLAN-06, PLAN-07 | delete confirmation/revision tests, restore latest state/open routing tests, deadline boundary and purge tests |
| TRUST-02, TRUST-05 | independent token/subject authorization, safe foreign/deleted errors, projection redaction tests |

## Manual-only verification

| Behavior | Reason | Test |
|---|---|---|
| Responsive My plans and Recently deleted at 320px/200% zoom | visual layout and focus order | browser check with keyboard-only navigation and screenshot review |
| Restore immediately opens valid saved view and focus lands on heading | cross-service navigation and assistive behavior | create, switch view, delete, restore, observe route/focus; repeat with unavailable workspace fallback |

## Sampling

Run targeted CRUD and frontend tests after each task; run both suites after each wave; run `bash scripts/check.sh` before `$gsd-verify-work`. Each task must have a runnable `<automated>` command and a stated failure condition.
