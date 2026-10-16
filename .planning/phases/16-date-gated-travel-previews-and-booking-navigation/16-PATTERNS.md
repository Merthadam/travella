# Phase 16: Date-gated travel previews and booking navigation — Pattern Map

**Mapped:** 2026-10-16  
**Scope:** 21 proposed file/responsibility assignments; final filenames belong to the planner.  
**Analog coverage:** 20 assignments have existing patterns; deterministic date-evidence parsing has only a partial trust-boundary analog.  
**Sources:** `16-CONTEXT.md`, `16-RESEARCH.md`, `16-UI-SPEC.md`, existing tracked source. No production files were changed by this mapping.

## File Classification

Names marked **new/proposed** describe recommended module boundaries, not existing files or mandatory filenames. Existing transport, runtime and graph files listed as “inspect” need changes only where the typed result integration or safety investigation demonstrates a gap.

| New/modified file or responsibility | Role | Data flow | Closest analog | Match quality |
|---|---|---|---|---|
| `services/agent/claude/canvas_travel.py` — new/proposed observer | service | request-response, transform | `services/agent/claude/canvas_editor.py` `_MapsObserver` | Exact bounded-tool/registry pattern |
| `services/agent/canvas_travel_dates.py` — new/proposed evidence gate | utility | transform | `canvas_editor.py` `_explicit_addition`; `travel_contracts.py` exact-date validators | Partial: authority check and syntax validation exist separately |
| `services/agent/canvas_travel_contracts.py` — new/proposed strict public DTO | model | transform | `services/agent/editing_contracts.py` | Exact allowlisted projection pattern |
| `services/agent/editing_contracts.py` — optional travel result field | model | streaming projection | Existing `CanvasEditResult` / `PublicCanvasEditResult` | Exact |
| `services/agent/claude/canvas_editor.py` — compose travel observer | service | event-driven SDK loop | Existing editor options, registry reconstruction and result construction | Exact |
| `services/agent/research_assets/.claude/skills/canvas-travel/SKILL.md` — new/proposed | config | file I/O into SDK session | Existing bundled `canvas-activities/SKILL.md` | Exact packaging, adapted policy |
| `services/agent/prompts/canvas-editing-v1.md` — travel policy | config | model context | Existing editing prompt and activity skill | Role match; travel date policy is new |
| `services/agent/graph/nodes/canvas_editing.py` — integration inspection | service | graph event-driven | Existing node invokes editor with scoped context | Exact |
| `services/agent/service.py` — public projection integration | service | authenticated request/streaming | Existing Plan read and `canvas_edit_result` terminal/snapshot emission | Exact |
| `services/agent/checkpoint.py`, `graph/builder.py` — persistence investigation | utility/config | file/database serialization | Existing checkpoint allowlist and graph construction | Partial; nested transient omission must be demonstrated |
| `services/agent/travel_client.py`, `travel_routes.py`, `travel_contracts.py` — reuse/inspect | service/controller/model | request-response | Existing authenticated private search and exact-date contracts | Exact transport, not an agent tool allowlist |
| `services/agent/claude/runtime.py` — skill packaging inspection | utility | file I/O, SDK options | Existing bundled `.claude` copy into isolated session | Exact; new asset normally needs no runtime behavior change |
| `frontend/src/features/plans/travel/canvasTravelSchema.js` — new/proposed | model | transform | Zod schemas in `ActivitySuggestions.jsx` | Exact strict public schema pattern |
| `frontend/src/design-system/a2ui/TravelSuggestions.jsx` — new/proposed | component | event-driven rendering | `ActivitySuggestions.jsx` separate catalog and action guard | Exact surface pattern |
| `frontend/src/features/plans/useCanvasConversation.js` — ingest transient snapshots | hook/store | streaming, event-driven | Existing staged snapshot, terminal and epoch guards | Exact |
| `frontend/src/features/plans/components/CanvasConversation.jsx` — render previews | component | event-driven rendering | Existing per-assistant-message activity surface | Exact |
| `frontend/src/features/plans/components/PlanningCanvas.jsx` — results view/navigation | component/store | event-driven | Existing hidden-but-mounted Canvas/chat/travel panels | Exact preservation pattern; browser-history entry is new |
| `frontend/src/features/plans/travel/CanvasTravelResults.jsx` — new/proposed | component | read-only rendering | `TravelSearch.jsx` pure `Price` / `Leg` presentation only | Role match; do not reuse checkout-capable orchestration |
| Travel preview/result styles — new scoped CSS or existing feature styles | config | rendering | `canvas-conversation.css`, `travel-search.css`, design-system tokens | Exact visual vocabulary |
| `services/agent/tests/test_canvas_travel.py` — new/proposed; extend boundary tests | test | request-response, transform, streaming | `services/agent/tests/test_travel_api.py` | Exact auth/provider-call assertions; SDK fixture coverage additionally required |
| Frontend schema/surface tests plus `PlanningCanvas.test.jsx` | test | event-driven, streaming | Existing `PlanningCanvas.test.jsx`; `TravelSearch.test.jsx` for legacy regression | Exact interaction harness |

