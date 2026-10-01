---
phase: 03b-agentic-conversation
plan: '09'
type: execute
wave: 2
depends_on: ['03B-07', '03B-08']
files_modified: [pyproject.toml, uv.lock, services/agent/checkpoint.py, services/agent/state.py, services/agent/app.py, services/agent/graph.py, services/agent/tests/test_agent_checkpoint.py, services/agent/tests/test_agent_api.py]
autonomous: true
gap_closure: true
requirements: [DISC-01, DISC-03, DISC-04, DISC-05, DISC-07, DISC-08, DISC-10, TRUST-03]
estimate: {tokens: 30000, raw_tokens: 30000, tasks: 3, confidence: low}
must_haves:
  truths:
    - After process restart, an authorized traveler/Plan restores the last complete compact shortlist, rejection reasons, turn history reference, and event receipts from PostgreSQL agent-owned state.
    - A checkpoint older than CRUD Plan/Brief revision is reconciled before projection; newer traveler manual values win and unfinished research is interrupted without automatic provider rerun.
    - Concurrent duplicate events across workers have one durable receipt/run owner; a newer event suppresses obsolete publication.
  artifacts:
    - {path: services/agent/checkpoint.py, provides: AsyncPostgresSaver setup and actor/Plan-scoped checkpoint operations}
    - {path: services/agent/state.py, provides: versioned compact state, durable event/generation coordination}
    - {path: services/agent/tests/test_agent_checkpoint.py, provides: migrated PostgreSQL restart/concurrency/reconciliation tests}
  key_links:
    - {from: services/agent/app.py, to: services/crud/api.py, via: authenticated agent-context and Conversation message HTTP reads/writes}
    - {from: services/agent/graph.py, to: services/agent/checkpoint.py, via: verified thread_id and configured AsyncPostgresSaver}
---

<objective>
Persist and reconcile Plan-scoped LangGraph working state against CRUD-owned Plan context.
Purpose: Replace process-local production state per D-04/05/07 without granting agent writes to CRUD tables.
Output: Pinned PostgreSQL saver, agent-owned checkpoint/receipt state, and restart/concurrency tests. Backend only.</objective>
<execution_context>@/Users/adammerth/.codex/gsd-core/workflows/execute-plan.md
@/Users/adammerth/.codex/gsd-core/templates/summary.md</execution_context>
<context>@.planning/phases/03b-agentic-conversation/03B-CONTEXT.md
@.planning/phases/03b-agentic-conversation/03B-RESEARCH.md
@.planning/phases/03b-agentic-conversation/03B-07-SUMMARY.md
@.planning/phases/03b-agentic-conversation/03B-08-SUMMARY.md
@services/agent/state.py
@services/agent/app.py</context>
<tasks>
<task type="tracer" tdd="true">
  <name>Restore one completed Plan turn through PostgreSQL LangGraph checkpoint</name>
  <files>pyproject.toml, uv.lock, services/agent/checkpoint.py, services/agent/graph.py, services/agent/tests/test_agent_checkpoint.py</files>
  <behavior>An owned Plan turn writes compact versioned graph state; a fresh app process with the same verified traveler/Plan loads its last complete shortlist; another traveler/Plan cannot select that thread.</behavior>
  <action>Per D-04 and the user-selected PostgreSQL store, add exact `langgraph-checkpoint-postgres==3.0.4` after checking the 03B-RESEARCH.md package-legitimacy audit and confirming lock compatibility with langgraph 0.6.11/checkpoint 3.0.1. Use AsyncPostgresSaver with an agent-only PostgreSQL DSN/schema and a setup/migration command; runtime must fail closed if tables, DSN, or strict serialization policy are absent. Derive `configurable.thread_id` and namespace from verified actor plus Plan; never accept client thread IDs. Save only schema-versioned compact candidates, evidence IDs, rejection reasons, pending status, receipt metadata and CRUD revision/digest, excluding token, raw MCP/web blocks and internal reasoning. Test against isolated PostgreSQL, including fresh process restore and cross-actor denial.</action>
  <verify><automated>uv run pytest -q services/agent/tests/test_agent_checkpoint.py</automated><fails_when>The test uses MemorySaver, survives only in one process, or a foreign actor can load state.</fails_when></verify>
  <done>A completed compact Plan state survives restart in agent-owned PostgreSQL tables.</done>
