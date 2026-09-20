# MVP phase 1 service contracts

This is the implementation-ready **logical contract** for the first MVP journey:

```text
My plans → create or open Draft Plan → initial conversation
→ traveler-confirmed Planning Requirements → generated workspace
```

It turns the accepted user-story decisions into service operations and projections. The Draft Plan API inventory provides a small provisional HTTP mapping; database tables, final transport schemas, AG-UI component schemas, providers, and infrastructure products remain open.

## Scope and contract rules

- **Planning Requirements** is the confirmed snapshot of the active Planning Brief that is safe to use to configure a workspace. It is not a second, competing brief. A direct traveler statement or a saved manual brief edit may update the working brief immediately; a conflicting agent inference stays tentative until accepted.
- The initial workspace gate requires a confirmed single destination/city and a confirmed requirements snapshot. This is the point at which a destinationless exploratory Draft Plan becomes ready for the map-based workspace.
- The **map is permanent** once a workspace exists. It is an approved frontend component, not model-generated UI. Flight, accommodation, and car-rental surfaces are absent unless a confirmed need, sufficient confirmed search inputs, and a functional provider capability all exist.
- The CRUD backend is the sole owner of all durable Plan data. The agent service can request durable changes only through the CRUD contract; it cannot write a shared store or make a Plan mutation on its own.
- An authenticated traveler owns every Plan-scoped operation. A request never supplies an authoritative traveler ID. The service derives it from the validated access token.
- Contract names below are logical operations. The Plan API inventory supplies the provisional browser-facing HTTP mapping for the lifecycle functions requested for this phase; it is not a final transport schema.

## Shared envelope and projections

Every public request carries a managed-identity access token. Every mutating request also carries `requestId` (idempotency key) and, when changing existing Plan state, `expectedPlanRevision`.

| Term | Minimum contract |
| --- | --- |
| `PlanRef` | `planId`, `lifecycleState`, `revision`, `title`, `titleSource`, `updatedAt` |
| `ConversationRef` | `conversationId`, `planId` |
| `RequirementsSnapshot` | `requirementsRevision`, confirmed `destination`, active confirmed entries (`key`, normalized `value`, `origin`, `updatedAt`), and `confirmedAt`; it never contains raw chat or research payloads |
| `ConfirmationChallenge` | opaque `confirmationToken`, `planId`, exact `changeDigest`, `expiresAt`, `singleUse: true`; the browser may display the proposed change but cannot alter it |
| `WorkspaceManifest` | `plan`, `requirementsRevision`, `map`, and an allow-listed `surfaces` array. It contains no generated executable code, credentials, raw provider payloads, or internal agent state. |
| `Problem` | stable `code`, safe traveler-facing message, `retryable`, `requestId`, and optional safe recovery action. It never reveals another traveler's resource existence. |

All responses include `requestId`. Mutations return the durable `revision` that succeeded. A duplicate `requestId` returns the original successful projection rather than applying the operation again.

## Draft Plan API inventory

This is the small API surface the browser needs while Travella remains in the **Draft Plan** phase. Every endpoint derives the traveler from the bearer token and returns only that traveler's data. There is intentionally no `completed`, `past`, or holiday-history endpoint in this phase.

| Browser function | Provisional endpoint / operation | Request | Successful response | Lifecycle effect |
| --- | --- | --- | --- | --- |
| Show all current plans | `GET /v1/plans?view=active` — `list_active_draft_plans` | Optional `cursor` and `limit` | `200` with active Draft Plan cards, most recently active first, and `nextCursor` when needed | None |
| Show soft-deleted plans | `GET /v1/plans?view=deleted` — `list_recently_deleted_plans` | Optional `cursor` and `limit` | `200` with deleted Plan cards, `recoveryDeadline`, and `nextCursor` when needed | None |
| Create a new Plan | `POST /v1/plans` — `create_draft_plan` | `Idempotency-Key` / `requestId`; optional launch hint only | `201` with new `PlanRef`, linked `ConversationRef`, blank brief, and `resumeTarget: conversation` | Creates one empty active Draft Plan and its one Conversation atomically |
| Enter/open a Plan | `GET /v1/plans/{planId}` — `open_plan` | Path `planId` only | `200` with authorized Plan, Conversation, requirements summary when present, and `resumeTarget` | None; browser opens the saved view or Conversation fallback |
| Soft-delete a Plan | `DELETE /v1/plans/{planId}` — `delete_draft_plan` | Path `planId`, `Idempotency-Key` / `requestId`, and `If-Match` / `expectedPlanRevision` | `200` with deleted Plan summary and `recoveryDeadline` | Removes the Plan from active results immediately and starts its seven-day recovery period |
| Restore a soft-deleted Plan | `POST /v1/plans/{planId}/restore` — `restore_draft_plan` | Path `planId`, `Idempotency-Key` / `requestId`, and current deleted revision | `200` with restored active `PlanRef` and resume target | Returns the latest consistent saved Plan state to active Draft Plans |