## Pattern Assignments

### 1. Run-local travel observer and editor composition

**Primary analog:** `services/agent/claude/canvas_editor.py:48-159`.

The observer owns the authenticated caller context, input bounds, allowed tool names, provider registry and safe error mapping. Keep a separate travel observer, not a generalized arbitrary-action tool. The existing Maps observer binds Plan identity at the call site:

```python
# canvas_editor.py:80-85
return await self.client.call(
    name, {**arguments, "plan_id": self.context.plan_id},
    subject=self.context.traveler_scope, plan_id=self.context.plan_id,
    authorization_token=self.authorization_token,
)
```

For travel, preserve that binding but call the existing transport using fixed host-selected read-only actions. `TravelClient.call` has a generic `travel_search` action envelope because the legacy UI also supports checkout; this broad transport is not safe to expose directly as an SDK tool. The model must not supply Plan identity, arbitrary action names or connector URLs.

**Validation and errors:** copy the shape of `_MapsObserver.invoke` (`canvas_editor.py:98-143`): validate before calling, bound requests, validate provider output, allowlist fields, and register only validated observations. Preserve cancellation propagation and return a safe limitation for other failures:

```python
except asyncio.CancelledError:
    raise
except Exception:
    self.unavailable = True
    # Return a fixed safe travel error; do not serialize the exception or response.
```

Travel-specific additions required by research: exact traveler-grounded date gate before any provider lookup; five total calls per turn (one capability, two lookups, two searches, at most one search per mode); memoize identical requests within the turn; no checkout tokens in model summaries or output snapshots. Do not copy Maps' numeric limits blindly.

**SDK options:** current source at `canvas_editor.py:196-201` explicitly defines tool visibility and enforcement:

```python
options.tools = ["Skill"]
options.allowed_tools = ["Skill", *[f"mcp__maps__{name}" for name in sorted(observer.names)]]
options.skills = ["canvas-activities"]
options.setting_sources = ["project"]
options.mcp_servers = {"maps": observer.server()}
options.hooks = {"PreToolUse": [HookMatcher(hooks=[observer.before])]}
```

Compose a single deny-by-default hook that permits exactly the existing Maps names, the new read-only travel names, both exact bundled skill names and StructuredOutput. Do not install both independent deny-by-default observer hooks unchanged: each could deny the other's tools. Preserve the existing streaming observer interface (`ChatAnswerStream`) when composing observers.

**Host reconstruction:** `canvas_editor.py:211-223` validates structured output, rejects unknown IDs and copies facts from the registry:

```python
for selected in reply.suggestions:
    if selected.id not in observer.places:
        raise ResearchWorkerError("canvas_unknown_place")
    projected.append(observer.places[selected.id].model_copy(update={"reason": selected.reason}))
```

