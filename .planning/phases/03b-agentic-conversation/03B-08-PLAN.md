---
phase: 03b-agentic-conversation
plan: '08'
type: execute
wave: 1
depends_on: []
files_modified: [services/crud/models.py, services/crud/schemas.py, services/crud/repository.py, services/crud/api.py, services/crud/purge.py, services/crud/migrations/versions/0007_conversation_context.py, services/crud/tests/test_conversation_api.py, services/crud/tests/test_conversation_postgres.py]
autonomous: true
gap_closure: true
requirements: [DISC-01, DISC-03, DISC-04, DISC-05, TRUST-03]
estimate: {tokens: 29000, raw_tokens: 29000, tasks: 3, confidence: low}
must_haves:
  truths:
    - A verified traveler can read and append paginated messages to the one linked Conversation through CRUD; duplicate event IDs cannot create a second message and foreign/deleted Plans reveal nothing.
    - CRUD returns a consistent Plan/Conversation/Brief context snapshot with revision and active versus inactive provenance; current traveler values outrank tentative inferences.
    - Manual Brief edits and deletions remain authoritative through revision conflicts, restore, and purge; agent code has no direct CRUD table write path.
  artifacts:
    - {path: services/crud/migrations/versions/0007_conversation_context.py, provides: durable messages and Brief entry provenance}
    - {path: services/crud/api.py, provides: authenticated conversation/context HTTP routes}
    - {path: services/crud/tests/test_conversation_postgres.py, provides: migrated PostgreSQL persistence and ownership checks}
  key_links:
    - {from: services/agent/app.py, to: services/crud/api.py, via: authenticated HTTP context and message contracts in 03B-09}
---

<objective>
Give the agent a CRUD-owned Conversation and authoritative Planning Brief snapshot through HTTP.
Purpose: Satisfy D-04/05 without allowing agent checkpoints to mutate durable Plan data.
Output: Narrow CRUD models, migration, routes, and HTTP persistence tests. Backend only; follow Travella backend CRUD verification and record evidence.
</objective>
<execution_context>
@/Users/adammerth/.codex/gsd-core/workflows/execute-plan.md
@/Users/adammerth/.codex/gsd-core/templates/summary.md
</execution_context>
<context>
@.planning/phases/03b-agentic-conversation/03B-CONTEXT.md
@.planning/phases/03b-agentic-conversation/03B-RESEARCH.md
@docs/planning/mvp-phase-1-service-contracts.md
@docs/skills/travella-testing/SKILL.md
@services/crud/models.py
@services/crud/api.py
@services/crud/repository.py
</context>
<tasks>
<task type="tracer" tdd="true">
  <name>Persist one traveler message through the owned Conversation HTTP route</name>
  <files>services/crud/models.py, services/crud/repository.py, services/crud/api.py, services/crud/migrations/versions/0007_conversation_context.py, services/crud/tests/test_conversation_postgres.py</files>
  <behavior>POST message for owned active Plan/conversation with event ID yields one stored row; a repeated event returns the same row; GET reads it back; foreign, missing and deleted Plan requests perform no insert.</behavior>
  <action>Per D-04, add a bounded ConversationMessage model keyed by linked conversation and unique Plan/event ID, with role, sanitized text, generation/status, timestamp, and sequence. Keep the current one-Conversation-per-Plan relation and deletion cascade. Migration 0007 also creates the Plan lifecycle outbox used by Task 3; this makes purge notification durable in the CRUD transaction. Add authenticated GET/POST routes under /v1/plans/{plan_id}/conversation/messages using token-derived ownership and existing request-ID conventions; verify Plan lifecycle and linked Conversation in the repository transaction. The agent will call these HTTP routes, not import ORM models. Use an isolated migrated PostgreSQL database in the HTTP integration test; assert status, payload, stored row, duplicate receipt, missing/foreign/deleted privacy and read pagination. Do not store raw MCP blocks or credentials.</action>
  <verify><automated>uv run pytest -q services/crud/tests/test_conversation_postgres.py</automated><fails_when>HTTP response succeeds without a stored/readable row, duplicate event inserts twice, or a foreign/deleted Plan can read or append.</fails_when></verify>
  <done>One authorized Conversation message survives HTTP readback and ownership/lifecycle denial is proven against migrated PostgreSQL.</done>
