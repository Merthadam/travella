# Planning canvas generation

Phase 15 connects the approved seven-component canvas to the existing Plan-scoped
LangGraph and Claude Agent SDK runtime. LangGraph assembles the draft; the CRUD
service alone persists an explicitly saved snapshot. AgentCore carries the existing
authenticated turn/stream envelope. There is no new model provider or RAG layer.

## Actions and input

The existing Plan events endpoint accepts:

```json
{
  "plan_id": "<existing-plan-uuid>",
  "event_id": "<new-unique-event-id>",
  "canvas_action": "generate_plan",
  "context_revision": 7
}
```

| Action | Work |
| --- | --- |
| `generate_plan` | Map known trip state, generate themes, then generate findings and websites. |
| `generate_themes` | Regenerate themes/preferences only. |
| `generate_research` | Regenerate findings and websites together. |

The browser supplies the current `context_revision`; a mismatch is rejected before
inference. The shared API schema keeps it optional for compatibility. An optional
`canvas_themes` component carries the traveler's locally edited themes into a
research retry. It does not make those values saved or verified evidence. The
browser adapter normalizes theme source labels to the accepted input labels.
`message` can supply additional traveler context. Candidate actions and forwarded
Trip Brief edits cannot be combined with canvas generation.

Ownership checks, the existing exclusive Plan reservation, and the durable
research-context lease apply before gathering generation context. Generation
releases that lease without saving Plan edits or writing conversation messages.
No browser-supplied identity chooses the traveler scope.

## Components and generation

`canvas_generation` is a dedicated node in the existing graph. Its workers are
focused, disposable SDK sessions; there is no extra parent model routing through
the SDK Agent tool.

| Component | Input and behavior |
| --- | --- |
| Trip essentials | Dates, flexible-date note, traveler count and budget mapped directly from current trip state. Notes and budget labels retain the state's 200-character limit. |
| Themes & preferences | A tool-free SDK worker summarizes conversation, active trip facts and relevant saved preferences. |
| Destination map | Chosen destination from state; the frontend uses Google Maps to obtain its viewport. No model positioning. |
| Flights / Accommodation | Need state mapped directly. Initial status is Not booked; need does not imply a booking. Search availability remains unavailable pending supplier integration. |
| Research findings / Useful websites | One shared SDK worker, with one observed evidence registry for both components. |

The approved fixed structure and registered A2UI components determine rendering;
the model cannot return executable UI, arbitrary component types or binding paths.

## Complete bounded source context

Generation reads authorized, sequence-paginated conversation history through
`generation-context`, using a fixed first-page cutoff and Plan revision. Ordinary
chat retains its existing history limits. Generation does **not** use the ordinary
last-12-message prompt window.

The source pack is capped at 500 messages and 60,000 serialized characters. It
includes relevant profile preferences, brief entries and current trip context.
Exceeding the cap reports incomplete coverage before a model call; older messages
are not silently removed to fit. Profile projection excludes precise home address,
citizenship, identity and credentials. Conversation text remains supplied context.

Sources are role-tagged and treated as untrusted data. Assistant suggestions alone
cannot become traveler preferences. An assistant-derived theme requires a later
user acceptance reference and exact quotes from both sources. Current corrections
and inactive brief entries take precedence over older statements; saved preferences
are advisory and remain read-only. Code validates source existence, active flags,
quote matching and acceptance order. Interpretation of corrections and entailment
still requires the semantic review; substring matching is not proof of meaning.

Themes use `theme`, `pace`, `priority`, `must_do` or `avoid`, with at most 20 items
and 160 characters per item. Code assigns stable IDs and public source labels.
Private quotes and source packs never enter the browser projection.

## One bounded review per worker group

Each nonempty worker run follows:

1. Generate one structured candidate.
2. Validate its schema, size and source references in code.
3. Run one tool-free semantic review returning `accept` or `revise`, with up to
   eight short issues.
4. If needed, perform at most one revision and validate again.

A parseable candidate with structural errors uses that same review/revision
allowance for repair. No usable candidate, failed review, exhausted budget or
invalid final result leaves the previous valid group available for Retry. There
is no second semantic review. Unchanged items specifically rejected by the reviewer
are removed after revision. Code validation remains mandatory before publication.
SDK structured-output protocol turns are bounded inside each invocation; they do
not grant an additional outer review or revision loop.

Themes never have tools. Findings/websites generation and revision may use only
`WebSearch` and `WebFetch`; their review is tool-free. Both research stages share
at most two searches and four attempted reads, including failed reads. No shell,
filesystem, general MCP tools or Skill tool is exposed to this canvas worker.
It reuses the isolated lower-level SDK runtime, not the conversation research
worker's additional prose-answer call.

## Evidence, freshness and links