Travel selection must follow this pattern: model IDs may select observed options, but prices, carrier/property names, terms, timestamps and search identity come from the host. Preserve `state_changes: []`; no travel result modifies the Plan. An empty result is explicit host state, not fabricated cards.

### 2. Strict travel projection and date evidence

**Primary analog:** `services/agent/editing_contracts.py:29-79`; existing travel syntax constraints in `services/agent/travel_contracts.py:42-105`.

```python
# editing_contracts.py:63-67
class CanvasEditResult(StrictResult):
    suggestions: list[ActivityPlace] = Field(default_factory=list, max_length=5)
    add_ids: list[Annotated[str, Field(max_length=80)]] = Field(default_factory=list, max_length=5)
    area: MapArea | None = None
```

Add travel as an optional field with a backward-compatible default. Define new strict nested travel DTOs rather than subclassing the generic `Public` travel outputs: those outputs accept unknown fields and explicitly contain checkout tokens. Bounds apply to IDs, strings, collections and total bytes. Mode-discriminated criteria/results must reject mixed flights/stays, duplicate IDs, invalid price basis and dates. Preserve unknown values as null/unavailable instead of coercing them to zero or false.

Use existing `FlightSearch` / `HotelSearch` for syntax, country, party and date horizon validation after evidence is resolved. Their exact ISO validator is:

```python
# travel_contracts.py:42-49
def exact_date(value):
    if (
        not isinstance(value, (str, date))
        or isinstance(value, str)
        and not re.fullmatch(r"\d{4}-\d{2}-\d{2}", value)
    ):
        raise ValueError("Use an exact ISO date.")
    return value
```

Date authority is a new policy, not provided by this validator. `_explicit_addition` (`canvas_editor.py:35-45`) provides the useful precedent of checking a verbatim current user span rather than trusting a model assertion. Do not copy its add/pin regex for dates. Implement research's conservative precedence: current explicit correction, otherwise exact current draft dates, otherwise uniquely grounded exact server-authenticated traveler text; conflicting/ambiguous current instructions block older values. Assistant/provider text is never date authority. Unsupported date syntax asks a focused question. This helper has no complete analog.

### 3. Commit streaming results only after successful completion

**Primary analog:** `frontend/src/features/plans/useCanvasConversation.js:38-76`.

```javascript
let pending = null;
// Within onEvent:
if (runRef.current !== run || epoch.current !== run.epoch) return;
if (event.type === 'STATE_SNAPSHOT' && event.snapshot.canvas_edit_result)
  pending = canvasEditResultSchema.parse(event.snapshot.canvas_edit_result);
```

The hook rechecks identity after the API promise returns, rejects error/interrupted terminals, returns without applying stopped turns, then requires a complete parsed snapshot. Extend this staging boundary; do not publish travel options directly on a streaming chunk. Stop immediately nulls `runRef` and aborts the request (`useCanvasConversation.js:80-87`), so late results cannot reappear.

Store immutable token-free snapshots in the mounted Plan state with host identity, criteria fingerprint, observation time and ten-minute local UI expiry. Reference snapshots by ID from message cards. Clear on Plan switch and bound retained collections. No localStorage/sessionStorage or durable conversation-card replay. After reload, historical text may remain, but missing results must show recovery copy, not reconstruct inventory from prose. Compare only provider-relevant criteria; arbitrary note edits do not invalidate results.

**Backend seam:** `services/agent/service.py:395-400` passes `canvas_edit_result` in its terminal queue item. Update public schema/serialization consistently with snapshot emission and the browser parser. `graph/nodes/canvas_editing.py:15-27` already constructs TurnContext and passes authorization via request context; no parallel booking graph or initial-chat tools are required.

### 4. Fixed A2UI component and source-bound action

**Primary analog:** `frontend/src/design-system/a2ui/ActivitySuggestions.jsx:70-108`.

Imports already used by the project:

```javascript
import { z } from 'zod';
import { Catalog, MessageProcessor } from '@a2ui/web_core/v0_9';
import { A2uiSurface, createBinderlessComponentImplementation } from '@a2ui/react/v0_9';
```

