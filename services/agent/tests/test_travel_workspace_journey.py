"""Workspace effects cross the real graph, signed CRUD HTTP and isolated SQL store."""
import asyncio
import json
from types import SimpleNamespace
from uuid import UUID, uuid4

import httpx
import pytest
from claude_agent_sdk import ResultMessage
from fastapi import HTTPException
from pydantic import ValidationError
from sqlalchemy import select

from services.agent.claude.runtime import ClaudeSdkRuntime
from services.agent.config import ResearchWorkerConfig
from services.agent.crud_client import CrudContextReader, CrudPlanReader
from services.agent.graph.builder import AgentGraph
from services.agent.http_contracts import AgentRequest
from services.agent.service import AgentTurnService
from services.agent.state import PlanRunStore, ProcessReceiptCache
from services.agent.tests.test_canvas_travel import Provider, Transport, components, MESSAGE, FLIGHT_MESSAGE
from services.agent.tests.test_specialist_worker import STAY, FLIGHT
from services.agent.tests.test_travel_research_tools import sdk_call
from services.agent.tests.test_travel_specialist_journey import setup_turn
from services.agent.travel_registry import travel_registry
from services.crud.models import PlanningCanvas, TravelTopicRun, TravelTopicState, ResearchContext
from services.crud.tests.test_api import create, system  # noqa: F401
from services.travel_topics import WorkspaceView


def workspace(**extra):
    return {"instance_id": "workspace-instance", "revision": 7, "search_id": None,
            "view": WorkspaceView().model_dump(), "draft_dirty": False, **extra}


def real_handler(system, monkeypatch, pid, *, topic="stays", count=4, view_only=False):
    from services.trip_context import TripContext
    from langgraph.checkpoint.memory import InMemorySaver
    with system.factory() as db:
        db.add(PlanningCanvas(plan_id=UUID(pid), payload={"components": components()}, context_revision=1, updated_at=system.current[0]))
        db.add(ResearchContext(plan_id=UUID(pid), revision=1, updated_at=system.current[0],
            payload=TripContext(dateStart=STAY["check_in"], dateEnd=STAY["check_out"], travelers=2,
                                candidates=["Lisbon, Portugal"], finalDestination="Lisbon, Portugal").model_dump()))
        db.commit()
    original = httpx.AsyncClient
    monkeypatch.setattr("services.agent.crud_client.httpx.AsyncClient", lambda **kw:
        original(transport=httpx.ASGITransport(app=system.app), **kw))
    monkeypatch.setenv("CANVAS_EVIDENCE_SIGNING_KEY", "test-only-signing-key-that-is-over-32-characters")
    monkeypatch.setattr("services.agent.claude.travel_specialist.TravelClient", lambda: Provider(count))
    config = ResearchWorkerConfig(api_key="test-only-no-network")
    async def query(*, prompt, options, transport):
        if view_only:
            assert json.loads(prompt)['workspace']['search_id']
            changed = await sdk_call(options.mcp_servers['travel']['instance'], 'update_workspace_view',
                {'search_id': json.loads(prompt)['workspace']['search_id'], 'operation': 'sort', 'sort': 'price'})
            assert changed['changed']
        elif not json.loads(prompt).get("workspace", {}).get("draft_dirty"):
            found = await sdk_call(options.mcp_servers["travel"]["instance"], f"search_{topic}",
                {"criteria": STAY if topic == "stays" else FLIGHT, "dates": {"source": "canvas"}})
            assert "search_id" in found, found
        yield ResultMessage(subtype="success", duration_ms=1, duration_api_ms=1, is_error=False,
            num_turns=1, session_id="scripted", total_cost_usd=0.01,
            structured_output={"answer": "Search completed; nothing booked.", "needs_input": False,
                               "comparisons": [], "notes": []})
    saver = InMemorySaver()
    graph = AgentGraph(SimpleNamespace(config=config,
        worker=ClaudeSdkRuntime(config, query_fn=query, transport_factory=Transport)), checkpointer=saver)
    captured = []
    invoke = graph.compiled.ainvoke
    async def capture(state, config):
        config = {**config, "configurable": {"thread_id": pid}}
        result = await invoke(state, config=config)
        captured.append(json.dumps(result, default=str))
        checkpoint = await saver.aget_tuple(config)
        captured.append(json.dumps(checkpoint.checkpoint, default=str))
        captured.append(repr(saver.storage))
        return result
    monkeypatch.setattr(graph.compiled, "ainvoke", capture)
    return AgentTurnService(plan_reader=CrudPlanReader("http://crud"), context_reader=CrudContextReader("http://crud"),
        graph=graph, runs=PlanRunStore(), receipts=ProcessReceiptCache()), captured