Only successful observed page reads and eligible server-cached reads can supply
citation IDs. Search snippets are not read evidence. The observer validates public
HTTPS URLs and rejects unread responses or mismatched redirect results. Code
checks exact source quotes and derives citation URLs/titles from the registry;
the model cannot mint citation URLs. Links require an observed page and a concise
purpose. Supported findings require a source; conflicting findings require at
least two distinct source URLs. Failed page reads produce an unavailable notice.

Reusable read evidence is held in an in-process cache keyed by authenticated
traveler and Plan, with a 30-minute TTL, at most 100 Plan entries and 12 stored
sources per entry. The worker admits up to nine cached sources, at most 30 days
old. Time-sensitive findings whose evidence is older than 24 hours are downgraded
to uncertain. Prompts and review require fresh authoritative sources for current
rules/schedules and prefer existing sufficient evidence before searching.

This cache is transient: restarting a worker or routing to another instance can
lose reuse. It is not durable resumed-chat evidence storage. Empty themes-only
results do not erase an existing research cache. Source excerpts stay private;
the frontend receives compact findings, public URLs and timestamps.

## Budgets, cancellation and telemetry

All calls use the configured Claude model and low effort. Existing lower configured
budget/deadline limits apply; there is no automatic stronger-model escalation.

| Scope | Configured ceiling | Deadline |
| --- | --- | --- |
| Themes, including review/revision | $0.10 | 45 seconds |
| Findings + websites, including review/revision | $0.25 | 90 seconds |
| Full generation | $0.35 | 120 seconds |

Each group makes at most three SDK invocations. Known completed-call cost is
subtracted before the next stage; failures conservatively consume the group's
reserved allocation when deciding whether another group may start. A provider
call can overshoot its configured ceiling while in flight. These values are
engineering limits, not measured cost or latency promises.

Stop and disconnect propagate cancellation into SDK transport cleanup. Obsolete
runs cannot publish new updates; completed valid groups remain editable. Usage
metadata records calls, stage, known cost and search/read counts. `usage_complete`
is false when a call or worker fails, because the SDK may not expose final billed
usage for a failed call. Cancellation logs contain only fixed labels and numeric
metadata, never prompts, page content, identity or credentials.

## Stream and draft contract

A draft response has `status: "canvas_draft_ready"` and `canvas_draft` containing:

- `components`: allowlisted `essentials`, `themes`, `map`, `flights`,
  `accommodation`, `findings` and `links` data.
- `group_status`: `themes` / `research`, each loading, ready or error.
- `generation_id`, `context_revision` and `plan_revision` for reconciliation.
- `evidence`: server signatures for supported/conflicting findings.

The themes-only action also retains legacy `component: "TripThemes"` and `data`
fields. Complete validated groups stream in `STATE_SNAPSHOT` events; snapshots
preserve the `trip_context` sibling. Terminal delivery includes the final draft
and ends with `RUN_FINISHED`. There is no raw token-by-token JSON or internal
reasoning stream. Group errors can coexist with successfully mapped/generated
components; `canvas_draft_ready` does not mean every group succeeded.

## Explicit saving and deployment prerequisite

The connected canvas is an editable local draft. Generate and Retry do not save.
**Save plan** submits the exact reviewed snapshot through the CRUD confirmation
challenge and revision/idempotency contract. CRUD commits the versioned canvas,
canonical trip essentials/need state and map information in one transaction.
Reopening restores the last saved snapshot; unsaved edits are not durable.
Draft Plan soft-delete/recovery and eventual purge include its saved canvas.

Browser-submitted findings are untrusted. An unchanged supported/conflicting
finding can retain its certainty only with a server signature bound to its full
content, traveler and Plan. Editing a finding removes that evidence status; a
browser cannot create verified claims or a booked state merely by changing JSON.

**Deployment requires the same persistent `CANVAS_EVIDENCE_SIGNING_KEY` in the
Agent runtime and CRUD service**, with at least 32 characters. Supply it through the deployment's private
secret configuration, never a frontend variable or tracked file. The local
bootstrap script creates/preserves the local secret and Compose passes it to the
relevant services. Different, missing or rotated keys invalidate existing evidence
signatures; coordinated deployment and regeneration are required before affected
findings can be saved as supported again. This key is separate from Anthropic
credentials, which continue using the existing secret/configuration flow.

## Verification limits

No live Claude SDK evaluation was performed for this implementation documentation.
Real model quality, review behavior, latency and billed costs remain unmeasured.
Static checks or deterministic HTTP/browser checks do not establish those results.
See Phase 15's validation/evidence records for the checks actually performed and
outstanding acceptance work. Supplier search integration remains deferred.

- [Phase 15 validation plan](../../.planning/phases/15-bounded-agentic-canvas-generation/15-VALIDATION.md)
- [Implementation evidence record](../../artifacts/testing/2026-10-07-canvas-generation/verification.md)
