---
phase: 03b-agentic-conversation
plan: '11'
type: execute
wave: 4
depends_on: ['03B-08', '03B-09', '03B-10']
files_modified: [services/agent/tests/test_agent_journey_postgres.py, services/crud/tests/test_conversation_postgres.py, services/mcps/tests/test_transport.py, artifacts/testing/2026-10-01-03b-conversation/verification.md]
autonomous: true
gap_closure: true
requirements: [DISC-01, DISC-02, DISC-03, DISC-04, DISC-05, DISC-06, DISC-07, DISC-08, DISC-09, DISC-10, TRUST-03, TRUST-04]
estimate: {tokens: 17000, raw_tokens: 17000, tasks: 2, confidence: low}
must_haves:
  truths:
    - Real FastAPI handlers and an isolated migrated PostgreSQL database demonstrate an owned multi-turn Conversation, current Brief authority, restart-safe complete research, and generation-safe candidate actions.
    - Deterministic tests exercise actual Anthropic SDK request construction, AgentCore MCP interceptor envelope, and mounted authenticated FastMCP routes; they distinguish fixture-driven behavior from live model/provider results.
    - Live Gateway/Claude/provider checks are recorded as passed only when actually run; missing credentials or infrastructure are explicit incomplete gates.
  artifacts:
    - {path: services/agent/tests/test_agent_journey_postgres.py, provides: end-to-end backend turn/restart/action tests}
    - {path: artifacts/testing/2026-10-01-03b-conversation/verification.md, provides: sanitized test commands, outcomes and live-gate status}
  key_links:
    - {from: services/agent/tests/test_agent_journey_postgres.py, to: services/crud/api.py, via: real HTTP Conversation/Brief persistence}
    - {from: services/agent/tests/test_agent_journey_postgres.py, to: services/mcps/transport.py, via: actual MCP JSON-RPC requests}
---

<objective>
Verify the amended backend Conversation contract across CRUD, PostgreSQL checkpoints, Claude SDK construction and authenticated MCP.
Purpose: Close D-08 with evidence that exposes any remaining deployed-service gap honestly.
Output: Focused integration tests and a sanitized verification record. No frontend implementation or product-level Phase 3/4 completion claim.</objective>
<execution_context>@/Users/adammerth/.codex/gsd-core/workflows/execute-plan.md
@/Users/adammerth/.codex/gsd-core/templates/summary.md</execution_context>
<context>@.planning/phases/03b-agentic-conversation/03B-CONTEXT.md
@.planning/phases/03b-agentic-conversation/03B-RESEARCH.md
@.planning/phases/03b-agentic-conversation/03B-VERIFICATION.md
@docs/skills/travella-testing/SKILL.md
@.planning/phases/03b-agentic-conversation/03B-08-SUMMARY.md
@.planning/phases/03b-agentic-conversation/03B-09-SUMMARY.md
@.planning/phases/03b-agentic-conversation/03B-10-SUMMARY.md</context>
<tasks>
<task type="tracer" tdd="true">
  <name>Exercise a multi-turn owned Plan journey through all backend boundaries</name>
  <files>services/agent/tests/test_agent_journey_postgres.py, services/crud/tests/test_conversation_postgres.py</files>
  <behavior>One authenticated Plan receives an early research response, traveler correction, manual Brief edit, refresh, inspect, rejection and restart; current manual values and complete shortlist survive; foreign/deleted Plans and duplicate/stale events never publish or mutate unauthorized state.</behavior>
  <action>Per D-01–08, build a deterministic journey fixture using real Agent and CRUD FastAPI ASGI handlers, isolated migrated PostgreSQL for CRUD and agent-owned checkpoints, the installed Anthropic SDK call interface, Gateway interceptor request/response envelope, and mounted FastMCP HTTP apps. Stub only model decisions and external Tavily/Google HTTP responses; assert actual SDK system/messages/mcp_servers/tools arguments and resulting MCP JSON-RPC traffic. Test create/read/update/deactivate/delete/restore/purge and readback for changed CRUD operations, plus restart, stale generation, duplicate events across two app instances, current-run source inspection, and no silent destination/pin/requirements mutation. Keep credentials/tokens out of fixture reports.</action>
  <verify><automated>uv run pytest -q services/agent/tests/test_agent_journey_postgres.py services/crud/tests/test_conversation_postgres.py</automated><fails_when>Tests bypass real handlers or PostgreSQL, a duplicate event redoes research, a stale checkpoint outranks CRUD, or source inspection avoids authenticated MCP.</fails_when></verify>
  <done>One backend Plan journey is demonstrated across real local contracts with persistence, ownership and action semantics asserted.</done>
