# Exact room comparison identity integration fix

Date:2026-10-28. Executed inside phase18-12; backend source only. Parent owns runtime rebuild and authenticated Chrome verification.

## Reproduced defect

Two valid room references sharing a property ID were rejected by worker preview selection (`travel_option_unknown`). Simply accepting repeated property IDs would then collide in `Comparison.unique`, because normalized research options also used the property ID. The old preview loop additionally overwrote the first selected room with the last room.

Three new RED cases failed as intended: same-search two rates, separate-search repeated property IDs, and real specialist worker→CRUD comparison. RED evidence checker returned `RED_EVIDENCE_OK`; parent committed tests as `4627689` before implementation.

## Change

- Normalized comparison identity is a deterministic digest of the complete search/option/room reference. Provider IDs remain in `reference`; CRUD still replaces the normalized ID with its own durable evidence UUID before persistence.
- Property preview IDs are deduplicated within each search. Valid references from distinct authorized searches can reuse the same provider property ID. Exact room comparisons retain their original order.
- A property preview retains both selected rooms and their separate totals. A single-room preview preserves its exact price/terms behavior. Multiple-room previews retain the observed property starting price instead of treating the last room as the only selected rate.
- Duplicate exact comparisons, missing/foreign rooms, invalid selections and owner/expiry boundaries remain rejected. No comparison, reference or durable schema changed.

## Executed verification

`uv run --locked pytest -q services/agent/tests/test_specialist_worker.py services/agent/tests/test_travel_specialist_journey.py services/agent/tests/test_specialist_tools.py services/agent/tests/test_travel_workspace_journey.py services/agent/tests/test_travel_registry.py services/crud/tests/test_topic_conversations.py`

**85 passed**. Existing LangGraph deprecation warnings only. `git diff --check` passed.

Final readable-room prose instruction: RED912cd51, followed by the three-line prompt change. `uv run --locked pytest -q services/agent/tests/test_specialist_worker.py` passed all22 tests after the change; its added contract test verifies instruction presence, while real answer wording remains a browser evaluation.

The scripted SDK boundary feeds the real worker, not a fake comparison implementation. It proves ordered EUR950/EUR700 room totals and distinct normalized IDs within one property and across searches, with zero provider calls. Stable identical-reference IDs still cause `Comparison.unique` to reject duplicates. The actual authenticated FastAPI/SQLite journey verifies distinct durable evidence IDs, explicit choose→replace→remove, HTTP readback and reopened DB shortlist/preferred state.

Frontend agent independently wires displayed exact comparison references into ordinary discussion using the existing `travelDiscussion` contract. Backend selected_context already resolves multiple search IDs with owner/plan/topic/expiry and room-parent validation.

## Runtime follow-up and pending gate

Parent committed GREEN as `bb92e75`. On runtime6ea7341, parent’s stay-sort retry succeeded:28 loaded results sorted by price, reply described observed totals/unknown amenities, preferred room710.09 at revision7 stayed unchanged, and a new draft plus date-field focus survived. The original ValueError did not recur, so causality is not established and this exact-room fix is not claimed to explain it. Reply prose exposed raw room IDs; the final bounded prompt correction requires readable room names while retaining internal references only in structured comparisons.

After final rebuild, exercise two rooms from one property, explicit Compare, an ordinal follow-up and exact choice/reload through Chrome. Fixed-code diagnostics in `af12bcf` identify safe failure stages/reasons without recording model/provider text. Parent owns this final live gate.