Copy the separate ephemeral catalog, strict data schema, fixed root component and `useRef` processor lifecycle. The action boundary verifies surface and source component before accepting an allowlisted action:

```javascript
// ActivitySuggestions.jsx, processor callback inside ActivitySuggestions
if (action.surfaceId === surfaceId && action.sourceComponentId === 'root'
    && ['preview_activity', 'add_activity'].includes(action.name))
  callback.current(action.name, action.context);
```

For travel, permit one fixed internal View all action with a strict snapshot ID and matching mode; look it up in the owned mounted registry. No action accepts arbitrary URLs, provider payloads or checkout tokens. Apply source/schema validation before opening anything. The view renders three or fewer observed cards and truthful count copy from UI-SPEC. Use the existing renderer failure fallback pattern, but travel-specific copy.

`CanvasConversation.jsx` already places `ActivitySuggestions` inside the corresponding assistant `<article>` and preserves unsent composer state locally. Add the travel surface at the same message-level seam. Do not attach it to the initial conversation component or remount CanvasConversation when opening results.

### 5. Preserve Canvas state while presenting results

**Primary analog:** `frontend/src/features/plans/components/PlanningCanvas.jsx:39-56,156-165`.

Existing navigation stores the active screen in the parent, keeps visited travel panes mounted, hides the Canvas and chat panel with `hidden`, and restores the initiating control's focus. The essential preservation shape is:

```jsx
// PlanningCanvas.jsx:165 (abridged props only)
<div id="plan-chat-panel" className="canvas-chat-panel"
     hidden={Boolean(screen) || !chatOpen}>
  <CanvasConversation visible={chatOpen && !screen} ... />
</div>
```

The ellipsis above is explanatory, not pasteable JSX. Keep the real component props intact. Add a separate results-only screen identity that cannot alias `flights` / `accommodation` legacy checkout panes. Own search snapshots and return-focus metadata above the transient screen. Restore mobile Plan chat tab, composer, open card editor and chat scroll. Results entry focuses its heading. Browser Back needs explicit integration and cleanup; existing local `setScreen` state alone is not evidence of history support.

**Presentation-only secondary analog:** `TravelSearch.jsx:167-208` `Price` / `Leg` correctly distinguish total basis, missing stops and next-day arrival. Reuse/extract pure pieces only:

```jsx
<small>
  {stay ? "Total for all rooms & nights" : "Return total · all travelers"}
</small>
```

The new page must not import a flow that automatically searches on mount or enables `Detail`, prebook, verification, payment or mock checkout. Existing source price display is an analog, not permission to omit estimated/unknown/excluded-tax handling required by UI-SPEC.

Styles use existing `--ds-*` aliases and account light/dark tokens. Scope 14/16/20/28px and 400/600 weights to new surfaces; preserve existing unrelated cards. Use the 760px mobile breakpoint, 44px minimum targets, stacked previews, responsive result grid and visible focus.

## Shared Patterns

### Authorization precedes all provider work

`services/agent/service.py:73-81` reads the owned Plan before interpreting Canvas edits. `travel_routes.py:27-38` demonstrates the same order for direct travel requests:

```python
token = (authorization or "").removeprefix("Bearer ").strip()
await read_plan(identity.subject, invocation.plan_id, token)
criteria = INPUTS[invocation.action].model_validate(invocation.criteria).model_dump(mode="json")
```

New tools inherit verified TurnContext identity; the browser/model cannot override it. No new public endpoint is necessary for transient mounted results. Reuse `TravelClient` service authentication, redirect refusal and fixed connector destination rather than adding browser-to-provider calls.

### Skills are bundled assets, not developer-local skills

`services/agent/research_assets/.claude/skills/canvas-activities/SKILL.md` provides a narrow ordered procedure: use current draft, call permitted tools, select observed IDs, label limitations and leave durable action to the traveler. Add travel guidance beside this tracked asset. `claude/runtime.py` copies the bundled `.claude` tree into its isolated SDK project; `options.skills` and PreToolUse must both allow the new exact name. Merely creating a repository/global developer skill will not make it available in the agent runtime.

