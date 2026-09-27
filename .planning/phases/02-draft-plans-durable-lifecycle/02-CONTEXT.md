# Phase 2: Draft Plans & Durable Lifecycle - Context

**Gathered:** 2026-09-27
**Status:** Ready for research and planning; Phase 1 completion remains unverified

<domain>
## Phase Boundary

Deliver private My plans and the create, open/resume, rename, delete, restore, and seven-day purge lifecycle for multiple Draft Plans. Creation atomically links one Conversation. CRUD exclusively owns durable Plan data and enforces authorization, revisions, idempotency, and exact confirmation. Covers PLAN-01–PLAN-08, TRUST-01, TRUST-02, and TRUST-05.

Conversation orchestration, destination research, workspace composition, provider searches, saved selections, and supplier handoff belong to later phases. Establish compatible lifecycle contracts without implementing those later capabilities.

</domain>

<decisions>
## Implementation Decisions

### Existing documented decisions — carried forward, not reopened
- **D-01:** Use the accepted stories, architecture, and service contracts as the product baseline. The traveler explicitly asked to discuss actual gaps rather than repeat documented decisions.
- **D-02:** My plans shows only the authenticated traveler's active Draft Plans in most-recent-activity order. Multiple Plans are supported; no completed, archived, duplicated, or shared Plan state is introduced.
- **D-03:** New plan immediately creates an empty Draft Plan and one linked Conversation atomically, then opens that Conversation. No destination form or additional creation dialog is required; the existing contract treats the button action as sufficient confirmation.
- **D-04:** Context-aware automatic titles are permitted only while the title has automatic provenance. A manually entered title is authoritative and must never be overwritten by an automatic update.
- **D-05:** Opening a Plan resumes its last Conversation or Planning Canvas view, with Conversation as the safe fallback. Opening through GET remains read-only. Saving the last working view is a separate authorized action with no extra dialog, as already documented.
- **D-06:** Explicit deletion confirmation removes a Draft Plan from active results and places it in Recently deleted for seven days. Show its recovery deadline/remaining period. Restore the latest consistent saved state and original linked Conversation; do not recreate the Plan. Expired Plans cannot be restored, and identifiable Plan-scoped data must be purged.
- **D-07:** CRUD remains the sole durable-data owner. Derive ownership from independently validated managed-identity tokens. Retain request IDs, expected revisions, and exact single-use confirmation contracts; never infer authority from browser-supplied traveler identity. Expose only authorized, allow-listed projections.
- **D-08:** Follow documented safe-failure behavior: retries do not duplicate changes, a failed atomic creation saves nothing, a failed pre-commit deletion leaves the Plan active, and deletion conflicts require a current projection and fresh confirmation. Cached lists during a transient failure are non-authoritative and offer Retry.

### Product gaps resolved in this discussion
- **D-09:** Opening or changing a Plan moves it to the top of My plans. Record the visit separately from Plan-content changes. Research must define the explicit visit-recording operation while preserving read-only GET behavior; passive polling must not be confused with a traveler opening a Plan.
- **D-10:** Show a suggested automatic title in the related confirmation so one traveler action confirms both changes. For example, a destination confirmation includes the resulting title. Do not silently persist an unreviewed title or add a separate title-confirmation dialog. This does not weaken protection of manually entered titles or pull destination implementation into Phase 2.
- **D-11:** Successful restoration immediately opens the restored Plan in its last working view, falling back to Conversation. The Plan also returns to active My plans; restoration does not stop at a success message in the list.
- **D-12:** On a rename revision conflict, preserve the traveler's entered title and show the latest saved title. Require the traveler to review and explicitly apply the rename again against current state. Do not overwrite newer state or automatically resubmit the stale rename. This preservation does not override Phase 1's rule to discard private in-progress state on involuntary re-authentication.

### Technical research and planning responsibilities
These are unresolved engineering details, not additional user-approved product decisions:
- Select the transactional store and schema, migration approach, atomic Plan/Conversation creation, lifecycle transitions, title provenance, and compatible future snapshot boundaries. Do not assume the local auth SQLite store is an approved production Plan database.
- Specify request-ID scoping, payload binding, retention, duplicate-result handling after later lifecycle changes, revision format, and conflict responses.
- Specify confirmation issuance, TTL, digest binding, replay prevention, and transaction boundaries. Reconcile the roadmap's general challenge requirement with documented direct-action confirmations for creation, rename, navigation preferences, and restoration; do not invent extra dialogs where an exact explicit action suffices.
- Define the visit/activity operation, ordering and tie-breaking, repeated-open handling, and interaction with revisions and saved-view updates without making GET mutate state.
- Define the initial empty-Plan title, title normalization/limits, and proposal boundaries consistent with D-03, D-04, and D-10. Exact naming copy remains unspecified.
- Define exact recovery-deadline comparison, restore-versus-purge races, retries, scoped deletion across future services, and retained operational records that cannot preserve identifiable deleted Plan content.
- Specify independent CRUD token validation and the browser/session-to-CRUD path with server-held Cognito tokens; define authenticated service contracts without trusting caller-supplied identity.
- Use the existing screen reference for the card direction and Recently deleted entry. Resolve remaining layout/copy details in UI planning within the accepted stories; the screenshot is not authority for unrelated prototype features.

