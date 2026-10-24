import asyncio
from unittest.mock import AsyncMock

import pytest

from services.agent.canvas_mapping import mapped_components
from services.agent.config import ResearchWorkerConfig
from services.agent.graph.nodes.canvas_generation import CanvasGenerationNode


def context(need, source=None):
    return {"finalDestination": "Lisbon", "candidates": ["Lisbon"], "flights": need, "provenance": {"finalDestination": {"source": "user_edit", "updated_at": "2026-10-24T06:00:00Z"}, **({"flights": {
        "source": source, "updated_at": "2026-10-16T10:00:00Z",
    }} if source else {})}}


@pytest.mark.parametrize("need,source,included", [
    ("undecided", None, False), ("needed", None, False),
    ("needed", "agent_inferred", False), ("not-needed", "user_edit", False),
    ("needed", "user_edit", True), ("needed", "user_explicit", True),
])
def test_mapping_includes_only_confirmed_needed_flights(need, source, included):
    components = mapped_components(context(need, source))
    assert ("flights" in components) is included
    assert "accommodation" in components


@pytest.mark.parametrize("action", ["generate_plan", "generate_themes", "generate_research"])
@pytest.mark.parametrize("trip", [context("undecided"), context("needed"), context("needed", "agent_inferred")])
def test_unconfirmed_generation_stops_before_any_worker(action, trip):
    worker, research = AsyncMock(), AsyncMock()
    node = CanvasGenerationNode(worker, research)
    result = asyncio.run(node({"canvas_action": action, "trip_context": trip}))
    assert result["status"] == "unable to continue"
    assert "Confirm whether you need flights" in result["error"]
    worker.run.assert_not_called()
    research.run.assert_not_called()
    assert not result["state_changes"]


@pytest.mark.parametrize("need,included", [("needed", True), ("not-needed", False)])
def test_confirmed_generation_emits_expected_components(need, included):
    worker = AsyncMock()
    worker.config = ResearchWorkerConfig(api_key="test")
    worker.run.return_value = {"status": "ready", "items": []}
    research = AsyncMock()
    research.run.return_value = {"findings": {"status": "empty", "items": []},
                                 "links": {"status": "empty", "items": []}}
    node = CanvasGenerationNode(worker, research)
    result = asyncio.run(node({"canvas_action": "generate_plan", "trip_context": context(need, "user_edit"),
                               "traveler_scope": "traveler", "plan_id": "plan",
                               "canvas_draft": {"components": mapped_components(context("needed", "user_edit"))}}))
    assert result["status"] == "canvas_draft_ready"
    assert result["canvas_draft"]["group_status"] == {"themes": "ready", "research": "ready"}
    assert ("flights" in result["canvas_draft"]["components"]) is included



@pytest.mark.parametrize("destination,source", [("", None), ("Lisbon", None), ("Lisbon", "agent_inferred"), ("Lisbon", "memory")])
def test_generation_requires_a_traveler_confirmed_destination(destination, source):
    trip = context("not-needed", "user_edit")
    trip["finalDestination"] = destination
    trip["provenance"].pop("finalDestination")
    if source:
        trip["provenance"]["finalDestination"] = {"source": source, "updated_at": "2026-10-24T06:00:00Z"}
    worker, research = AsyncMock(), AsyncMock()
    result = asyncio.run(CanvasGenerationNode(worker, research)({"canvas_action": "generate_plan", "trip_context": trip}))
    assert result["status"] == "unable to continue"
    assert "Confirm a destination" in result["error"]
    worker.run.assert_not_called()
    research.run.assert_not_called()
