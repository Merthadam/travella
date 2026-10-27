"""Real SDK registration/consume with scripted model output; no live model calls."""
import asyncio
import json
from pathlib import Path
from uuid import uuid4

import pytest
from claude_agent_sdk import ResultMessage

from services.agent.claude.runtime import ClaudeSdkRuntime, ResearchWorkerError
from services.agent.claude.travel_specialist import ClaudeSdkTravelSpecialist, NoteQuote, _notes
from services.agent.config import ResearchWorkerConfig
from services.agent.request_context import bind_travel_results, reset_travel_results
from services.agent.tests.test_canvas_travel import Provider, Transport, components, context, START, END
from services.agent.tests.test_travel_research_tools import sdk_call


STAY = {"destination": {"city": "Lisbon", "country_code": "PT"}, "check_in": START,
        "check_out": END, "rooms": [{"adults": 2}], "guest_nationality": "HU"}
FLIGHT = {"origin": "BUD", "destination": "LIS", "departure_date": START,
          "return_date": END, "adults": 2, "country_code": "HU"}


def test_workspace_comparison_order_and_exact_room_evidence_drive_local_only_turn():
    from services.agent.travel_registry import travel_registry
    from services.travel_topics import WorkspaceView
    from services.agent.tests.test_canvas_travel import hotels
    from services.agent.request_context import bind_workspace_update, reset_workspace_update
    ctx, provider, seen, updates = context([]), Provider(), {}, []
    sid = travel_registry.manual(ctx.traveler_scope, ctx.plan_id, 'hotels/search', STAY, hotels(15))
    refs = [dict(search_id=sid, option_id=f'stay-{i}', room_id=f'room-{i}') for i in (14, 2)]
    workspace = dict(search_id=sid, draft_dirty=False, view=WorkspaceView(comparison_refs=refs).model_dump())
    config = ResearchWorkerConfig(api_key='test-only-no-network')
    async def query(*, prompt, options, transport):
        seen.update(json.loads(prompt))
        if seen.get('workspace_comparison'):
            changed = await sdk_call(options.mcp_servers['travel']['instance'], 'update_workspace_view', {'search_id': sid, 'operation': 'sort', 'sort': 'price'})
            assert changed['changed']
        yield ResultMessage(subtype='success', duration_ms=1, duration_api_ms=1, is_error=False,
            num_turns=1, session_id='scripted', total_cost_usd=0.01,
            structured_output={'answer': 'Compared the current selected rates.', 'needs_input': False,
                               'comparisons': refs if seen.get('workspace_comparison') else []})
    worker = ClaudeSdkTravelSpecialist(config, worker=ClaudeSdkRuntime(config, query_fn=query, transport_factory=Transport), travel_client=provider)
    async def run():
        token = bind_workspace_update(updates)
        try:
            result = await worker.complete(message='Compare the second with the first and sort by price.', context=ctx, topic='stays', brief={}, saved_canvas={'components': components()}, workspace_context=workspace)
        finally:
            reset_workspace_update(token)
        assert [item['reference'] for item in seen.get('workspace_comparison', [])] == refs
        assert [item['room']['id'] for item in seen['workspace_comparison']] == ['room-14', 'room-2']
        assert len(json.dumps(seen['workspace_comparison']).encode()) <= 12288
        assert [item['reference']['option_id'] for item in result['travel_specialist_result']['comparison']['options']] == ['stay-14', 'stay-2']
        assert updates == [{'search_id': sid, 'view': {**workspace['view'], 'sort': 'price'}}]
        assert provider.calls == []
    asyncio.run(run())


@pytest.mark.parametrize('rule', [
    'Unknown checked-bag allowance is neither included nor excluded',
    'A property kitchen does not establish a kitchen in the selected room',
    'workspace_comparison preserves the current visible comparison order',
    'An explicit request for a new search requires a search tool',
])
def test_specialist_prompt_keeps_unknowns_and_current_workspace_authority_explicit(rule):
    prompt = (Path(__file__).parents[1] / 'prompts/travel-specialist-v1.md').read_text()
    assert rule in prompt