def test_view_only_turn_releases_original_search_after_signed_commit(system, monkeypatch):
    from services.agent.tests.test_canvas_travel import hotels
    pid = create(system)['plan_id']
    sid = travel_registry.manual('traveler-one', pid, 'hotels/search', STAY, hotels(3))
    before = travel_registry.get('traveler-one', pid, sid, 'stays')
    handler, captured = real_handler(system, monkeypatch, pid, view_only=True)
    req = AgentRequest(plan_id=pid, event_id=str(uuid4()), topic='stays', message='Sort current results by price', workspace_context=workspace(search_id=sid))
    response = asyncio.run(handler.handle(req, 'traveler-one', f'Bearer {system.token}'))
    assert response.workspace_update.search_id == sid
    assert response.workspace_update.view.sort == 'price'
    assert response.workspace_update.snapshot['searched_at'] == before.searched_at
    saved = system.client.get(f'/v1/plans/{pid}/travel/stays').json()
    assert len(saved['messages']) == 2 and saved['shortlist'] == [] and saved['preferred'] is None
    assert all('workspace' not in item for item in captured)
    with system.factory() as db:
        assert db.scalar(select(TravelTopicRun)).status == 'complete'


@pytest.mark.parametrize("topic,count", [("stays", 4), ("flights", 4), ("stays", 0)])
def test_final_search_crosses_graph_and_commit_without_durable_inventory(system, monkeypatch, topic, count):
    pid = create(system)["plan_id"]
    handler, captured = real_handler(system, monkeypatch, pid, topic=topic, count=count)
    request = AgentRequest(plan_id=pid, event_id=str(uuid4()), topic=topic,
        message=MESSAGE if topic == "stays" else FLIGHT_MESSAGE, workspace_context=workspace())
    response = asyncio.run(handler.handle(request, "traveler-one", f"Bearer {system.token}"))
    assert response.status == "in_progress", response
    assert response.workspace_update is not None
    update = response.workspace_update
    assert update.instance_id == "workspace-instance" and update.base_revision == 7
    assert update.run_id == request.event_id
    assert len(update.snapshot["results"]) == count
    assert update.snapshot["draft_facts"]["destination"] == "Lisbon, Portugal"
    assert "PRIVATE_" not in update.model_dump_json()
    assert all("workspace" not in state and "search_id" not in state for state in captured)
    from services.agent.checkpoint import safe_checkpoint_state
    projected_checkpoint = safe_checkpoint_state({"plan_id": pid,
        "projection": response.model_dump(mode="json"), "workspace_context": workspace()})
    assert "workspace" not in json.dumps(projected_checkpoint)
    readback = system.client.get(f"/v1/plans/{pid}/travel/{topic}").json()
    assert [m["role"] for m in readback["messages"]] == ["user", "assistant"]
    assert "workspace" not in json.dumps(readback)
    with system.factory() as db:
        assert db.scalar(select(TravelTopicRun)).status == "complete"
        assert "search_id" not in json.dumps(db.scalar(select(TravelTopicState)).payload)


@pytest.mark.parametrize("changes", [{"revision": True}, {"revision": 9007199254740992},
    {"instance_id": "x" * 101}, {"raw_payload": "private"},
    {"view": {**WorkspaceView().model_dump(), "direct": True}}])
def test_invalid_workspace_context_rejected(changes):
    with pytest.raises(ValidationError):
        AgentRequest(plan_id=uuid4(), event_id="e", topic="stays", message="search", workspace_context=workspace(**changes))


def test_workspace_context_rejects_oversized_unicode_and_trip_scope():
    from services.travel_topics import WorkspaceContext
    with pytest.raises(ValidationError, match="too large"):
        WorkspaceContext.model_validate(workspace(search_id="search", view={**WorkspaceView().model_dump(),
            "dismissed_ids": [str(i) + "🧳" * 98 for i in range(100)]}))
    with pytest.raises(ValidationError):
        AgentRequest(plan_id=uuid4(), event_id="e", message="hello", workspace_context=workspace())


@pytest.mark.parametrize("scope", ["owner", "plan", "topic", "expired"])
def test_foreign_or_expired_workspace_is_rejected_before_worker(system, monkeypatch, scope):
    from datetime import UTC, datetime, timedelta
    from services.agent.tests.test_canvas_travel import hotels
    pid = create(system)["plan_id"]
    sid = travel_registry.manual("other" if scope == "owner" else "traveler-one",
        str(uuid4()) if scope == "plan" else pid, "hotels/search", STAY, hotels(1))
    if scope == "expired":
        travel_registry.entries[sid][2].expires_at = (datetime.now(UTC) - timedelta(seconds=1)).isoformat()
    async def unused(state):
        pytest.fail("Invalid context must not reach worker")
    handler = setup_turn(system, monkeypatch, unused)
    req = AgentRequest(plan_id=pid, event_id=str(uuid4()), topic="flights" if scope == "topic" else "stays",
        message="search", workspace_context=workspace(search_id=sid))
    with pytest.raises(HTTPException) as exc:
        asyncio.run(handler.handle(req, "traveler-one", f"Bearer {system.token}"))
    assert exc.value.status_code == 409
    assert system.client.get(f"/v1/plans/{pid}/travel/stays").json()["messages"] == []


