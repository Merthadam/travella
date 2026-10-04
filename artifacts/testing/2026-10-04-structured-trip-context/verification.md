# Structured Trip Brief / A2UI implementation evidence

Date: 2026-10-04
Status: Implementation available locally; behavioral acceptance remains unverified.

## Scope

- A registered TripBrief A2UI v0.9 component uses the official React renderer and web core (0.12.0).
- Its data binding points to the shared context: candidates/final destination, dates (including a tentative timing note), travelers, budget, and flight/accommodation needs. Provenance is metadata; progress is derived.
- AG-UI CUSTOM events carry A2UI surface/component/data messages. STATE_SNAPSHOT carries the same accepted context. Sidebar A2UI actions return through the agent stream in forwardedProps and invoke validated CRUD edits without a model call.
- SDK structured routing extracts allowed state_changes, the answer writer streams text, and the service assembles a validated JSON result {answer, state_changes}. This is deliberately not incremental parsing of partially generated JSON.
- Research only adds supported destination candidates. Personal decisions/removals require traveler intent. The prompt guides completion while allowing open research and deferral.
- CRUD owns a separate research_contexts record; migration 0009 adds its table without changing existing requirements or memory. Run completion saves context and complete conversation messages in one transaction. Context revisions and expiring leases prevent conflicting updates. AgentCore session cancellation also releases the lease through CRUD.

## Executed observations

- `git diff --check`: passed.
- `uv run --locked python -m compileall -q services/trip_context.py services/agent services/crud services/auth`: passed.
- `npm --prefix frontend run build`: passed. Vite reports a >500 kB bundle warning after adding the official A2UI renderer (about 575 kB / 164 kB gzip); bundle splitting remains a future optimization.
- `bash scripts/start-local-ready.sh`: rebuilt services, applied the required migration during startup, passed container health and example-account sign-in/session/sign-out checks. Database volumes preserved.
- Agent health reports Claude Agent SDK with claude-sonnet-5-5.
- Six source hashes match the running container: shared context contract, agent service, context repository, auth gateway API, A2UI component, and context hook.
- Chrome DevTools: refreshed the existing isolated browser session, opened a current Plan, and observed the Trip Brief rendered without a component error. The console contained only the Lit development-mode warning on that page. No Plan values were changed during this read-only observation.

## Unexecuted / blocked checks

- No automated tests added or run, following the session instruction.
- No live model conversation or paid research call was run. Automatic extraction, clear/remove behavior, inferred-source labels, cancellation races, and cross-session persistence still need manual acceptance.
- Full CRUD create/update/delete/ownership and conflicting-revision behavior was not exercised against HTTP. These are required by the project skill before claiming verified delivery.
- A before screenshot was not captured. Chrome DevTools rejected screenshot writes to this worktree because its configured workspace roots differ. An inline screenshot request then did not return and was terminated; no screenshot evidence is claimed.
- The existing browser session could be refreshed, but the public session response does not reveal identity. The startup checker independently authenticated the configured example account; the read-only browser observation is not claimed as full example-account journey verification.

## Manual review

Open http://localhost:5174 and refresh. On a Plan, try a message describing two travelers, driving and accommodation needs; inspect sidebar updates after completion. Then correct the count, clear a budget, add/remove a candidate, and explicitly choose a final destination. Edit the same fields in the sidebar, reopen the Plan, and exercise Stop before the reply finishes. None of these steps above is represented as already executed.

## Sources used for implementation

- https://code.claude.com/docs/en/agent-sdk/structured-outputs
- https://github.com/a2ui-project/a2ui/tree/main/renderers/react
- https://a2ui.org/guides/renderer-development/
- https://github.com/a2ui-project/a2ui/blob/main/specification/v0_9/docs/a2ui_protocol.md