@pytest.mark.parametrize("topic", ["stays", "flights"])
def test_dedicated_sdk_worker_scopes_history_tools_and_grounded_comparison(topic):
    source_id = str(uuid4())
    other = "flights" if topic == "stays" else "stays"
    message = "I prefer a quiet trip"
    history = [{"id": str(uuid4()), "topic": topic, "role": "user", "content": f"Earlier preference {n}", "sequence": n + 1} for n in range(14)]
    history += [{"id": str(uuid4()), "topic": other, "role": "user", "content": "FOREIGN_TOPIC_SECRET", "sequence": 15},
                {"message_id": source_id, "topic": topic, "role": "user", "content": message, "status": "pending", "sequence": 16}]
    config = ResearchWorkerConfig(api_key="test-only-no-network")
    provider = Provider()
    async def query(*, prompt, options, transport):
        payload = json.loads(prompt)
        assert "FOREIGN_TOPIC_SECRET" not in prompt and "private-token" not in prompt
        assert len(payload["conversation_history"]) == 12
        assert payload["current_message_id"] == source_id
        assert all(item["content"] != message for item in payload["conversation_history"])
        skill = "stay-specialist" if topic == "stays" else "flight-specialist"
        assert options.skills == [skill]
        assert Path(options.cwd, f".claude/skills/{skill}/SKILL.md").is_file()
        assert options.extra_args.get("no-session-persistence") is None
        guard = options.hooks["PreToolUse"][0].hooks[0]
        assert await guard({"tool_name": f"mcp__travel__search_{topic}"}, "", None) == {}
        for name in (f"mcp__travel__search_{other}", "Bash", "mcp__travel__sandbox/book", "WebFetch"):
            assert await guard({"tool_name": name}, "", None) != {}
        server = options.mcp_servers["travel"]["instance"]
        found = await sdk_call(server, f"search_{topic}", {"criteria": STAY if topic == "stays" else FLIGHT, "dates": {"source": "canvas"}})
        chosen = found["options"][2]
        yield ResultMessage(subtype="success", duration_ms=1, duration_api_ms=1, is_error=False,
            num_turns=1, session_id="scripted", total_cost_usd=0.01,
            structured_output={"answer": "Here is an observed option; nothing booked.", "needs_input": False,
                "comparisons": [{"search_id": found["search_id"], "option_id": chosen["id"],
                                 "room_id": chosen["rooms"][0]["id"] if topic == "stays" else None}],
                "notes": [{"text": message, "source_message_id": source_id, "kind": "user_preference"}]})
    worker = ClaudeSdkTravelSpecialist(config, worker=ClaudeSdkRuntime(config, query_fn=query, transport_factory=Transport), travel_client=provider)
    async def run():
        bundles = []
        token = bind_travel_results(bundles)
        try:
            result = await worker.complete(message=message, context=context(history), topic=topic, brief={"theme": "Quiet holiday"}, saved_canvas={"components": components()}, authorization_token="private-token")
        finally:
            reset_travel_results(token)
        assert len(bundles) == 1 and bundles[0]["mode"] == topic
        output = result["travel_specialist_result"]
        assert output["notes"]["covered_through_sequence"] == 16
        assert output["notes"]["items"][0]["source_message_ids"] == [source_id]
        option = output["comparison"]["options"][0]
        assert option["id"].endswith("-2") and option["provider"] == "LiteAPI"
        assert ("702" if topic == "stays" else "824.50") in option["price_label"]
        assert "PRIVATE" not in json.dumps(output) and not result["state_changes"]
    asyncio.run(run())


@pytest.mark.parametrize("tamper", ["reference", "note"])
def test_fabricated_references_and_unattributed_notes_fail_closed(tamper):
    config = ResearchWorkerConfig(api_key="test-only-no-network")
    async def query(*, prompt, options, transport):
        result = {"answer": "Untrusted output", "needs_input": False, "comparisons": [], "notes": []}
        if tamper == "reference":
            result["comparisons"] = [{"search_id": "invented", "option_id": "invented"}]
        else:
            result["notes"] = [{"text": "Invented preference", "source_message_id": str(uuid4()), "kind": "user_preference"}]
        yield ResultMessage(subtype="success", duration_ms=1, duration_api_ms=1, is_error=False, num_turns=1,
                            session_id="scripted", total_cost_usd=0.01, structured_output=result)
    worker = ClaudeSdkTravelSpecialist(config, worker=ClaudeSdkRuntime(config, query_fn=query, transport_factory=Transport))
    with pytest.raises(ResearchWorkerError, match="travel_specialist_unavailable"):
        asyncio.run(worker.complete(message="help", context=context(), topic="stays", brief={}, saved_canvas={"components": components()}))


