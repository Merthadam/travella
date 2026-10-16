---
phase: 16-date-gated-travel-previews-and-booking-navigation
reviewed: 2026-10-16
depth: standard
diff_base: aa4f16f
initial_review_head: 5c0320b
remediation_review_head: 5bf1fb9
files_reviewed: 17
files_reviewed_list:
  - frontend/src/features/plans/components/CanvasConversation.jsx
  - frontend/src/features/plans/components/PlanningCanvas.jsx
  - frontend/src/features/plans/travel/CanvasTravel.jsx
  - frontend/src/features/plans/travel/CanvasTravelJourney.test.jsx
  - frontend/src/features/plans/travel/travel-results.css
  - frontend/src/features/plans/useCanvasConversation.js
  - services/agent/checkpoint.py
  - services/agent/claude/canvas_editor.py
  - services/agent/claude/canvas_travel.py
  - services/agent/editing_contracts.py
  - services/agent/evals/test_canvas_travel_eval.py
  - services/agent/graph/builder.py
  - services/agent/prompts/canvas-editing-v1.md
  - services/agent/request_context.py
  - services/agent/research_assets/.claude/skills/canvas-travel/SKILL.md
  - services/agent/tests/test_agent_checkpoint.py
  - services/agent/tests/test_canvas_travel.py
findings:
  critical: 0
  warning: 0
  info: 0
  total: 0
status: clean
---

# Phase 16 Code Review

Source audit of `aa4f16f..5c0320b`, followed by independent review of remediation commits. This research/planning context was reused as reviewer because the native agent thread limit prevented a fresh typed reviewer. It did not implement production code. The implementation agent owns fixes; this reviewer owns only this report and the security report. The GSD code-review/secure-phase workflows and mandatory Travella testing skill were read and applied. No structural-analysis substrate was supplied.

## Narrative Findings (AI reviewer)

### CR-01 — Ambiguous weekday dates silently use older Canvas dates — RESOLVED

**File at initial head:** `services/agent/claude/canvas_travel.py:168,193-196,231-249`.

The real HTTP/graph/editor path accepted `Find stays from Friday to Sunday; 1 room for 2 adults; nationality: HU`, made `capabilities` and `hotels/search` calls, and completed using the older Canvas pair `2027-04-14` / `2027-04-21`. Weekdays were absent from the date-intent recognizer, so an unresolvable current instruction was treated as no instruction. This violates D-05 / TRAVEL-16-02 and the declared T-16-02 mitigation.

**Resolution:** `fe5ffa9` recognizes unresolved weekday, relative, holiday and ordinal calendar intent before Canvas fallback. Independently reran the existing ambiguous-date cases plus 39 new HTTP cases across stays/flights/mixed: **55 passed**. No provider calls or durable changes occur for those ambiguous requests.

### WR-01 — Mixed partial-success clarification discards earlier inputs — RESOLVED

**File at initial head:** `services/agent/claude/canvas_travel.py:176-190,580-592`.

A mixed request lacking stay nationality correctly returns flights plus the nationality question. That composed assistant reply is not an exact member of `CLARIFICATIONS`; replying `nationality: HU` therefore loses the initial room allocation and search-only dates. The actual generated reply was `What is the guests’ nationality for this search? Reply nationality: country. Here are flights options for your exact search dates. Nothing has been saved or booked.` The next observer had an empty clarification history and asked for rooms again.

**Resolution:** `a0457a8` recognizes complete fixed host-composed replies, retains authenticated traveler evidence, and excludes completed modes unless explicitly requested anew. Independent targeted verification: **10 passed**, including actual second-turn search-only dates, no repeat flight search, and rejection of altered/provider-authored clarification text. `5bf1fb9` also registers the fixed invalid-Canvas-date and mode-validation questions; their continuation cases are included in the final 17-case targeted rerun below.

### WR-02 — Explicit stay currency is silently ignored — RESOLVED

**File at initial head:** `services/agent/claude/canvas_travel.py:286-319`.

The real HTTP path for `Find stays; 1 room for 2 adults; nationality: HU; currency: USD` dispatches `hotels/search` with `currency: EUR` and returns EUR criteria. `HotelSearch` supports USD, but the host constructs it without reading the explicit currency. This silently discards a supported search criterion.

**Resolution:** `d1574f3` carries supported current/active-clarification currency into `HotelSearch`, keeps EUR only when absent, and asks a registered focused question before provider calls for invalid supplied currency. Source diff inspected. Independent final rerun `-k 'currency or invalid_canvas or invalid_input or composed_clarification or mixed_partial_success_continues'`: **17 passed** in 0.79s, covering outbound/snapshot criteria, current override, retained prior currency and invalid-value continuation.

## Other reviewed boundaries

- Fixed no-argument SDK tools close over token-derived owner/Plan and dispatch only capability, airport/place lookup and search actions. Existing public Plan ownership/lifecycle checks run first; checkout actions are absent.
- Explicit nested DTO reconstruction excludes room/flight checkout tokens and raw provider fields. Host selections bind search/mode/observed IDs, and provider facts are rendered through a strict fixed A2UI catalog rather than generated code.
- Per-request `ContextVar` collection remains outside compiled graph channels; cleanup uses `finally`. Saver serialization and nested checkpoint sanitization have direct regression coverage.
- Client publication waits for successful terminal validation; generation/epoch and provider cancellation checks reject obsolete completions. Memory retains four snapshots with ten-minute eligibility and opaque history references; new results navigation has no provider refetch/checkout callback.
- Existing dependency lockfiles, durable schemas, initial conversation tools and legacy checkout implementation are unchanged.

## Independent verification and limits

`python -m pytest services/agent/tests/test_canvas_travel.py -q -k 'authorization_before_provider or initial_chat_and_tool_argument or real_saver or concurrent_real_graph or cancelled_real_graph or new_generation or telemetry or shared_lookup_budget'` using `.venv/bin/python`: **11 passed** in 0.61s. The date and clarification targeted reruns are recorded above. All use fixture SDK/provider boundaries; no paid provider/model call was made by this reviewer. Existing LangGraph/Python deprecation warnings were observed.

The root owns authenticated Chrome desktop/mobile, console/network and screenshot verification. This source audit does not certify that browser gate or live-model/provider reliability. Broad suites were not duplicated; implementation summaries record their results and separately reproduced pre-existing failures. No phase-completion claim is made here.

**Scope cutoff:** all three findings are resolved through `5bf1fb9` against the original results-only contract. The user's subsequent correction to reuse the existing manual search page and add preview images requires a new implementation/review increment; this clean source report does not approve that as-yet-unimplemented correction.
