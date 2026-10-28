"""Briefing context, source integrity and bounded research; no paid calls."""
import asyncio
from contextlib import contextmanager
from datetime import UTC, datetime
from unittest.mock import AsyncMock

import pytest
import httpx
from fastapi import HTTPException

from services.agent.claude.canvas_research_worker import ClaudeCanvasResearchWorker, research_projection
from services.agent.claude.runtime import ResearchWorkerError, _EvidenceObserver
from services.agent.config import ResearchWorkerConfig
from services.agent.crud_client import CrudContextReader
from services.agent.graph.nodes.canvas_generation import CanvasGenerationNode
from services.agent.tests.test_flight_generation import context
from services.agent.tests.test_research_offers import Graph, Reader, request, service


def evidence(second=False):
    return {"evidence_id": "read-2" if second else "read-1", "title": "Official transport guide",
            "url": "https://museum.example.org/visit" if second else "https://transport.example.org/guide", "read_status": "read",
            "retrieved_at": datetime.now(UTC).isoformat(),
            "content": "Use our journey planner to look up bus journeys."}


def candidate():
    return {"findings": [{"title": "Getting around", "summary": "Use the official bus journey planner.",
                          "sources": [{"evidence_id": "read-1", "quote": "look up bus journeys"}],
                          "certainty": "supported", "time_sensitive": False}],
            "links": [{"evidence_id": "read-1", "purpose": "Plan a bus journey", "category": "transport"}, {"evidence_id": "read-2", "purpose": "Plan a museum visit", "category": "attraction"}]}


@pytest.mark.parametrize("tamper", ["unknown", "quote", "url"])
def test_briefing_rejects_unobserved_sources_and_claimed_quotes(tamper):
    raw = candidate()
    if tamper == "unknown":
        raw["links"][0]["evidence_id"] = "invented"
    elif tamper == "quote":
        raw["findings"][0]["sources"][0]["quote"] = "invented opening hours"
    else:
        raw["findings"][0]["summary"] += " https://invented.example.org"
    observer = _EvidenceObserver(ResearchWorkerConfig(api_key="test"), [evidence(), evidence(True)])
    with pytest.raises(ResearchWorkerError):
        research_projection(raw, observer)


@pytest.mark.parametrize("same_destination", [True, False])
def test_generation_passes_only_current_destination_saved_places(same_destination):
    worker, research = AsyncMock(), AsyncMock()
    worker.config = ResearchWorkerConfig(api_key="test")
    worker.run.return_value = {"status": "ready", "items": []}
    research.run.return_value = research_projection(candidate(), _EvidenceObserver(worker.config, [evidence(), evidence(True)]))
    pin = {"id": "museum", "name": "Coach Museum", "category": "activity",
           "position": {"lat": 38.7, "lng": -9.2}, "description": "saved"}
    result = asyncio.run(CanvasGenerationNode(worker, research)({
        "canvas_action": "generate_plan", "trip_context": context("not-needed", "user_edit"),
        "traveler_scope": "t", "plan_id": "p", "saved_map": {
            "destination": "Lisbon" if same_destination else "Innsbruck", "pins": [pin]},
    }))
    assert result["canvas_draft"]["group_status"]["research"] == "ready"
    assert research.run.call_args.kwargs["saved_places"] == ([{"name": "Coach Museum", "category": "activity"}] if same_destination else [])


@pytest.mark.parametrize("destination,interest", [("Lisbon", "Culture"), ("Innsbruck", "Skiing")])
def test_worker_receives_specific_trip_and_saved_places_without_extra_model_pass(monkeypatch, destination, interest):
    captured = {}
    class Runtime:
        @contextmanager
        def session(self):
            yield None, None
    async def reviewed(**kwargs):
        captured.update(kwargs["payload"])
        return kwargs["validate"](candidate())
    monkeypatch.setattr("services.agent.claude.canvas_research_worker.reviewed_candidate", reviewed)
    config = ResearchWorkerConfig(api_key="test")
    worker = ClaudeCanvasResearchWorker(config, worker=Runtime())
    result = asyncio.run(worker.run(destination=destination, themes={"items": [{"kind": "theme", "text": interest}]},
                                   trip_context={"finalDestination": destination}, saved_places=[{"name": "Saved place", "category": "activity"}],
                                   reusable_evidence=[evidence(), evidence(True)]))
    assert captured["themes"]["items"][0]["text"] == interest
    assert captured["saved_places"][0]["name"] == "Saved place"
    assert captured["destination"] == destination
    assert result["findings"]["items"][0]["sources"][0]["url"] == evidence()["url"]
    assert worker.config.max_searches <= 2 and worker.config.max_fetches <= 4


@pytest.mark.parametrize("revision", [2, 3])
def test_saved_context_revision_mismatch_stops_before_graph(revision):
    class SavedReader(Reader):
        async def saved_canvas(self, plan_id, token):
            assert token == "token"
            return {"revision": revision, "snapshot": {"components": {"map": {"destination": "Lisbon", "pins": []}}}}
    graph = Graph()
    handler = service(SavedReader(), graph)
    async def run():
        return await handler.handle(request(canvas_action="generate_plan"), "t", "Bearer token")
    if revision != 2:
        with pytest.raises(HTTPException) as error:
            asyncio.run(run())
        assert error.value.status_code == 409
        assert graph.calls == 0
    else:
        asyncio.run(run())
        assert graph.state["saved_map"]["destination"] == "Lisbon"


@pytest.mark.parametrize("status", [200, 401, 404, 500])
def test_saved_canvas_read_forwards_authorization_and_fails_closed(monkeypatch, status):
    def handle(request):
        assert request.method == "GET"
        assert request.url.path == "/v1/plans/plan-id/canvas"
        assert request.headers["authorization"] == "Bearer test-token"
        return httpx.Response(status, json={"revision": 2, "snapshot": None})
    client = httpx.AsyncClient
    monkeypatch.setattr("services.agent.crud_client.httpx.AsyncClient",
                        lambda **kwargs: client(transport=httpx.MockTransport(handle)))
    call = CrudContextReader("https://crud.example.org").saved_canvas("plan-id", "test-token")
    if status == 200:
        assert asyncio.run(call)["revision"] == 2
    else:
        with pytest.raises(HTTPException) as error:
            asyncio.run(call)
        assert error.value.status_code == (status if status in {401, 404} else 503)


def test_one_generic_source_requires_repair_but_unavailable_sources_allow_labelled_partial():
    raw = candidate()
    raw["links"] = raw["links"][:1]
    observer = _EvidenceObserver(ResearchWorkerConfig(api_key="test"), [evidence()])
    with pytest.raises(ResearchWorkerError, match="canvas_research_needs_distinct_resources"):
        research_projection(raw, observer)
    observer.unavailable = True
    projected = research_projection(raw, observer)
    assert projected["findings"]["items"][-1]["certainty"] == "unavailable"