@pytest.mark.parametrize('reason', ['travel_selection_unknown', 'unclassified'])
def test_specialist_failure_logs_only_allowlisted_reason_without_exception_text(reason, caplog):
    config = ResearchWorkerConfig(api_key='test-only-no-network')
    async def query(*, prompt, options, transport):
        if reason == 'unclassified':
            raise ValueError('PRIVATE_MODEL_OR_PROVIDER_CONTENT')
        yield ResultMessage(subtype='success', duration_ms=1, duration_api_ms=1, is_error=False,
            num_turns=1, session_id='scripted', total_cost_usd=0.01,
            structured_output={'answer': 'Untrusted output', 'needs_input': False,
                'comparisons': [{'search_id': 'invented', 'option_id': 'invented', 'room_id': 'invented'}]})
    worker = ClaudeSdkTravelSpecialist(config, worker=ClaudeSdkRuntime(config, query_fn=query, transport_factory=Transport))
    with pytest.raises(ResearchWorkerError, match='travel_specialist_unavailable'):
        asyncio.run(worker.complete(message='help', context=context(), topic='stays', brief={}, saved_canvas={'components': components()}))
    assert f'reason={reason}' in caplog.text
    assert 'PRIVATE_MODEL_OR_PROVIDER_CONTENT' not in caplog.text


def test_missing_saved_canvas_still_allows_preferences_without_inventory():
    config = ResearchWorkerConfig(api_key="test-only-no-network")
    async def query(*, prompt, options, transport):
        assert not json.loads(prompt)["inventory_tools_available"]
        assert options.allowed_tools == ["Skill"]
        yield ResultMessage(subtype="success", duration_ms=1, duration_api_ms=1, is_error=False, num_turns=1,
                            session_id="scripted", total_cost_usd=0.01,
                            structured_output={"answer": "What matters most for your stay?", "needs_input": True})
    worker = ClaudeSdkTravelSpecialist(config, worker=ClaudeSdkRuntime(config, query_fn=query, transport_factory=Transport))
    result = asyncio.run(worker.complete(message="help", context=context(), topic="stays", brief={}, saved_canvas=None))
    assert result["status"] == "needs your input" and not result["travel_specialist_result"]["comparison"]["options"]


def test_notes_preserve_older_attribution_with_later_correction_and_byte_bound():
    old_id, new_id = str(uuid4()), str(uuid4())
    previous = {"items": [{"kind": "user_preference", "text": "Lowest price matters", "source_message_ids": [old_id]}], "covered_through_sequence": 1, "incomplete": True}
    corrected = "I now prefer refundable options, even at a higher price"
    result = _notes(previous, [NoteQuote(text=corrected, kind="user_preference", source_message_id=new_id)],
                    [{"message_id": new_id, "role": "user", "content": corrected, "sequence": 30}])
    assert result.items[0].source_message_ids == [old_id]
    assert result.items[-1].text == corrected and result.covered_through_sequence == 30
    assert len(result.model_dump_json().encode()) <= 4096 and result.incomplete


def test_canonical_brief_dates_override_outdated_saved_canvas():
    from datetime import date, timedelta
    config = ResearchWorkerConfig(api_key="test-only-no-network")
    new_start = (date.fromisoformat(START) + timedelta(days=1)).isoformat()
    provider = Provider()
    async def query(*, prompt, options, transport):
        found = await sdk_call(options.mcp_servers["travel"]["instance"], "search_stays", {
            "criteria": {**STAY, "check_in": new_start}, "dates": {"source": "canvas"}})
        assert found["search_id"]
        yield ResultMessage(subtype="success", duration_ms=1, duration_api_ms=1, is_error=False, num_turns=1,
                            session_id="scripted", total_cost_usd=0.01,
                            structured_output={"answer": "Searched the updated trip dates.", "needs_input": False})
    worker = ClaudeSdkTravelSpecialist(config, worker=ClaudeSdkRuntime(config, query_fn=query, transport_factory=Transport), travel_client=provider)
    draft = {"components": components()}
    asyncio.run(worker.complete(message="search", context=context(), topic="stays", brief={"dates": {"start": new_start, "end": END, "flexible": False}}, saved_canvas=draft))
    assert draft["components"]["essentials"]["dates"]["start"] == START
    assert provider.calls[-1][1]["criteria"]["check_in"] == new_start


