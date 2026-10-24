"""Agent-to-CRUD HTTP integration with a real isolated SQL database, no model calls."""
# Imported pytest fixtures are injected by name into the test functions.
# ruff: noqa: F811
import asyncio
from uuid import uuid4

import httpx
import pytest
from fastapi import HTTPException

from services.agent.crud_client import CrudContextReader, CrudPlanReader
from services.agent.graph.builder import AgentGraph
from services.agent.http_contracts import AgentRequest
from services.agent.service import AgentTurnService
from services.agent.state import PlanRunStore, ProcessReceiptCache
from services.crud.tests.test_api import create, system, write_headers  # noqa: F401


def test_committed_offer_hydrates_and_confirmation_is_consumed_once(system, monkeypatch):
    plan = create(system)
    plan_id = plan["plan_id"]
    base = f"/v1/plans/{plan_id}"
    changes = [{"operation": "set", "field": field, "value": value, "source": "user_edit"}
               for field, value in [("finalDestination", "Kyoto"), ("flights", "not-needed")]]
    edited = system.client.patch(base + "/research-context", headers=write_headers(system, 1),
                                 json={"changes": changes})
    assert edited.status_code == 200, edited.text
    revision = edited.json()["revision"]
    original_client = httpx.AsyncClient
    monkeypatch.setattr("services.agent.crud_client.httpx.AsyncClient", lambda **kwargs:
                        original_client(transport=httpx.ASGITransport(app=system.app), **kwargs))

    class Model:
        calls = 0

        async def complete_conversation(self, **kwargs):
            self.calls += 1
            assert kwargs["context"].research_deferred is False
            return {"decision": "respond", "assistant_text": "We can review your trip details.",
                    "draft_offer": {"intent": "offer", "reason": "useful_context", "priority_message_ids": []}}

    model = Model()
    handler = AgentTurnService(plan_reader=CrudPlanReader("http://crud"), context_reader=CrudContextReader("http://crud"),
                               graph=AgentGraph(model), runs=PlanRunStore(), receipts=ProcessReceiptCache())
    event = str(uuid4())
    req = AgentRequest(plan_id=plan_id, event_id=event, message="Please review my draft.")
    async def conversation():
        first = await handler.handle(req, "traveler-one", f"Bearer {system.token}")
        second = await handler.handle(req, "traveler-one", f"Bearer {system.token}")
        assert first == second
        return first
    result = asyncio.run(conversation())
    assert result.research_offer is not None, result
    assert model.calls == 1
    history = system.client.get(base + "/conversation/messages").json()
    assistant = next(item for item in history if item["role"] == "assistant")
    assert assistant["message_id"] == result.assistant_message_id == result.research_offer.message_id
    assert assistant["research_offer"] == result.research_offer.model_dump()
    ready = system.client.get(base + "/research-offer").json()
    assert ready["readiness"]["eligible"] is True
    assert ready["research_entry_required"] is True
    review = system.client.post(base + "/research-offer/actions", headers=write_headers(system, revision),
                                json={"action": "request_review", "offer_id": result.research_offer.id})
    assert review.status_code == 200, review.text
    confirmed = system.client.post(base + "/research-offer/actions", headers=write_headers(system, revision),
                                   json={"action": "confirm", "offer_id": result.research_offer.id})
    assert confirmed.status_code == 200, confirmed.text
    receipt = confirmed.json()["research_entry_receipt"]

    class Generation:
        calls = 0

        async def invoke(self, state, **kwargs):
            self.calls += 1
            assert state["context_revision"] == revision
            return {"projection": {"status": "in_progress", "plan_id": state["plan_id"],
                                    "event_id": state["event_id"], "generation": state["generation"]}}

    generation = Generation()
    handler.graph = generation
    launch = AgentRequest(plan_id=plan_id, event_id=str(uuid4()), canvas_action="generate_plan",
                          context_revision=revision, research_entry_receipt=receipt)
    async def generate():
        first = await handler.handle(launch, "traveler-one", f"Bearer {system.token}")
        assert (await handler.handle(launch, "traveler-one", f"Bearer {system.token}")) == first
        # A fresh process must observe the durable acceptance, not invoke again.
        restarted = AgentTurnService(plan_reader=handler.plan_reader, context_reader=handler.context_reader,
                                     graph=generation, runs=PlanRunStore(), receipts=ProcessReceiptCache())
        assert (await restarted.handle(launch, "traveler-one", f"Bearer {system.token}")).status == "in_progress"
    asyncio.run(generate())
    assert generation.calls == 1
    saved = system.client.get(base + "/research-offer").json()
    assert saved["offer"]["status"] == "consumed"
    assert saved["research_entry_required"] is False
    # An unsaved draft still exists after explicit in-canvas flight edits. Its
    # normal regeneration/group retry controls must not become initial entry.
    changed = system.client.patch(base + "/research-context", headers=write_headers(system, revision),
                                  json={"changes": [{"operation": "set", "field": "flights",
                                                     "value": "needed", "source": "user_edit"}]})
    assert changed.status_code == 200, changed.text
    revision = changed.json()["revision"]
    assert system.client.get(base + "/research-offer").json()["research_entry_required"] is False
    async def retry_groups():
        for action in ("generate_plan", "generate_themes", "generate_research"):
            retry = AgentRequest(plan_id=plan_id, event_id=str(uuid4()), canvas_action=action,
                                 context_revision=revision)
            assert (await handler.handle(retry, "traveler-one", f"Bearer {system.token}")).status == "in_progress"
    asyncio.run(retry_groups())
    assert generation.calls == 4


