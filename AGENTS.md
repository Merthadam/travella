# Travella agent rules

Travella is an authenticated, conversational travel-planning product combining a
Conversation with an editable, map-first Planning Canvas. Travelers remain in
control of consequential choices.

## Generated files stay local

Keep generated planning documents, Superpowers specs/plans, agent logs, and testing artifacts out of Git. Use the ignored `.planning/`, `docs/superpowers/` (or legacy `docs/plans/`), `agent_working_logs/`, and `artifacts/` directories. Do not force-add or commit these files, even when a workflow asks for a planning or evidence commit. Keep application code, tests, and maintained project documentation tracked.

## Sources of truth and workflow

- Read current code, tests, schemas, and configuration to establish implemented behavior. Use CodeGraph for navigation and dependency discovery when available; verify findings against live source if its index is missing or stale.
- These rules describe product constraints, not proof that the implementation satisfies them. Surface conflicts rather than silently treating current behavior as intended behavior.
- Follow existing code patterns. Keep documentation focused on essential constraints and actionable setup, operations, and testing instructions; do not duplicate implementation details or maintain phase/status narratives.
- GSD is not required. Do not recreate `.planning/`, historical agent logs, or persistent planning documents unless the user explicitly requests them. Keep ordinary task plans and progress in the conversation.
- Preserve unrelated work, credentials, local database volumes, and historical verification evidence. Do not merge, push, deploy, or change AWS resources without authorization.

## Required verification

For every frontend change, frontend planning/design session, or backend CRUD change,
**read and follow [the mandatory planning and testing skill](.agents/skills/travella-testing/SKILL.md)**
before starting work and before reporting completion. This includes the frontend
planning prototype offer. Its applicable verification and evidence requirements
are delivery gates.

- Use [the local-stack skill](.agents/skills/travella-local/SKILL.md) when launching, restarting, or diagnosing the local app for browser checks.
- See [README.md](README.md) for setup and test commands. Run relevant checks and report actual results and blockers; never equate local tests with live provider or production readiness.

## Product and security constraints

- **Product authority**: Every destination, Planning Requirement, Selected Option, Map Pin, and other durable Plan change requires an explicit traveler action and exact confirmation — the agent cannot silently mutate a Plan.
- **Scope**: One destination or city per Plan, return flights only, and car rentals returned to the same location — keeps the first planning model coherent.
- **Provider honesty**: Unavailable provider modes remain hidden; stale, estimated, conflicting, or unavailable results must be labeled rather than invented or overstated.
- **Booking boundary**: Travella may redirect only from an eligible saved option to a server-generated URL on a verified provider host — it never claims a supplier transaction succeeded.
- **Data ownership**: The CRUD backend exclusively owns durable Plan data; the Agent and Connector services cannot bypass its authorization and revision contracts.
- **Privacy and security**: Tokens, credentials, verification codes, email addresses, raw provider payloads, and internal reasoning must not leak through URLs, logs, checkpoints, or browser projections.
- **Authorization**: Public services independently validate managed-identity tokens and authorize resources using token-derived traveler identity, never a browser-supplied user identifier.
- **Resilience**: User actions and events are idempotent; obsolete research cannot surface after interruption; only complete, consistent snapshots may be presented as saved.
- **Deletion**: Deleted Draft Plans and their scoped data are recoverable for seven days and then their identifiable Plan data must be permanently removed.
- **Architecture**: The frontend, Agent service, CRUD backend, and private Connector service begin as independent deployables in one AWS environment.

## Service boundaries

- Use Cognito for managed identity; public services independently verify tokens and resource authorization.
- Keep durable Plan ownership in CRUD, agent orchestration separate, and provider/Connector credentials server-side. The browser must not bypass these boundaries.
- Project only allow-listed agent state and validated UI data to the browser; never render generated executable code.
- Advisory memory never outranks the current Plan or traveler instruction.

[CONTEXT.md](CONTEXT.md) defines the product vocabulary.