`DELETE` is a soft delete, not an immediate data purge. Repeating the same delete request returns the original deleted projection. A deleted, expired, or foreign Plan does not disclose data: the browser receives a safe problem response and must refresh the relevant list.

## State ownership

| State | Authoritative owner | Saved | Browser may receive |
| --- | --- | --- | --- |
| Plan lifecycle, title provenance, linked conversation, last view | CRUD backend | Yes | Authorized Plan summaries and resume target |
| Working Planning Brief | CRUD backend | Yes, with entry origin and active/inactive/tentative status | Whitelisted editable brief projection |
| Confirmed Planning Requirements | CRUD backend | Yes, versioned snapshot | Current snapshot and confirmation summary |
| Conversation messages | CRUD backend | Yes, subject to Plan lifecycle | Paginated, authorized conversation projection |
| Agent run, cancellation marker, compact candidates, rejection reasons, evidence references | Agent checkpoint namespace, reconciled with CRUD snapshot | Checkpointed when consistent; not raw research | Whitelisted status, complete shortlist, and source badges only |
| Raw web/provider responses, chain-of-thought, partial candidate cards, credentials | Agent or connector working memory | No | Never |
| Provider capability status and normalized search result data | Connector service | Operational/cache policy remains open | Only agent-issued, validated availability/result projections |
| Map bounds, temporary query/result pins, current comparison | Browser/session context | No; may be discarded | The current client session only |
| Saved selected options, saved pins, custom pins | CRUD backend | Yes | Authorized Canvas projection |

## Phase contracts

### Phase 0 — authenticated entry to My plans

| Trigger and caller | Service owner / operation | Request projection | Response projection | Confirmation and authorization | Failure / recovery |
| --- | --- | --- | --- | --- | --- |
| Post-sign-in browser load or refresh | CRUD backend — `list_my_plans` | Cursor and page size only; identity comes from token | Active Draft Plan summaries, ordered by recent activity, plus a separately scoped Recently deleted summary when requested | No confirmation. Validate token; return only caller-owned Plans. | `unauthenticated`: sign in/refresh token. `authorization_failed`: do not expose foreign Plan data. Transient backend failure: retain prior cached list only as non-authoritative and Retry. |
| Traveler opens Recently deleted | CRUD backend — `list_recently_deleted_plans` | Cursor/page size | Deleted Plan summaries with recovery deadline and remaining period | No confirmation; same ownership rule. | Expired Plans are omitted. Retry transient list failure without changing lifecycle state. |

`My plans` has no agent dependency: the browser can always render its ordinary Plan-management screen from the CRUD projection.

### Phase 1 — create or open a Draft Plan

