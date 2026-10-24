"""Research proposal transport and launch boundaries; no paid model calls."""
import asyncio
import json
from uuid import uuid4

import httpx
import pytest
from fastapi import HTTPException
from pydantic import ValidationError

from services.agent.claude.sdk_conversation import ChatResult, ClaudeSdkConversationClient
from services.agent.crud_client import CrudContextReader
from services.agent.graph.builder import AgentGraph
from services.agent.http_contracts import AgentRequest
from services.agent.service import AgentTurnService
from services.agent.state import PlanRunStore, ProcessReceiptCache
from services.agent.tests.test_research_worker import result as sdk_result
from services.agent.tests.test_research_worker import worker
from services.agent.turn import TurnContext, load_prompt
from services.trip_context import TripContext

PLAN = str(uuid4())
MESSAGE = str(uuid4())
OFFER = {"id": str(uuid4()), "status": "available", "revision": 3, "message_id": MESSAGE}
PROPOSAL = {"intent": "offer", "reason": "useful_context", "priority_message_ids": ["current"]}


class Reader:
    def __init__(self, *, offer=OFFER, deferred=False, fail=False, replayed=False, entry_required=False):
        self.calls = []
        self.offer, self.deferred, self.fail, self.replayed = offer, deferred, fail, replayed
        self.entry_required = entry_required

    async def context(self, *args):
        return {"revision": 2, "messages": [{"message_id": MESSAGE, "role": "user", "content": "I enjoy food"}]}

    async def context_run(self, *args, **payload):
        self.calls.append(payload)
        if payload["action"] == "complete" and self.fail:
            raise HTTPException(409, "Trip context changed.")
        completed = payload["action"] == "complete"
        return {"revision": 3 if completed else 2, "context": TripContext().model_dump(),
                "locked": not completed, "research_deferred": self.deferred,
                "research_readiness": {"eligible": True, "reasons": []},
                "research_entry_required": self.entry_required,
                "research_offer": self.offer if completed else None,
                "assistant_message_id": MESSAGE if completed else None}

    async def append(self, *args, **payload):
        self.calls.append({"action": "append", **payload})

    async def generation_context(self, *args):
        return {"revision": 2, "messages": []}

    async def research_offer(self, *args):
        return self.offer

    async def consume_research_entry(self, *args, **payload):
        self.calls.append({"action": "consume", **payload})
        if self.fail:
            raise HTTPException(409, "Invalid confirmation.")
        return {"accepted": True, "request_id": payload["request_id"], "replayed": self.replayed}


class Graph:
    def __init__(self, *, stopped=False, status="in_progress"):
        self.calls = 0
        self.started = asyncio.Event()
        self.stopped, self.status = stopped, status

    async def invoke(self, state, **kwargs):
        self.calls += 1
        self.state = state
        self.started.set()
        if kwargs.get("on_text_delta"):
            await kwargs["on_text_delta"]("A useful reply.")
        if self.stopped:
            await asyncio.Event().wait()
        return {"draft_offer": PROPOSAL, "projection": {
            "status": self.status, "plan_id": state["plan_id"], "event_id": state["event_id"],
            "generation": state["generation"], "assistant_text": "A useful reply.",
            "research_offer": {**OFFER, "id": "untrusted-graph-offer"},
        }}


def service(reader=None, graph=None):
    return AgentTurnService(plan_reader=lambda *args: {"lifecycle": "active", "revision": 1},
                            context_reader=reader or Reader(), graph=graph or Graph(),
                            runs=PlanRunStore(), receipts=ProcessReceiptCache())


def request(**kwargs):
    return AgentRequest(plan_id=PLAN, event_id="research-turn", message="I enjoy food", **kwargs)


@pytest.mark.parametrize("proposal", [
    {**PROPOSAL, "url": "https://attacker.test"},
    {**PROPOSAL, "intent": "generate"},
    {**PROPOSAL, "reason": "create_now"},
    {**PROPOSAL, "priority_message_ids": ["current"] * 13},
    {**PROPOSAL, "source_quote": "x" * 501},
    {**PROPOSAL, "confirmed": True},
])
def test_strict_proposal_cannot_describe_executable_or_unbounded_ui(proposal):
    with pytest.raises(ValidationError):
        ChatResult(answer="hello", needs_input=False, draft_offer=proposal)


def test_existing_model_result_remains_compatible():
    assert ChatResult(answer="hello", needs_input=False).draft_offer is None


