"""E01–E20: deterministic host enforcement, never a score of prompt wording.

External SDK/provider edges are fixtures. The reused cases exercise real host
gates, HTTP/graph/SSE serialization, and (where relevant) the real React parser.
Live model choice/provider availability remains a separate browser acceptance.
"""
from copy import deepcopy

import pytest

from services.agent.tests import test_canvas_travel as cases
from services.agent.claude.canvas_travel import draft_facts
from services.crud.canvas import CanvasSnapshot


@pytest.mark.parametrize('case',[f'E{i:02}' for i in range(1,21)])
def test_critical_canvas_travel_case(case,monkeypatch,tmp_path,caplog):
    if case=='E01': cases.test_flight_journey_actual_sse_to_react(monkeypatch,tmp_path,4,False)
    elif case=='E02': cases.test_stay_journey_actual_sse_to_react(monkeypatch,tmp_path,4)
    elif case=='E03': cases.test_stay_gate_zero_calls(monkeypatch,'missing')
    elif case=='E04': cases.test_ambiguous_or_invalid_current_override_never_calls(monkeypatch,'next summer')
    elif case=='E05': cases.test_ambiguous_or_invalid_current_override_never_calls(monkeypatch,'instead in July')
    elif case=='E06': cases.test_exact_date_source_span_and_search_only(monkeypatch,'iso')
    elif case=='E07':
        for role in ['assistant','provider','missing_role']: cases.test_prior_date_authority_fails_closed(role)
    elif case=='E08':
        cases.test_initial_chat_and_tool_argument_escalation_cannot_access_travel(monkeypatch)
        cases.test_prior_date_authority_fails_closed('truncated')
    elif case=='E09':
        for value in ['2020-01-01 to 2020-01-02',f'{cases.END} to {cases.START}',f'{cases.START} to {cases.START}','2027-02-29 to 2027-03-02']:
            cases.test_ambiguous_or_invalid_current_override_never_calls(monkeypatch,value)
    elif case=='E10':
        for fact in ['nationality','rooms']: cases.test_stay_gate_zero_calls(monkeypatch,fact)
        for fact in ['origin','age','party','country']: cases.test_flight_input_gate_before_any_call(monkeypatch,fact)
    elif case=='E11': cases.test_provider_failure_is_sanitized_without_cards(monkeypatch,'unavailable')
    elif case=='E12':
        for count in [0,1,2,4]: cases.test_stay_counts_and_no_padding(monkeypatch,count)
        cases.test_mixed_snapshot_byte_limit_keeps_whole_options()
    elif case=='E13':
        for selection in ['cross_mode','duplicate_mode','duplicate_id','wrong_search']: cases.test_mixed_selection_rejects_substitution(monkeypatch,selection)
    elif case=='E14': cases.test_flight_journey_actual_sse_to_react(monkeypatch,tmp_path,1,True)
    elif case=='E15':
        cases.test_initial_chat_and_tool_argument_escalation_cannot_access_travel(monkeypatch)
        cases.test_mixed_modes_keep_independent_success(monkeypatch,'injection')
        cases.test_travel_telemetry_contains_only_safe_fixed_fields(monkeypatch,caplog)
    elif case=='E16':
        cases.test_real_saver_serialization_excludes_travel_and_collector_resets(monkeypatch)
        cases.test_concurrent_real_graph_collectors_are_owner_and_plan_scoped(monkeypatch)
    elif case=='E17':
        cases.test_cancelled_real_graph_provider_cannot_publish_and_transport_closes(monkeypatch,True)
        cases.test_new_generation_discards_late_real_graph_snapshot(monkeypatch)
    elif case=='E18':
        initial=cases.components();notes=deepcopy(initial);notes['essentials']['dates']['note']='Unrelated note'
        assert draft_facts(CanvasSnapshot(components=initial))==draft_facts(CanvasSnapshot(components=notes))
        notes['essentials']['travelers']=3
        assert draft_facts(CanvasSnapshot(components=initial))!=draft_facts(CanvasSnapshot(components=notes))
        cases.test_exact_date_source_span_and_search_only(monkeypatch,'long')
    elif case=='E19':
        cases.test_stay_journey_actual_sse_to_react(monkeypatch,tmp_path,1)
        cases.test_receipt_replay_keeps_original_expiry_without_provider_call(monkeypatch)
    elif case=='E20':
        cases.test_initial_chat_and_tool_argument_escalation_cannot_access_travel(monkeypatch)
        for owner in ['foreign','deleted','missing']: cases.test_stay_authorization_before_provider(monkeypatch,owner)
        cases.test_mixed_shared_lookup_budget_dedup_and_concurrency()