@pytest.mark.parametrize("selection", ["apartment", "missing", "foreign"])
def test_chosen_room_binds_comparison_and_preview_price_terms(selection):
    from copy import deepcopy
    from services.agent.tests.test_canvas_travel import hotels
    config = ResearchWorkerConfig(api_key="test-only-no-network")
    class RoomProvider(Provider):
        async def call(self, name, args, **scope):
            if args["action"] != "hotels/search":
                return await super().call(name, args, **scope)
            result = hotels(1)
            hotel = result["results"][0]
            loft = hotel["rooms"][0]
            loft.update(id="loft-rate", name="Loft", total={"amount": "663.21", "currency": "EUR"}, refundable=False)
            apartment = deepcopy(loft)
            apartment.update(id="apartment-rate", name="1-Bedroom Apartment with Kitchenette",
                total={"amount": "734.60", "currency": "EUR"}, refundable=True,
                cancellation_summary="Free cancellation before 1 May", board_name="Room only",
                excluded_taxes=[{"name": "City tax", "amount": "14", "currency": "EUR"}])
            hotel["price"]["amount"] = "663.21"
            hotel["rooms"] = [loft, apartment]
            return result
    async def query(*, prompt, options, transport):
        reference_schema = options.output_format["schema"]["$defs"]["ComparisonReference"]
        assert "room_id" in reference_schema["required"] and reference_schema["properties"]["room_id"]["type"] == "string"
        found = await sdk_call(options.mcp_servers["travel"]["instance"], "search_stays", {"criteria": STAY, "dates": {"source": "canvas"}})
        ref = {"search_id": found["search_id"], "option_id": found["options"][0]["id"]}
        if selection != "missing":
            ref["room_id"] = "apartment-rate" if selection == "apartment" else "other-property-room"
        yield ResultMessage(subtype="success", duration_ms=1, duration_api_ms=1, is_error=False, num_turns=1,
            session_id="scripted", total_cost_usd=0.01, structured_output={"answer": "The 1-Bedroom Apartment with Kitchenette costs EUR734.60.", "needs_input": False, "comparisons": [ref]})
    worker = ClaudeSdkTravelSpecialist(config, worker=ClaudeSdkRuntime(config, query_fn=query, transport_factory=Transport), travel_client=RoomProvider())
    async def run():
        bundles = []
        token = bind_travel_results(bundles)
        try:
            result = await worker.complete(message="Compare the apartment", context=context(), topic="stays", brief={}, saved_canvas={"components": components()})
        finally:
            reset_travel_results(token)
        option = result["travel_specialist_result"]["comparison"]["options"][0]
        assert "734.60 EUR" in option["price_label"] and "663.21" not in option["price_label"]
        assert "Room: 1-Bedroom Apartment with Kitchenette" in option["facts"]
        assert "Shown room is refundable" in option["facts"] and "Meals: Room only" in option["facts"]
        assert bundles[0]["results"][0]["rooms"][0]["id"] == "apartment-rate"
        assert bundles[0]["results"][0]["price"]["amount"] == "734.60"
        assert bundles[0]["results"][0]["price"]["excluded_taxes"][0]["amount"] == "14"
    if selection == "apartment":
        asyncio.run(run())
    else:
        with pytest.raises(ResearchWorkerError):
            asyncio.run(run())


def test_attached_manual_option_is_inspectable_without_searching_or_losing_exact_rate():
    from services.agent.travel_registry import TravelRegistry
    from services.travel_topics import TravelDiscussion
    from services.agent.tests.test_canvas_travel import hotels
    registry = TravelRegistry()
    ctx = context([])
    sid = registry.manual(ctx.traveler_scope, ctx.plan_id, 'hotels/search', STAY, hotels(15))
    discussion = TravelDiscussion(options=[dict(search_id=sid, option_id='stay-14', room_id='room-14')])
    selected = {'snapshots': registry.resolve(ctx.traveler_scope, ctx.plan_id, 'stays', discussion), 'discussion':discussion}
    config = ResearchWorkerConfig(api_key='test-only-no-network')
    provider = Provider()
    async def query(*, prompt, options, transport):
        payload = json.loads(prompt)
        attached = payload['selected_options'][0]
        assert attached['reference']['option_id'] == 'stay-14'
        assert attached['criteria']['check_in'] == STAY['check_in']
        assert 'PRIVATE' not in json.dumps(attached)
        yield ResultMessage(subtype='success',duration_ms=1,duration_api_ms=1,is_error=False,num_turns=1,session_id='scripted',total_cost_usd=0.01,
            structured_output={'answer':'This is the exact attached room.','needs_input':False,'comparisons':[discussion.options[0].model_dump()],'notes':[]})
    worker = ClaudeSdkTravelSpecialist(config, worker=ClaudeSdkRuntime(config, query_fn=query, transport_factory=Transport), travel_client=provider)
    result = asyncio.run(worker.complete(message='Tell me about this room',context=ctx,topic='stays',brief={},saved_canvas={'components':components()},selected_context=selected))
    comparison = result['travel_specialist_result']['comparison']['options'][0]
    assert comparison['reference']['room_id'] == 'room-14'
    assert comparison['price_label'] == '714 EUR · stay total'
    assert provider.calls == []
