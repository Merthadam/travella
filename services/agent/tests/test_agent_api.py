from __future__ import annotations

from dataclasses import dataclass
from uuid import uuid4

from fastapi.testclient import TestClient

from services.agent.app import create_app
from services.auth.contracts import ValidatedIdentity


@dataclass
class FakeAdapter:
    calls: int = 0

    async def research(self, **kwargs):
        self.calls += 1
        return {"status": "ready", "run_id": "run-1", "candidates": [{"candidate_id": "c-1", "name": "Kyoto", "status": "shortlisted", "confidence": "strong", "fit_summary": "Temples and food.", "caveats": [], "evidence": [{"evidence_id": "e-1"}]}]}

    async def resolve_map(self, **kwargs):
        return {"status": "ready", "locations": [{"candidate_name": "Kyoto", "place_id": "p-1", "label": "Kyoto, Japan", "city": "Kyoto", "country": "Japan", "location": {"lat": 35.0, "lng": 135.0}, "temporary": True, "attribution": "Google Maps"}]}

    async def sources(self, **kwargs):
        return {"status": "ready", "evidence": [{"evidence_id": "e-1", "title": "Kyoto", "url": "https://example.test/kyoto", "excerpt": "safe"}]}


def _app(adapter=None, *, plan=None):
    identity = ValidatedIdentity("traveler-1", "client", frozenset({"travella/agent"}), 1, 9999999999)
    plan = plan or {"plan_id": str(uuid4()), "lifecycle": "active", "revision": 1}
    def verifier(token: str) -> ValidatedIdentity:
        if token == "good":
            return identity
        raise ValueError("bad token")

    def reader(subject: str, plan_id: object, token: str) -> dict | None:
        if subject == identity.subject and token == "good" and str(plan_id) == plan["plan_id"]:
            return plan
        return None
    return create_app(verifier=verifier, plan_reader=reader, adapter=adapter or FakeAdapter()), plan


def test_owned_plan_research_maps_and_deduplicates():
    adapter = FakeAdapter()
    app, plan = _app(adapter)
    with TestClient(app) as client:
        headers = {"Authorization": "Bearer good"}
        payload = {"plan_id": plan["plan_id"], "event_id": "event-1", "message": "temples and food"}
        first = client.post("/v1/agent/events", headers=headers, json=payload)
        second = client.post("/v1/agent/events", headers=headers, json=payload)
    assert first.status_code == second.status_code == 200
    assert first.json()["status"] == "shortlist_ready"
    assert first.json() == second.json()
    assert adapter.calls == 1


def test_invalid_identity_and_foreign_plan_fail_before_adapter():
    adapter = FakeAdapter()
    app, plan = _app(adapter)
    with TestClient(app) as client:
        payload = {"plan_id": plan["plan_id"], "event_id": "event-1", "message": "Paris"}
        assert client.post("/v1/agent/events", json=payload).status_code == 401
        assert client.post("/v1/agent/events", headers={"Authorization": "Bearer bad"}, json=payload).status_code == 401
    assert adapter.calls == 0


def test_empty_message_is_one_question_and_actions_are_context_only():
    adapter = FakeAdapter()
    app, plan = _app(adapter)
    with TestClient(app) as client:
        headers = {"Authorization": "Bearer good"}
        question = client.post("/v1/agent/events", headers=headers, json={"plan_id": plan["plan_id"], "event_id": "q-1", "message": ""})
        action = client.post("/v1/agent/events", headers=headers, json={"plan_id": plan["plan_id"], "event_id": "a-1", "message": "", "candidate_action": {"action": "reject", "candidate_id": "c-1", "reason": "too far"}})
    assert question.json()["status"] == "needs your input"
    assert action.json()["status"] == "candidate_action"
    assert adapter.calls == 0


def test_source_inspection_is_compact():
    app, plan = _app(FakeAdapter())
    with TestClient(app) as client:
        response = client.post("/v1/agent/events", headers={"Authorization": "Bearer good"}, json={"plan_id": plan["plan_id"], "event_id": "s-1", "message": "run-1", "candidate_action": {"action": "inspect", "evidence_ids": ["e-1"]}})
    assert response.status_code == 200
    assert response.json()["status"] == "source_detail"
    assert "https://example.test/kyoto" in response.text