def test_same_sdk_call_receives_policy_and_authorized_ids_and_returns_proposal():
    seen = []

    async def sdk(*, prompt, options, **kwargs):
        seen.append(json.loads(prompt))
        assert "draft_offer" in options.output_format["schema"]["properties"]
        yield sdk_result(structured_output={"answer": "We can review a draft when you want.",
                         "needs_input": False, "state_changes": [], "draft_offer": PROPOSAL})

    runtime = worker(sdk)
    context = TurnContext(traveler_scope="private-subject", plan_id=PLAN,
                          recent_messages=({"message_id": MESSAGE, "role": "user", "content": "I enjoy food"},),
                          research_readiness={"eligible": True, "reasons": []}, research_deferred=True)
    reply = asyncio.run(ClaudeSdkConversationClient(runtime.config, worker=runtime).complete_conversation(
        message="I enjoy food", context=context))
    assert len(seen) == 1
    assert seen[0]["research_policy"]["deferred"] is True
    assert seen[0]["conversation_history"][0]["id"] == MESSAGE
    assert "private-subject" not in json.dumps(seen)
    assert reply["draft_offer"]["priority_message_ids"] == ["current"]


def test_graph_carries_proposal_privately_without_projecting_actions():
    class Model:
        async def complete_conversation(self, *, context, **kwargs):
            assert context.research_deferred is True
            return {"decision": "respond", "assistant_text": "Keep researching.", "draft_offer": PROPOSAL}

    result = asyncio.run(AgentGraph(Model()).invoke({"traveler_scope": "t", "plan_id": PLAN,
                         "event_id": "e", "message": "food", "research_deferred": True}))
    assert result["draft_offer"]["intent"] == "offer"
    assert "draft_offer" not in result["projection"]
    assert "research_offer" not in result["projection"]


@pytest.mark.parametrize("offer", [OFFER, None])
def test_only_committed_authority_can_publish_offer_and_duplicate_event_is_replayed(offer):
    reader, graph = Reader(offer=offer, deferred=True), Graph()
    handler = service(reader, graph)

    async def run():
        first = await handler.handle(request(), "t", "Bearer token")
        second = await handler.handle(request(), "t", "Bearer token")
        assert first == second
        assert (first.research_offer.model_dump() if first.research_offer else None) == offer
        assert first.assistant_message_id == MESSAGE

    asyncio.run(run())
    assert graph.calls == 1
    assert graph.state["research_deferred"] is True
    commits = [item for item in reader.calls if item["action"] == "complete"]
    assert len(commits) == 1 and commits[0]["draft_offer"]["intent"] == "offer"


def test_commit_conflict_never_streams_an_offer():
    async def run():
        return [json.loads(event[6:]) async for event in service(Reader(fail=True)).stream(
            request(), "t", "Bearer token", is_disconnected=lambda: asyncio.sleep(0, result=False))]

    events = asyncio.run(run())
    assert next(item for item in events if item["type"] == "TERMINAL")["status"] == "error"
    assert not any(item.get("research_offer") or item.get("snapshot", {}).get("research_offer") for item in events)


def test_previous_offer_is_not_attached_to_an_unrelated_new_reply():
    reader = Reader(offer={**OFFER, "message_id": str(uuid4())})
    reply = asyncio.run(service(reader).handle(request(), "t", "Bearer token"))
    assert reply.research_offer is None
    assert reply.assistant_message_id == MESSAGE


@pytest.mark.parametrize("status", ["deferred", "superseded", "consumed"])
def test_duplicate_message_refreshes_offer_authority_instead_of_replaying_stale_action(status):
    reader, graph = Reader(), Graph()
    handler = service(reader, graph)
    async def run():
        first = await handler.handle(request(), "t", "Bearer token")
        assert first.research_offer.status == "available"
        reader.offer = {**OFFER, "status": status}
        replay = await handler.handle(request(), "t", "Bearer token")
        assert replay.research_offer.status == status
        assert replay.trip_context.research_offer.status == status
    asyncio.run(run())
    assert graph.calls == 1


def test_failed_turn_cannot_publish_even_a_valid_graph_supplied_offer():
    reader = Reader()
    reply = asyncio.run(service(reader, Graph(status="unable to continue")).handle(request(), "t", "Bearer token"))
    assert reply.research_offer is None
    assert not any(item["action"] == "complete" for item in reader.calls)


def test_terminal_and_snapshot_offer_share_committed_message_identity():
    async def run():
        return [json.loads(event[6:]) async for event in service().stream(
            request(), "t", "Bearer token", is_disconnected=lambda: asyncio.sleep(0, result=False))]

    events = asyncio.run(run())
    terminal = next(item for item in events if item["type"] == "TERMINAL")
    snapshot = next(item["snapshot"] for item in events if item["type"] == "STATE_SNAPSHOT")
    assert terminal["research_offer"] == snapshot["research_offer"] == OFFER
    assert terminal["assistant_message_id"] == snapshot["assistant_message_id"] == MESSAGE
    assert "priority_message_ids" not in json.dumps(events)


def test_stopped_stream_has_no_offer_and_no_completion_write():
    async def run():
        reader, graph = Reader(), Graph(stopped=True)
        handler = service(reader, graph)
        async def collect():
            return [json.loads(event[6:]) async for event in handler.stream(
                request(), "t", "Bearer token", is_disconnected=lambda: asyncio.sleep(0, result=False))]
        pending = asyncio.create_task(collect())
        await graph.started.wait()
        assert await handler.cancel("t", PLAN, "research-turn")
        events = await pending
        assert not any(item["action"] == "complete" for item in reader.calls)
        assert next(item for item in events if item["type"] == "TERMINAL")["status"] == "stopped"
        assert not any(item.get("research_offer") for item in events)
    asyncio.run(run())