</task>
<task type="auto" tdd="true">
  <name>Expose a revision-consistent Plan and Brief context projection</name>
  <files>services/crud/models.py, services/crud/schemas.py, services/crud/repository.py, services/crud/api.py, services/crud/tests/test_conversation_api.py</files>
  <behavior>GET /v1/plans/{plan_id}/agent-context returns Plan and Conversation IDs, revision, bounded recent messages, active Brief entries with origin, and inactive historical entries marked nonranking from one authorized snapshot.</behavior>
  <action>Per D-03/05, define typed context schemas and a repository read that locks or snapshots the Plan, linked Conversation, recent messages, and Brief consistently. Extend PlanningBrief storage with per-field entry provenance and status using the 0007 migration: traveler_stated/manual versus tentative agent inference, active versus inactive, revision/sequence. Preserve the existing flat Brief read/PATCH contract for frontend callers while adding an allowlisted agent-context projection. Inactive entries may be available as history but must be explicitly excluded from ranking context. Keep tentative inferences checkpoint-only until traveler confirmation; this CRUD projection must not treat them as active. Apply authorization and lifecycle checks before any context is returned.</action>
  <verify><automated>uv run pytest -q services/crud/tests/test_conversation_api.py services/crud/tests/test_conversation_postgres.py</automated><fails_when>Context mixes revisions, leaks another Plan, or an inactive/tentative entry appears as an active ranking value.</fails_when></verify>
  <done>The agent can fetch one authenticated, revision-labeled Plan context without direct database access.</done>
</task>
<task type="auto" tdd="true">
  <name>Preserve manual Brief authority through edits, deletion, restore and purge</name>
  <files>services/crud/models.py, services/crud/repository.py, services/crud/api.py, services/crud/purge.py, services/crud/tests/test_conversation_postgres.py</files>
  <behavior>Manual edits win over conflicting agent inference; deleting an entry marks it inactive; stale If-Match fails; soft delete hides context/messages, restore recovers them, and expiry purge removes them.</behavior>
  <action>Per D-05, update existing Brief PATCH semantics so explicit traveler Save writes manual provenance and deactivation history without resurrecting deleted values through defaults. Add a narrow confirmed traveler-stated update route only if the existing PATCH contract cannot distinguish a message from manual edit; require request ID and expected revision, and never accept agent-only inferred values as confirmed. Use the lifecycle outbox table from Task 1: soft delete/restore/purge transactions record status and recovery deadline, and an authenticated service-only feed allows the agent maintenance process to consume purge events with replay. Verify create/read/update/deactivate/delete/restore/purge through real FastAPI handlers and the test database, including payload fields, stored rows and outbox events. Record commands and sanitized expected/actual outcomes under artifacts/testing/<date>-03b-conversation/verification.md per the mandatory Travella testing skill; do not claim skipped PostgreSQL checks passed.</action>
  <verify><automated>uv run pytest -q services/crud/tests/test_conversation_api.py services/crud/tests/test_conversation_postgres.py services/crud/tests/test_purge.py</automated><fails_when>A stale write succeeds, a deleted entry returns as active, or recovery/purge leaves contradictory Conversation or Brief rows.</fails_when></verify>
  <done>CRUD remains the sole durable Plan-data authority and explicit traveler Brief changes survive lifecycle transitions correctly.</done>
</task>
</tasks>
<threat_model>
## Trust Boundaries
| Boundary | Description |
|---|---|
| Agent/browser → CRUD HTTP | Message and Brief writes require token-derived owner, revision and idempotency. |
| CRUD DB → agent projection | Personal Plan data must be scoped and minimized. |
## STRIDE Threat Register
| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|---|---|---|---|---|---|
| T-03B-08-01 | Spoofing | conversation routes | high | mitigate | Derive traveler from validated token and join Plan/Conversation under owner and lifecycle. |
| T-03B-08-02 | Tampering | Brief provenance | high | mitigate | Revision and request-ID checks plus active/inactive origin constraints. |
| T-03B-08-03 | Information disclosure | context projection | high | mitigate | Allowlist fields, bound history, reject foreign/deleted Plan before serialization. |
</threat_model>
<verification>Use the required real FastAPI HTTP handlers and isolated migrated PostgreSQL database; record status, payload, persistence and ownership outcomes in Travella testing evidence.</verification>
<success_criteria>CRUD owns messages and confirmed Brief values; agent code can consume a consistent authorized context over HTTP only.</success_criteria>
<output>Create .planning/phases/03b-agentic-conversation/03B-08-SUMMARY.md when done.</output>