| Trigger and caller | Service owner / operation | Request projection | Response projection | Saved vs transient state | Confirmation and authorization | Failure / recovery |
| --- | --- | --- | --- | --- | --- | --- |
| Traveler selects **New plan** | CRUD backend — `create_draft_plan` | `requestId`; optional non-authoritative launch hint (for example, entry surface). No destination is required. | New `PlanRef`, linked `ConversationRef`, blank working-brief projection, `resumeTarget: conversation` | Atomically save one active Draft Plan and one linked Conversation; no agent session or destination candidate is created yet. | The button action is sufficient confirmation to create an empty Plan. Token-derived ownership only. | Duplicate request returns same Plan. If the atomic creation cannot complete, create nothing and offer Retry. |
| Traveler selects a Plan from My plans | CRUD backend — `open_plan` | `planId` | Authorized `PlanRef`, linked `ConversationRef`, current requirements summary if present, `resumeTarget` (`conversation` or `workspace`) | Read only; updates no Plan state. | No confirmation; validate token and ownership. | Deleted Plan returns `plan_deleted` with Restore as the only lifecycle action. Missing/foreign Plan returns a privacy-preserving not-found/forbidden result. Unavailable saved view falls back to `conversation`. |
| Traveler chooses **Delete** and confirms the displayed Plan | CRUD backend — `delete_draft_plan` | `planId`, `requestId`, `expectedPlanRevision` | Deleted Plan summary with `recoveryDeadline` | Soft-delete the Plan and make its linked Conversation, requirements, selected items, pins, and checkpoint unavailable; retain them for recovery. | The explicit deletion confirmation is required. CRUD validates token-derived ownership and the expected revision. | Duplicate request returns the same deletion result. A revision conflict reloads the active Plan before a new confirmation. Failure before commit leaves the Plan active. |
| Browser changes between Conversation and workspace | CRUD backend — `record_last_working_view` | `planId`, `view`, `requestId`, `expectedPlanRevision` | New Plan revision and saved `lastWorkingView` | Saves only `conversation` or `workspace`, never ephemeral map/query state. | No separate dialog; this is a non-destructive preference action. Token and ownership required. | Version conflict reloads the current Plan projection and retries only if the requested view is still valid. |

### Phase 2 — attach the Plan Conversation to an agent session

| Trigger and caller | Service owner / operation | Request projection | Response projection | Saved vs transient state | Confirmation and authorization | Failure / recovery |
| --- | --- | --- | --- | --- | --- | --- |
| Browser opens/resumes the Conversation | Agent service (AG-UI) — `open_plan_session` | `planId`, client `requestId`, validated bearer token | `sessionId`, Plan/conversation summary, whitelisted working-brief projection, latest consistent research status, resume instructions | Agent creates or takes over one transient active session. It loads a Plan-scoped checkpoint only after CRUD ownership validation. | No Plan mutation confirmation. Agent validates token, then calls CRUD using the caller identity and Plan scope. | If a prior session is active, return a `takeover_required` projection; the new session does not run concurrently. If checkpoint and CRUD snapshot differ, reconcile before serving; show last consistent snapshot, never partial state. |
| Traveler accepts session takeover | Browser → Agent service — `takeover` | Existing `sessionId`, `requestId` | New active `sessionId`, prior session becomes read-only | Session lease/takeover record is checkpoint state, not a Plan mutation. | Explicit traveler action; same Plan authorization. | If takeover cannot reconcile safely, keep original session active and ask the traveler to retry rather than accepting input from both sessions. |
| Agent loads or writes a checkpoint | Agent service → CRUD backend — `load_plan_context` / `save_consistent_checkpoint` | Service-authenticated request with verified traveler and Plan scope; checkpoint schema version, compact projection digest | Latest durable Plan projection or acknowledged matching revision | Durable Plan remains CRUD-owned; checkpoint is durable only when its state and CRUD revision agree. | Not browser-confirmable directly. CRUD verifies service identity, caller identity, and Plan ownership. | Safe retry on timeout. A partial pair is not exposed as saved progress; recovery loads the latest matched pair. |

### Phase 3 — initial conversational planning

The browser sends typed AG-UI events to the agent service. The agent owns orchestration and user-facing progress; the CRUD backend persists only the allowed Plan data. A newer traveler event cancels the current research-run token before its work can produce a browser-visible result.

