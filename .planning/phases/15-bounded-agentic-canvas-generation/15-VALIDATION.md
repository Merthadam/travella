---
phase: 15
status: planned
nyquist_compliant: false
---
# Verification strategy

No product tests, model calls, migrations or frontend changes are executed during this planning task. Planning review is inline under the Codex skill adapter; no independent subagent review is claimed.

## Existing commands and entry points

- `npm --prefix frontend run build` — production build.
- `npm --prefix frontend run build:components` — standalone studio build.
- `uv run ruff check <changed Python paths>` — static lint.
- Local startup: read and follow `.agents/skills/travella-local/SKILL.md`; discover active stack ports rather than assume 5174.
- Studio reference: http://localhost:5177/; disconnected.
- Example-account credentials come only from the local credential file per mandatory testing skill; never capture them.
- Do not add/run automated tests unless explicitly requested. Use manual Chrome DevTools and direct local API exercises for applicable delivery gates.

## Required evidence by plan

| Plan | Observable checks |
|---|---|
| 15-01 | Authorized context spans early preference + correction beyond message 12; cutoff stable under new messages; coverage limit disclosed; real Generate action renders editable TripThemes; stop/retry/Plan switch; malformed output remains invisible. |
| 15-02 | Exact dates, flexible dates, no budget and unknown fields; zero model calls for mapped cards; needed != booked; city/country destination viewport; manual zoom retained; provider missing/ambiguous state; desktop/mobile screenshots. |
| 15-03 | Validated read sources, freshness, conflicts, inaccessible pages, one reviewer and at most one revision, remaining tool budget shared, aggregate deadlines, partial completion and group-only retry. |
| 15-04 | Create/read/update/clear saved canvas via real CRUD API; read back exact snapshot after each; atomically updated essentials; invalid schema, wrong owner, unauthenticated, stale revision, idempotent replay, deleted/recovered Plan; no writes before explicit Save. |
| 15-05 | End-to-end generate/edit/stop/retry/save/reopen plus normal chat regression by manual use; Chrome console/network; 1440px and 390px screenshots, keyboard and reduced motion; actual SDK usage/latency only if live verification is requested. |

## Visual baseline

The user already approved the design. Preserve the existing desktop/mobile canvas and booking-state screenshots; no new layout prototype is required. Copied planning evidence lives under artifacts/testing/2026-10-06-canvas-generation-plan/plan/. Future implementation screenshots must show real state, not fixtures presented as connected.

## Model acceptance cases

Follow 15-AI-SPEC.md. A successful JSON parse is not evidence of factual accuracy. Manually inspect each generated preference against sources and each supported finding against read evidence. Capture sanitized stage counts/cost, not prompts or private memory. If limits cannot support review, report an unavailable group; do not silently skip the approved check. No unsupported personal preference or fake booking may pass the evaluated examples.

## Completion

Do not mark the phase verified until manual frontend/CRUD gates pass and requested live generation checks have evidence. Mark unavailable credentials, provider access or unrequested paid checks as pending. Record limitations rather than blanket claims of safety or quality.