### Errors and privacy

Copy safe fixed errors and cancellation propagation from the observer/transport. Log only bounded codes/counts/usage; do not log criteria, credentials, provider bodies, checkout tokens or email. A strict token-free result projection is distinct from the provider model. Keep travel snapshots out of checkpoints, including nested `projection` values. `safe_checkpoint_state` currently shallow-copies an allowed `projection` key, so copying that helper unchanged is insufficient. Research requires inspecting the actual saver path and testing real serialization if configured; a helper-only test cannot prove production exclusion.

### Observable tests, not just successful mocks

**Backend analog:** `services/agent/tests/test_travel_api.py:21-80` creates the real FastAPI app with injected identity/Plan reader/transport, asserts 401/404 and **no transport calls** before authorization, then checks successful projection and ownership scope. Reuse this structure for Canvas integration. Test foreign/deleted Plan, absent/ambiguous year, current correction overriding older dates, wrong-mode and fabricated ID rejection, token stripping, bounded calls and cancellation. Add SDK-options/skill-discovery tests and adversarial serialized-payload tests rather than only a happy-path fake editor.

**Frontend analog:** `PlanningCanvas.test.jsx:25-64` injects the real Canvas API boundary and emits a complete STATE_SNAPSHOT followed by a terminal. Its navigation regression checks the actual editor/composer values and `saveCanvas` absence:

```javascript
expect(screen.getByRole('textbox', { name: 'Date note' }).value)
  .toBe('Unfinished date note');
expect(screen.getByRole('textbox', { name: 'Message Travella' }).value)
  .toBe('Which airport is easiest?');
expect(api.saveCanvas).not.toHaveBeenCalled();
```

Extend the same observable journey for View all → Back, matching result IDs, no provider request on navigation, late events after stop, criteria-change invalidation, expiry/reload, one/three/many counts, focus restoration and mobile mode. Existing legacy travel/sandbox tests remain regression gates. Required authenticated Chrome desktop/mobile checks and inspected screenshots are additional to these tests, with fixture/live-provider evidence distinguished.

## No Complete Analog Found

| Responsibility | Reason | Planner action |
|---|---|---|
| Deterministic date authority and year disambiguation | Existing travel validators prove syntax/order, and addition checks prove a quoted action; neither proves that model-supplied travel dates came from traveler intent | Implement a small conservative pure helper with explicit precedence and adversarial cases from RESEARCH/AI-SPEC; ask for clarification outside supported grammar |
| Browser-history-aware transient results transition | Existing parent `screen` state preserves mounted components, but this does not establish browser Back behavior | Add a bounded history transition or equivalent coordinated local navigation, preserving existing dirty-Plan protection and avoiding raw payloads in history |
| Nested travel checkpoint exclusion | Existing checkpoint function allows shallow projection copying | Inspect active saver integration and prove serialization excludes transient/provider-sensitive data at every nesting level |

These are known new responsibilities, not permission to add generic routing, a new result store, a date-parsing dependency or a new graph.

## Metadata

**Analog search scope:** `services/agent/{claude,graph,research_assets,prompts,tests}`, `frontend/src/{design-system,features/plans,features/appearance}`.  
**Primary pattern families:** bounded observer, strict projection, staged streaming hook, fixed A2UI surface, mounted navigation.  
**Tracked-source gate:** every named existing analog path was verified with `git ls-files -- <paths>` on 2026-10-16; no installed/runtime mirror is used as an editable analog.  
**Evidence scope:** repository inspection only for this map; browser evidence is recorded in UI-SPEC and the task verification record.  
**Planning constraint:** follow the reviewed UI-SPEC and AI-SPEC; any proposed numeric limits here inherit RESEARCH's D-07 recommendations and must remain consistent across contracts/plans.