| Trigger and caller | Service owner / operation | Request projection | Response projection | Saved vs transient state | Confirmation and authorization | Failure / recovery |
| --- | --- | --- | --- | --- | --- | --- |
| Traveler sends a message | Browser → Agent service — `chat_message` | `sessionId`, `eventId`, message content | Validated assistant message(s), `research_status`, zero or one focused question/choice, and a working-brief delta | Conversation message is saved through CRUD. Active values directly supplied by the traveler may be saved as `traveler_stated`; agent inferences stay tentative in checkpoint state. | Sending the message authorizes research and a conversation record, not a destination, requirements snapshot, option, pin, or booking change. Agent validates session/Plan scope. | Duplicate `eventId` replays the original event outcome. A new message cancels older work. An obsolete run cannot emit `shortlist_ready`. |
| Traveler manually edits or deletes a brief entry | Browser → CRUD backend — `patch_planning_brief` | `planId`, entry additions/edits/deactivations, `requestId`, `expectedPlanRevision` | Updated whitelisted brief and Plan revision | Save active/inactive entries and traveler-edit provenance. A deactivated entry is historical context only and must not rank results. | The explicit Save/apply action is the traveler confirmation for that exact brief patch. | Conflict returns the current brief and requires the traveler to review/reapply. Invalid normalized value returns field-level validation; no partial patch is saved. |
| Agent sees a material inference that conflicts with a traveler entry | Agent service — `propose_tentative_requirement` | Current session and inferred normalized entry; no mutation payload to CRUD | A tentative requirement card or one focused confirmation question | Tentative inference is transient/checkpointed, not an active confirmed requirement. | Requires a later traveler confirmation before it can replace an active traveler-originated entry. | If the session ends, discard the unconfirmed proposal; do not carry it into the workspace gate. |
| Traveler accepts/rejects a tentative entry | Browser → Agent service — `resolve_tentative_requirement` | `eventId`, tentative proposal identifier, accept/reject decision | Updated brief projection or next focused question | On accept, agent requests CRUD `patch_planning_brief` with `origin: traveler_confirmed`; on reject, keep only safe inactive context if relevant. | The accept decision confirms only the displayed normalized entry. | Expired/superseded proposal requires a fresh proposal; duplicate acceptance is idempotent. |
| Agent needs destination research | Agent service → connector/research tools — `run_destination_research` | Plan-scoped normalized active brief, run ID, and provider-neutral query; never raw browser authority | Concise status and, only when complete, one `shortlist_ready` projection (at most five compact candidates and source badges) | Compact candidates, rejection reasons, and evidence references can be checkpointed. Raw sources/results and partial cards are transient. | Research requires no Plan-mutation confirmation. Private tool calls use service credentials; browser never calls connector. | Bounded retries. Preserve the previous completed shortlist while refreshing; on failure emit `unable_to_continue` with Retry/one focused question. Never invent results or substitute a provider silently. |
| Traveler explores, rejects, extends, names, or inspects a candidate | Browser → Agent service — `candidate_action` | `eventId`, candidate/action reference | Candidate detail, source-panel projection, updated complete list, or destination proposal | Candidate status/rejection can be checkpointed; opening a source is transient. No Selected Option or Map Pin is created. | No Plan mutation confirmation except selecting the destination enters Phase 4. | Unknown/stale candidate action reloads current completed shortlist. Source retrieval failure leaves the candidate available and reports the limitation. |

### Phase 4 — confirm Planning Requirements and destination

This is a two-step challenge-and-commit protocol. It makes the exact workspace input reviewable and prevents an agent-generated request from changing a Plan without the traveler's UI action.