@pytest.mark.parametrize("kwargs", [{}, {"canvas_action": "generate_plan"},
                                     {"canvas_action": "generate_themes", "context_revision": 2}])
def test_receipt_requires_full_generation_and_reviewed_revision(kwargs):
    with pytest.raises(ValidationError):
        request(research_entry_receipt="receipt", **kwargs)


@pytest.mark.parametrize("fail,revision,replayed", [(True, 2, False), (False, 1, False), (False, 2, True)])
def test_invalid_stale_or_consumed_confirmation_never_invokes_generation(fail, revision, replayed):
    reader, graph = Reader(fail=fail, replayed=replayed), Graph()
    handler = service(reader, graph)
    req = request(canvas_action="generate_plan", context_revision=revision, research_entry_receipt="receipt")
    async def run():
        if replayed:
            assert (await handler.handle(req, "t", "Bearer token")).status == "in_progress"
        else:
            with pytest.raises(HTTPException) as error:
                await handler.handle(req, "t", "Bearer token")
            assert error.value.status_code == 409
    asyncio.run(run())
    assert graph.calls == 0
    assert reader.calls[-1]["action"] == "cancel"


@pytest.mark.parametrize("receipt", [None, "receipt"])
def test_valid_confirmation_and_existing_canvas_generation_preserve_one_run(receipt):
    reader, graph = Reader(), Graph()
    handler = service(reader, graph)
    req = request(canvas_action="generate_plan", context_revision=2, research_entry_receipt=receipt)
    async def run():
        await handler.handle(req, "t", "Bearer token")
        await handler.handle(req, "t", "Bearer token")
    asyncio.run(run())
    assert graph.calls == 1
    assert len([item for item in reader.calls if item["action"] == "consume"]) == (1 if receipt else 0)


@pytest.mark.parametrize("action", ["generate_plan", "generate_themes", "generate_research"])
def test_first_draft_requires_canonical_confirmation_even_when_client_omits_receipt(action):
    reader, graph = Reader(entry_required=True), Graph()
    with pytest.raises(HTTPException) as error:
        asyncio.run(service(reader, graph).handle(request(canvas_action=action, context_revision=2), "t", "Bearer token"))
    assert error.value.status_code == 409
    assert graph.calls == 0


def test_first_draft_with_receipt_uses_existing_generation_flow():
    reader, graph = Reader(entry_required=True), Graph()
    asyncio.run(service(reader, graph).handle(request(canvas_action="generate_plan", context_revision=2,
                research_entry_receipt="receipt"), "t", "Bearer token"))
    assert graph.calls == 1


@pytest.mark.parametrize("action", ["generate_themes", "generate_research"])
def test_existing_group_retry_is_not_gated_by_first_draft_policy(action):
    reader, graph = Reader(entry_required=False), Graph()
    asyncio.run(service(reader, graph).handle(request(canvas_action=action, context_revision=2), "t", "Bearer token"))
    assert graph.calls == 1


@pytest.mark.parametrize("action", ["generate_plan", "generate_themes", "generate_research"])
@pytest.mark.parametrize("missing_snapshot", [False, True])
def test_missing_generation_authority_fails_closed(action, missing_snapshot):
    class OlderReader(Reader):
        async def context_run(self, *args, **kwargs):
            snapshot = await super().context_run(*args, **kwargs)
            if missing_snapshot:
                return None
            snapshot.pop("research_entry_required")
            return snapshot
    graph = Graph()
    with pytest.raises(HTTPException) as error:
        asyncio.run(service(OlderReader(), graph).handle(request(canvas_action=action, context_revision=2), "t", "Bearer token"))
    assert error.value.status_code == 503
    assert graph.calls == 0


def test_older_crud_response_does_not_manufacture_generation_authorization(monkeypatch):
    original_client = httpx.AsyncClient
    transport = httpx.MockTransport(lambda request: httpx.Response(200, json={
        "revision": 1, "context": TripContext().model_dump(), "locked": True,
    }))
    monkeypatch.setattr("services.agent.crud_client.httpx.AsyncClient", lambda **kwargs:
                        original_client(transport=transport, **kwargs))
    snapshot = asyncio.run(CrudContextReader("http://crud").context_run(
        PLAN, "test-token", event_id="older-backend", action="begin"))
    assert "research_entry_required" not in snapshot


def test_prompt_respects_review_first_flights_and_persistent_deferral():
    prompt = load_prompt("chat-v1")
    assert "A confirmed single destination is the only trip-detail prerequisite" in prompt
    assert "does not block offering that review" in prompt
    assert "do not require every brief field or 6/6" in prompt
    assert "when deferred=true do not proactively re-offer" in prompt
    assert "Before suggesting plan generation, resolve" not in prompt