</task>
<task type="auto">
  <name>Record deterministic and live verification separately</name>
  <files>services/mcps/tests/test_transport.py, artifacts/testing/2026-10-01-03b-conversation/verification.md</files>
  <action>Run the focused journey, existing agent/CRUD/MCP regressions, lint, and the Travella backend CRUD HTTP gate. Record exact commands, status, payload/readback/persistence results, invalid-input and ownership checks in the verification record. Add a live authenticated AgentCore Gateway initialize/tools/list/tools/call and Claude/Tavily/Google smoke only when configuration is available; record each as passed, failed, or blocked with exact missing prerequisite. Inspect that logs and artifacts omit tokens, emails, raw provider payloads and reasoning. Re-run the verifier against 03B goals and keep browser UI, durable Plan-level requirements/workspace confirmation, and AgentCore long-term-memory activation out of the completion claim.</action>
  <verify><automated>uv run pytest -q services/agent/tests services/crud/tests services/mcps/tests</automated><fails_when>A relevant regression fails, required PostgreSQL CRUD checks are skipped without being marked incomplete, or the verification record claims an unrun live check passed.</fails_when></verify>
  <done>Deterministic backend checks and any live checks are independently evidenced with remaining deployment blockers stated plainly.</done>
</task>
</tasks>
<threat_model>
## Trust Boundaries
| Boundary | Description |
|---|---|
| Test fixtures → reported evidence | Passing fakes cannot be represented as live provider proof. |
| Evidence artifacts → workspace | Logs and screenshots must not leak tokens, raw payloads or personal data. |
## STRIDE Threat Register
| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|---|---|---|---|---|---|
| T-03B-11-01 | Repudiation | verification report | medium | mitigate | Record exact commands, fixture versus live mode, outcomes and blockers. |
| T-03B-11-02 | Information disclosure | testing artifacts | high | mitigate | Sanitize tokens, email addresses, raw provider blocks and internal reasoning before writing evidence. |
</threat_model>
<verification>Focused end-to-end test and full relevant regression command; check the evidence record and live-gate status against actual executions.</verification>
<success_criteria>The corrected backend slice is verifiable without overstating browser or unrun live AWS/provider behavior.</success_criteria>
<output>Create .planning/phases/03b-agentic-conversation/03B-11-SUMMARY.md when done.</output>

## Multi-source coverage audit

| Source | Item | Plan | Status |
|---|---|---|---|
| GOAL | Executable focused Conversation and complete map-ready shortlist backend | 07, 09–11 | Covered within backend scope |
| REQ | DISC-01/02 focused questions, early input, redirect | 07, 11 | Covered within backend scope |
| REQ | DISC-03/04/05 editable Brief, precedence, inactive history | 08, 09, 11 | Covered within backend scope |
| REQ | DISC-06/07/08/09/10 cited shortlist, actions, refresh, evidence, compact retention | 09–11 | Covered within backend scope |
| REQ | TRUST-03/04 checkpoint reconciliation and untrusted research | 09–11 | Covered within backend scope |
| RESEARCH | Anthropic Messages MCP, LangGraph 0.6/Postgres 3.0.4, AgentCore Gateway ownership, strict checkpoint serializer | 07, 09, 10 | Covered |
| CONTEXT | D-01 two meaningful graph stages | 07 | Covered |
| CONTEXT | D-02 versioned system prompts and assistant replies | 07, 10 | Covered |
| CONTEXT | D-03 bounded history, current CRUD context and early research | 07–09 | Covered |
| CONTEXT | D-04 CRUD/agent checkpoint separation and restore | 08, 09 | Covered |
| CONTEXT | D-05 manual Brief precedence and inactive history | 08, 09 | Covered |
| CONTEXT | D-06 private MCP, cited Claude synthesis, one tool loop | 07, 10 | Covered |
| CONTEXT | D-07 durable shortlist, rejection, receipts, generation | 09, 11 | Covered |
| CONTEXT | D-08 handler/PostgreSQL/SDK/MCP tests and Gateway ownership | 10, 11 | Covered |
| DEFERRED | Browser UI, workspace confirmation, booking, AgentCore long-term-memory activation | — | Excluded per context |