### Dependency status
Phase 1 remains incomplete. Its latest `01-VERIFICATION.md` records passing local checks but blocks completion on live Cognito verification. `STATE.md` still describes older implementation gaps and must not be treated as proof those gaps remain. Planning Phase 2 does not mark Phase 1 complete or authorize AWS provisioning, which remains deferred.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Product and scope
- `docs/user-stories/plan-lifecycle/README.md` — primary lifecycle story, acceptance criteria, and existing decisions.
- `.planning/ROADMAP.md` — Phase 2 goal, requirements, dependency, and success criteria; its phase numbering differs from the older service-contract journey stages.
- `.planning/REQUIREMENTS.md` — PLAN-01–PLAN-08 and TRUST-01, TRUST-02, TRUST-05.
- `.planning/PROJECT.md` — product authority, privacy, ownership, and scope constraints; its no-implementation statement is historical.
- `CONTEXT.md` — stable domain vocabulary; current Draft-only scope is governed by the accepted lifecycle story.
- `docs/overview.md` — consolidated product boundaries.
- `docs/user-stories/agentic-plan-research/README.md` — exact confirmation and future Plan-scoped checkpoint/lifecycle constraints.

### Contracts and architecture
- `docs/planning/mvp-phase-1-service-contracts.md` — provisional browser lifecycle APIs, read-only open, last-view mutation, confirmation, ownership, and safe-failure contracts.
- `docs/planning/mvp-phase-1-contract-decision-log.md` — contract decisions, especially Draft-only scope and open technical questions.
- `docs/planning/architecture-foundations.md` — accepted service ownership and deployment boundaries.
- `docs/adr/0001-separate-agent-data-and-connector-services.md` — service separation.
- `docs/planning/draft-plan-api-endpoints.drawio` — browser API inventory.
- `docs/planning/draft-plan-delete-recovery-flow.drawio` — deletion, restoration, expiry, and safe failures.
- `docs/user-stories/plan-lifecycle/plan-lifecycle-state.drawio` — lifecycle state model.

### UI and prior phase
- `docs/planning/draft-plan-ui.jpg` — existing Draft card and Recently deleted visual reference. Prototype commentary includes additional features that are not accepted Phase 2 scope.
- `docs/screens/README.md` — screen inventory and story-first wireframe rules.
- `docs/screens/figma-make-context.md` — supporting visual/product context; accepted stories and phase decisions govern conflicts.
- `.planning/phases/01-account-access/01-CONTEXT.md` — calm desktop-first direction, My plans entry, session-expiry return, and private-state discard rules.
- `.planning/phases/01-account-access/01-VERIFICATION.md` — latest local evidence and remaining live Cognito verification dependency.
- `.planning/research/STACK.md` — accepted Cognito, service boundaries, and still-open storage choices.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `frontend/src/AccountApp.jsx` — signed-in My plans placeholder, session polling, expiry handling, account controls, busy/error states, and accessible form patterns.
- `frontend/src/api.js` — same-origin cookie requests, safe API errors, non-cacheable requests, and deduplicated session refresh. Its current helper supports GET/POST; lifecycle PATCH/DELETE and revision/idempotency headers need an appropriate extension.
- `services/auth/authorization.py` — token-derived traveler key and ownership guard.
- `services/auth/jwt_verifier.py` and `services/auth/token_validator.py` — existing managed-identity boundary to inspect for reuse in independently validating public services.

### Established Patterns
- Separate React frontend and Python/FastAPI service code, with uv-managed Python dependencies.
- Browser holds an opaque HttpOnly session cookie; Cognito tokens remain server-side. Preserve this boundary when designing CRUD access.
- `scripts/check.sh` is the local verification entry point. Existing auth tests and frontend tests provide integration patterns; the current pytest configuration targets auth tests and will need to include new service tests during implementation.

### Integration Points
- Replace the signed-in My plans placeholder with authorized lifecycle UI while retaining account/session behavior.
- Add a distinct CRUD service; auth does not become the durable Plan-data owner.
- Provide a real linked Conversation identity and safe resumable shell without claiming later agent/workspace capabilities already exist.

</code_context>

<specifics>
## Specific Ideas

- My plans should behave like a recent-work list: opening a Plan is enough to bring it to the top.
- Related confirmations show the proposed automatic title alongside the underlying change.
- Restore takes the traveler directly back into the Plan.
- A rename conflict retains the attempted title so the traveler can compare and reapply it deliberately.

</specifics>

<deferred>
## Deferred Ideas

None added. Existing later-phase conversation, destination, workspace, provider, and supplier capabilities remain outside this phase. AWS provisioning remains deferred under the earlier instruction.

</deferred>

---

*Phase: 02-draft-plans-durable-lifecycle*
*Context gathered: 2026-09-27*