</task>
<task type="auto" tdd="true">
  <name>Reconcile checkpoints with current CRUD messages and Brief revision</name>
  <files>services/agent/app.py, services/agent/checkpoint.py, services/agent/state.py, services/agent/tests/test_agent_checkpoint.py, services/agent/tests/test_agent_api.py</files>
  <behavior>Open/resume validates the Plan through CRUD, loads its consistent context and messages, compares revision/digest to checkpoint, rebases newer manual Brief values, and marks an unfinished run interrupted; deleted/foreign Plans yield no checkpoint projection.</behavior>
  <action>Per D-03/04/05, add a typed HTTP CRUD context client using forwarded verified identity or an explicitly authenticated service-to-service request bound to that identity. Read ownership/lifecycle before checkpoint access; compare checkpoint schema version and CRUD revision/digest. Retain compact candidate/history progress only when it can be reconciled; current active manual/traveler Brief values outrank checkpoint inference, and inactive entries remain nonranking. If revision changed or an interrupted run is pending, expose only the last matched complete state and a safe resume/interrupted status; no automatic research restart or false saved-progress marker. Append traveler and current assistant Conversation messages through CRUD HTTP with idempotent event/generation keys, not ORM imports. Test conflicting updates and partial save order in migrated PostgreSQL plus FastAPI HTTP.</action>
  <verify><automated>uv run pytest -q services/agent/tests/test_agent_checkpoint.py services/agent/tests/test_agent_api.py</automated><fails_when>A stale checkpoint overwrites a newer Brief value, a deleted Plan exposes state, or a partial checkpoint is reported as saved.</fails_when></verify>
  <done>Resume presents only authorized, revision-consistent Conversation and compact research state.</done>
</task>
<task type="auto" tdd="true">
  <name>Persist event ordering and safe generation publication across workers</name>
  <files>services/agent/checkpoint.py, services/agent/state.py, services/agent/app.py, services/agent/tests/test_agent_checkpoint.py</files>
  <behavior>Two workers receiving one event ID reserve one durable receipt and one model/tool run; a later event advances generation; the older completion cannot publish or append an assistant message; failed refresh leaves the previous complete shortlist.</behavior>
  <action>Per D-07, move production receipt and generation coordination out of PlanCandidateStore/ProcessReceiptCache into agent-owned PostgreSQL transactions with unique actor/Plan/event keys, bounded leases, and conditional publish against current generation. Preserve original result for duplicate delivery and do not repeat provider work. Keep previous complete shortlist during refresh, record rejection reasons, and treat failed or interrupted work as retryable without silently launching research after restart. Consume the authenticated CRUD lifecycle outbox feed from 03B-08: soft delete hides state, restore re-enables only a reconciled complete checkpoint, and a replayable post-deadline purge event deletes agent-owned checkpoint/receipt rows. Do not purge merely because a user request gets 404. Tests cover two app instances, crash/retry, stale completion, refresh failure, delete/restore and expiry purge.</action>
  <verify><automated>uv run pytest -q services/agent/tests/test_agent_checkpoint.py</automated><fails_when>Duplicate workers call the model twice, obsolete generation publishes, or expired deleted Plan checkpoint rows remain after the authorized purge path.</fails_when></verify>
  <done>Event receipts and latest complete shortlist remain consistent across restart and concurrency.</done>
</task>
</tasks>
<threat_model>
## Trust Boundaries
| Boundary | Description |
|---|---|
| CRUD HTTP → checkpoint | CRUD revision and owner are authoritative over agent working state. |
| Agent PostgreSQL → graph | Deserialization and thread selection must be scoped and strict. |
## STRIDE Threat Register
| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|---|---|---|---|---|---|
| T-03B-09-01 | Spoofing | checkpoint thread | high | mitigate | Derive thread key only after verified Plan ownership. |
| T-03B-09-02 | Tampering | stale checkpoint | high | mitigate | Schema/revision/digest reconciliation before projection or publication. |
| T-03B-09-03 | Information disclosure | checkpoint rows | high | mitigate | Agent-only DB role, strict serializer and compact allowlist. |
| T-03B-09-04 | Denial of service | duplicate event | medium | mitigate | Unique durable receipts, leases and conditional generation publish. |
</threat_model>
<verification>Run isolated PostgreSQL restart/concurrency tests plus CRUD HTTP context tests; do not substitute in-memory adapters for the database contract.</verification>
<success_criteria>D-04/05/07 persistence, scope, reconciliation and idempotency hold across processes; AgentCore long-term memory remains disabled.</success_criteria>
<output>Create .planning/phases/03b-agentic-conversation/03B-09-SUMMARY.md when done.</output>