@pytest.mark.parametrize("failure", ["dirty", "commit", "canceled"])
def test_failed_dirty_or_revoked_turn_never_releases_workspace(system, monkeypatch, failure):
    pid = create(system)["plan_id"]
    handler, _ = real_handler(system, monkeypatch, pid)
    original = handler.context_reader.travel_run
    async def completion(*args, **kwargs):
        if kwargs.get("action") == "complete" and failure == "commit":
            raise HTTPException(409, "Changed saved brief")
        value = await original(*args, **kwargs)
        if kwargs.get("action") == "complete" and failure == "canceled":
            await handler.runs.reserve("traveler-one", pid, "newer-event")
        return value
    monkeypatch.setattr(handler.context_reader, "travel_run", completion)
    async def run():
        from services.agent.request_context import current_workspace_context, _WORKSPACE_UPDATE
        req = AgentRequest(plan_id=pid, event_id=str(uuid4()), topic="stays", message=MESSAGE,
            workspace_context=workspace(draft_dirty=failure == "dirty"))
        if failure == "commit":
            with pytest.raises(HTTPException):
                await handler.handle(req, "traveler-one", f"Bearer {system.token}")
        else:
            response = await handler.handle(req, "traveler-one", f"Bearer {system.token}")
            assert response.status == "in_progress"
            assert response.workspace_update is None
        assert current_workspace_context() is None and _WORKSPACE_UPDATE.get() is None
    asyncio.run(run())
    saved = system.client.get(f"/v1/plans/{pid}/travel/stays").json()
    assert saved["locked"] is False
    assert len(saved["messages"]) == (1 if failure == "commit" else 2)


def test_concurrent_graph_contexts_reset_after_success_and_exception(monkeypatch):
    from services.agent.graph.nodes.travel_specialist import TravelSpecialistNode
    from services.agent.request_context import current_workspace_context, collect_workspace_update, _WORKSPACE_UPDATE
    async def run():
        both = asyncio.Event()
        arrived = 0
        async def research(self, state):
            nonlocal arrived
            before = current_workspace_context()
            arrived += 1
            if arrived == 2:
                both.set()
            await both.wait()
            assert current_workspace_context() == before
            assert before["instance_id"] == state["context"].plan_id
            if before["revision"] == 1:
                raise ValueError("test failure")
            collect_workspace_update({"search_id": state["context"].plan_id})
            return {"result": {"status": "in_progress", "assistant_text": "done"}}
        monkeypatch.setattr(TravelSpecialistNode, "_research", research)
        graph = AgentGraph(SimpleNamespace(config=object()))
        async def invoke(index):
            pid = f"plan-{index}"
            try:
                return await graph.invoke({"plan_id": pid, "traveler_scope": f"owner-{index}", "event_id": "e", "topic": "stays", "message": "help"},
                    specialist_context={"workspace_context": workspace(instance_id=pid, revision=index)})
            finally:
                assert current_workspace_context() is None and _WORKSPACE_UPDATE.get() is None
        results = await asyncio.gather(invoke(0), invoke(1), return_exceptions=True)
        assert results[0]["projection"]["workspace_update"]["search_id"] == "plan-0"
        assert isinstance(results[1], ValueError)
    asyncio.run(run())


def test_successful_stream_has_identical_workspace_state_and_terminal(system, monkeypatch):
    pid = create(system)["plan_id"]
    handler, _ = real_handler(system, monkeypatch, pid)
    request = AgentRequest(plan_id=pid, event_id=str(uuid4()), topic="stays", message=MESSAGE, workspace_context=workspace())
    async def run():
        async def connected():
            return False
        return "".join([item async for item in handler.stream(request, "traveler-one", f"Bearer {system.token}", is_disconnected=connected)])
    wire = asyncio.run(run())
    events = [json.loads(frame.removeprefix("data: ")) for frame in wire.strip().split("\n\n")]
    state = next(e["snapshot"]["workspace_update"] for e in events if e["type"] == "STATE_SNAPSHOT")
    terminal = next(e for e in events if e["type"] == "TERMINAL")
    assert terminal["status"] == "complete" and terminal["workspace_update"] == state
    assert "PRIVATE_" not in wire and "workspace_context" not in wire