| Trigger and caller | Service owner / operation | Request projection | Response projection | Saved vs transient state | Confirmation and authorization | Failure / recovery |
| --- | --- | --- | --- | --- | --- | --- |
| Traveler selects a destination candidate or asks to continue with stated needs | Browser → Agent service — `prepare_requirements_confirmation` | `sessionId`, `eventId`, candidate/destination reference or current brief reference | Exact proposed `RequirementsSnapshot`, unmet required inputs if any, and (when ready) `ConfirmationChallenge` | Proposal is transient/checkpointed. No destination or requirements snapshot changes yet. | The browser action requests a challenge only. Agent must resolve the proposal against the latest Plan revision. | If destination is absent or the active entries are not sufficient, return `requirements_not_ready` with one next question; do not mint a commit challenge. If the Plan revision changed, regenerate the proposal. |
| Traveler reviews and chooses **Confirm requirements** | Browser → Agent service → CRUD backend — `commit_initial_requirements` | Opaque `confirmationToken`, `requestId`, `expectedPlanRevision`; browser may not submit edited snapshot fields | Confirmed `RequirementsSnapshot`, confirmed `PlanRef` with destination, updated title if still automatic, and `workspaceReady: true` | Atomically save the first confirmed destination and requirements snapshot; create matching checkpoint/revision. Existing direct traveler brief entries remain the source material. | Required: an unexpired, single-use challenge bound to exact traveler, Plan, expected revision, destination, and entry digest. CRUD validates all bindings. | `confirmation_expired`, `confirmation_used`, `confirmation_mismatch`, or revision conflict changes nothing and starts a new review. Checkpoint pairing failure is retried safely before `workspaceReady` is emitted. |
| User declines or edits instead | Browser → Agent service — `decline_requirements_confirmation` | `eventId`, optional reason/brief-edit intent | Returns to conversation/brief editing state | No confirmed snapshot is created or changed. | The decline is not a Plan mutation. | Preserve the working brief and completed research; discard only the proposed challenge after expiration/cancellation. |

For this initial transition, the Plan has no prior confirmed destination-specific Selected Options or pins. A later destination-change operation must use its own replacement/clearing confirmation rather than reuse `commit_initial_requirements`.

### Phase 5 — generate and open the workspace

`generate` means compose a validated projection from confirmed data and current capabilities. It does **not** mean have a model generate arbitrary UI or automatically start provider searches.

| Trigger and caller | Service owner / operation | Request projection | Response projection | Saved vs transient state | Confirmation and authorization | Failure / recovery |
| --- | --- | --- | --- | --- | --- | --- |
| Successful requirements commit or traveler opens a workspace-ready Plan | Browser → Agent service — `get_workspace_manifest` | `planId`, current requirements revision, `requestId` | Validated `WorkspaceManifest`: permanent `map` section, saved Canvas projection, and eligible optional surfaces | Manifest and provider eligibility are transient. The saved Plan, requirements, selected items/pins, and last working view remain CRUD data. | No new confirmation: the manifest cannot mutate Plan state. Agent validates token and reads Plan through CRUD. | If capability lookup fails, return a map-only manifest plus retryable capability status; never expose a guessed provider surface. If the agent is unavailable, browser opens a CRUD-backed map-only Canvas and retries the manifest later. |
| Agent evaluates optional surfaces | Agent service → connector service — `evaluate_workspace_capabilities` | Confirmed requirements only, destination, and requested capability types; no raw chat | Provider-neutral capability projection with `functional` availability and input sufficiency | Operational capability is transient. Provider credentials and detailed provider responses stay private. | Connector trusts only authorized Travella service identity; browser cannot invoke it. | Treat timeout/error/unavailable as not eligible for this render. Hide the dependent surface; the permanent map remains. |
| Frontend renders workspace | Browser frontend — `render_workspace_manifest` | Validated manifest and authorized CRUD Canvas projection | Map-first workspace; optionally approved `accommodation`, `flight`, and/or `car_rental` surfaces | Current map bounds, unsaved searches, and temporary pins are transient; selected items/pins remain server-saved only after later explicit confirmation flows. | Rendering requires no confirmation and cannot create a selected option, pin, supplier redirect, or booking. | Reject malformed/out-of-catalog manifest sections and use map-only fallback. A missing provider surface is not an error state and is not replaced with demo data. |

#### Optional-surface eligibility

The agent may include an optional surface only when all three conditions hold:

| Surface | Confirmed need | Minimum confirmed inputs | Functional capability |
| --- | --- | --- | --- |
| `accommodation` | A stay/accommodation need is active | Destination; dates and party/room details when the connected provider requires them | Accommodation provider capability is functional |
| `flight` | Air travel is active | Destination plus origin and travel dates (and passenger/cabin constraints when required) | Flight provider capability is functional |
| `car_rental` | Car rental is active | Destination/pickup location plus pickup/return timing and driver constraints when required | Car-rental provider capability is functional |

The frontend receives only enabled surfaces. It must not infer eligibility from a partially filled brief, provider name, or a previous render. The map is always enabled for a workspace-ready Plan and is centered from the confirmed destination; it can later display only saved Map Pins as defined by US-003.