@pytest.mark.parametrize("action", ["generate_plan", "generate_themes", "generate_research"])
def test_fresh_plan_cannot_bypass_confirmation_through_group_generation(system, monkeypatch, action):
    plan = create(system)
    base = f"/v1/plans/{plan['plan_id']}"
    before = system.client.get(base + "/research-offer").json()
    assert before["research_entry_required"] is True
    original_client = httpx.AsyncClient
    monkeypatch.setattr("services.agent.crud_client.httpx.AsyncClient", lambda **kwargs:
                        original_client(transport=httpx.ASGITransport(app=system.app), **kwargs))

    class Generation:
        calls = 0

        async def invoke(self, state, **kwargs):
            self.calls += 1
            raise AssertionError("Unconfirmed initial generation must never invoke the graph")

    generation = Generation()
    handler = AgentTurnService(plan_reader=CrudPlanReader("http://crud"), context_reader=CrudContextReader("http://crud"),
                               graph=generation, runs=PlanRunStore(), receipts=ProcessReceiptCache())
    req = AgentRequest(plan_id=plan["plan_id"], event_id=str(uuid4()), canvas_action=action,
                       context_revision=before["revision"])
    with pytest.raises(HTTPException) as error:
        asyncio.run(handler.handle(req, "traveler-one", f"Bearer {system.token}"))
    assert error.value.status_code == 409
    assert generation.calls == 0
    after = system.client.get(base + "/research-offer").json()
    assert after["research_entry_required"] is True
    assert after["locked"] is False
    assert after["offer"] is None
    assert after["revision"] == before["revision"]


@pytest.mark.parametrize("deferred_message,intent", [("Keep researching for now", "defer"), ("yes", "request_review")])
def test_current_message_intent_is_validated_by_crud(system, monkeypatch, deferred_message, intent):
    plan = create(system)
    original_client = httpx.AsyncClient
    monkeypatch.setattr("services.agent.crud_client.httpx.AsyncClient", lambda **kwargs:
                        original_client(transport=httpx.ASGITransport(app=system.app), **kwargs))

    class Model:
        async def complete_conversation(self, **kwargs):
            return {"decision": "respond", "assistant_text": "Let's continue.",
                    "draft_offer": {"intent": intent, "reason": "traveler_deferred" if intent == "defer" else "traveler_request",
                                    "source_quote": deferred_message}}

    handler = AgentTurnService(plan_reader=CrudPlanReader("http://crud"), context_reader=CrudContextReader("http://crud"),
                               graph=AgentGraph(Model()), runs=PlanRunStore(), receipts=ProcessReceiptCache())
    req = AgentRequest(plan_id=plan["plan_id"], event_id=str(uuid4()), message=deferred_message)
    response = asyncio.run(handler.handle(req, "traveler-one", f"Bearer {system.token}"))
    assert response.status == "in_progress"
    canonical = system.client.get(f"/v1/plans/{plan['plan_id']}/research-offer").json()
    assert canonical["deferred"] is (intent == "defer")
    if intent == "request_review":
        assert canonical["offer"] is None
    else:
        assert canonical["offer"]["status"] == "deferred"