## Cross-cutting authorization, concurrency, and recovery

| Concern | Required behavior |
| --- | --- |
| Authentication | Each public agent/CRUD request independently validates the same managed-identity access token. Tokens and identifiers are not logged or placed in URLs. |
| Authorization | CRUD applies Plan ownership using the token-derived traveler. Agent validates the same scope before reading/checkpointing or invoking private tools. Connector accepts only authorized service calls. |
| Idempotency | Browser mutation/event IDs are retained long enough to safely replay interrupted requests. `create_draft_plan`, brief patches, confirmation commits, and session events cannot duplicate work or create contradictory Plan state. |
| Ordering | `expectedPlanRevision` protects durable mutations. `eventId` and research-run IDs prevent late agent results from replacing newer context. A newer traveler message cancels the prior run before result delivery. |
| Confirmation | Confirmation challenges are short-lived, single-use, bound to the exact change and expected revision, and validated only by CRUD. An agent instruction, tool result, or browser-edited summary cannot satisfy the challenge. |
| Deletion/recovery | Deleted Plans are unavailable to agent sessions and workspace generation. Restoring within seven days restores the latest matched CRUD/checkpoint snapshot. Expiry purges identifiable Plan, conversation, and checkpoint data. |
| Privacy | Browser projections are allow-listed. Do not expose full checkpoints, raw provider/web data, internal reasoning, service credentials, or another traveler's existence. Observability uses redacted metadata and trace IDs. |

## Documentation gaps to resolve before implementation

1. **Requirements vocabulary and readiness:** the existing stories define a Planning Brief but not the exact normalized `Planning Requirements` snapshot, required fields, or whether a traveler can intentionally create a map-only workspace before dates are known. This contract uses confirmed destination plus snapshot as the initial gate.
2. **Confirmation transport:** token issuance, TTL, digest algorithm, revocation, retention, and the precise AG-UI event/component schema remain unspecified.
3. **Conversation persistence:** message pagination, edit/redaction policy, attachment policy, retention, and the exact atomic boundary between a CRUD revision and LangGraph checkpoint need a data-design decision.
4. **Workspace manifest/catalog:** the approved map configuration, optional-surface component catalog, validation schema/versioning, and fallback UX are not yet defined.
5. **Capability registry:** the source of truth, health semantics, caching/TTL, rollout control, and test-mode behavior for a provider being `functional` are open. The contract deliberately makes unavailable modes invisible.
6. **Provider input policy:** required fields, date flexibility rules, currency/locale, accessibility constraints, and provider-specific capability variations are not specified.
7. **Concurrency and reconnect details:** session-lease duration, takeover UX, idempotency retention period, Plan revision format, and checkpoint reconciliation retry policy need precise operational values.
8. **Lifecycle boundary after this phase:** destination change after selections, later selection/pin mutations, provider search, and supplier redirect need compatible detailed contracts before their implementation starts.

## Non-goals of this artifact

- It does not implement an endpoint, UI, database schema, provider integration, LangGraph node, or external resource.
- It does not settle the model provider, final AG-UI/A2UI schema, database technology, connector/provider set, or AWS deployment.
- It does not broaden the MVP to multi-destination planning, bookings, payment, automatic Plan changes, or autonomous supplier actions.

## Source decisions

- [Travella overview](../overview.md)
- [Architecture foundations](architecture-foundations.md)
- [US-001 — Access a private Travella account](../user-stories/login/README.md)
- [US-002 — Research and shape a plan through conversation](../user-stories/agentic-plan-research/README.md)
- [US-003 — Select options and maintain the planning canvas](../user-stories/option-selection-and-canvas/README.md)
- [US-004 — Create, resume, and recover Plans](../user-stories/plan-lifecycle/README.md)
- [Service-boundary ADR](../adr/0001-separate-agent-data-and-connector-services.md)
- [Phase-1 contract decision log](mvp-phase-1-contract-decision-log.md)
- [Draft Plan API endpoints diagram](draft-plan-api-endpoints.drawio)
- [Draft Plan delete and recovery flow](draft-plan-delete-recovery-flow.drawio)
