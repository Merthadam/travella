"""Real FastAPI handlers and persisted SQL state for Research invitation authority."""
from datetime import timedelta
from uuid import UUID, uuid4

import jwt
from fastapi.testclient import TestClient
from sqlalchemy import func, select

from services.crud.app import create_app
from services.crud.models import PlanningCanvas, ResearchContext, ResearchDraftOffer
from services.crud.purge import purge_expired

from .test_api import create, mutate, write_headers
from .test_api import system as system


def edit(system, path, revision, **fields):
    return system.client.patch(path + "/research-context", headers=write_headers(system, revision),
        json={"changes": [{"operation": "set", "field": key, "value": value, "source": "user_edit"}
                          for key, value in fields.items()]})


def ready(system, *, flights="not-needed"):
    plan = create(system)
    path = f"/v1/plans/{plan['plan_id']}"
    result = edit(system, path, 1, finalDestination="Rome", flexibleDates=True, travelers=2, flights=flights)
    assert result.status_code == 200, result.text
    message = system.client.post(path + "/conversation/messages", json={
        "event_id": str(uuid4()), "role": "user", "content": "We want local food and museums."})
    assert message.status_code == 200
    return plan, path, result.json()["revision"], message.json()["message_id"]


def action(system, path, revision, name, offer_id=None, headers=None):
    return system.client.post(path + "/research-offer/actions", headers=headers or write_headers(system, revision),
        json={"action": name, **({"offer_id": offer_id} if offer_id else {})})


def complete(system, path, revision, *, proposal=None, message="What else should we consider?", cancel=False):
    event = str(uuid4())
    begin = system.client.post(path + "/research-context/run", json={"event_id": event, "action": "begin"})
    assert begin.status_code == 200, begin.text
    if cancel:
        assert system.client.post(path + "/research-context/run", json={"event_id": event, "action": "cancel"}).status_code == 200
    body = {"event_id": event, "action": "complete", "revision": revision,
            "message": message, "assistant_text": "We can review your trip details.", "draft_offer": proposal}
    response = system.client.post(path + "/research-context/run", json=body)
    return response, body


def test_read_is_side_effect_free_and_missing_fields_fail_closed(system):
    plan = create(system)
    path = f"/v1/plans/{plan['plan_id']}"
    empty = system.client.get(path + "/research-offer")
    assert empty.status_code == 200
    assert empty.json()["readiness"] == {"eligible": False, "reasons": [
        "destination_required", "timing_required", "travelers_required", "priorities_required"]}
    assert system.client.get(path + "/research-offer").json() == empty.json()
    with system.factory() as db:
        assert db.scalar(select(func.count()).select_from(ResearchDraftOffer)) == 0
        assert db.get(ResearchContext, UUID(plan["plan_id"])) is None
    assert edit(system, path, 1, finalDestination="Rome").status_code == 200
    assert not system.client.get(path + "/research-offer").json()["readiness"]["eligible"]
    assert edit(system, path, 2, flexibleDates=True, travelers=2).status_code == 200
    assert system.client.get(path + "/research-offer").json()["readiness"]["reasons"] == ["priorities_required"]
    assert action(system, path, 3, "request_review").status_code == 409


def test_ready_without_optional_fields_and_persistent_defer_manual_review(system):
    plan, path, revision, _ = ready(system, flights="undecided")
    snapshot = system.client.get(path + "/research-offer").json()
    assert snapshot["readiness"]["eligible"] and snapshot["context"]["budget"] == ""
    review = action(system, path, revision, "request_review")
    assert review.status_code == 200, review.text
    assert review.json()["research_entry_required"]
    offer = review.json()["offer"]
    assert offer["status"] == "review"
    assert action(system, path, revision, "confirm", offer["id"]).status_code == 409  # flights unresolved
    deferred = action(system, path, revision, "defer", offer["id"])
    assert deferred.status_code == 200 and deferred.json()["deferred"]
    assert deferred.json()["research_entry_required"]
    assert edit(system, path, revision, budget="moderate").status_code == 200
    # A fresh application/session reads the same durable suppression.
    app = create_app(system.verifier, system.factory, clock=lambda: system.current[0])
    with TestClient(app, headers={"Authorization": f"Bearer {system.token}"}) as restarted:
        assert restarted.get(path + "/research-offer").json()["deferred"]
    manual = action(system, path, revision + 1, "request_review")
    assert manual.status_code == 200 and manual.json()["deferred"]
    assert system.client.get(path).json() == plan  # metadata does not mutate the Plan
    with system.factory() as db:
        assert db.get(PlanningCanvas, UUID(plan["plan_id"])) is None


def test_confirm_receipt_exact_revision_idempotency_replay_and_cross_plan(system):
    _, path, revision, _ = ready(system)
    offer = action(system, path, revision, "request_review").json()["offer"]
    headers = write_headers(system, revision)
    confirmed = action(system, path, revision, "confirm", offer["id"], headers=headers)
    assert confirmed.status_code == 200, confirmed.text
    assert action(system, path, revision, "confirm", offer["id"], headers=headers).json() == confirmed.json()
    token = confirmed.json()["research_entry_receipt"]
    assert token
    assert system.client.get(path + "/research-offer").json()["offer"]["status"] == "review"
    consume = {"receipt": token, "request_id": str(uuid4()), "revision": revision}
    other = create(system)
    assert system.client.post(f"/v1/plans/{other['plan_id']}/research-offer/consume", json=consume).status_code == 409
    assert system.client.post(path + "/research-offer/consume", json=consume).status_code == 409
    assert system.client.post(path + "/research-context/run", json={"event_id": consume["request_id"], "action": "begin"}).status_code == 200
    accepted = system.client.post(path + "/research-offer/consume", json=consume)
    assert accepted.status_code == 200 and not accepted.json()["replayed"]
    assert system.client.post(path + "/research-offer/consume", json=consume).json()["replayed"]
    assert system.client.post(path + "/research-offer/consume", json={**consume, "request_id": str(uuid4())}).status_code == 409
    assert system.client.get(path + "/research-offer").json()["offer"]["status"] == "consumed"


def test_stale_review_confirm_and_receipt_expiry(system):
    _, path, revision, _ = ready(system)
    offer = action(system, path, revision, "request_review").json()["offer"]
    assert edit(system, path, revision, travelers=3).status_code == 200
    assert action(system, path, revision, "confirm", offer["id"]).status_code == 409
    assert action(system, path, revision + 1, "confirm", offer["id"]).status_code == 409
    assert system.client.get(path + "/research-offer").json()["offer"]["status"] == "superseded"
    review = action(system, path, revision + 1, "request_review").json()
    confirm = action(system, path, revision + 1, "confirm", review["offer"]["id"]).json()
    system.current[0] += timedelta(minutes=6)
    assert system.client.post(path + "/research-offer/consume", json={"receipt": confirm["research_entry_receipt"],
        "request_id": str(uuid4()), "revision": revision + 1}).status_code == 409


def test_offer_commits_with_message_and_duplicate_cancel_cannot_orphan(system):
    _, path, revision, priority_id = ready(system)
    proposal = {"intent": "offer", "reason": "useful_context", "priority_message_ids": [priority_id]}
    cancelled, _ = complete(system, path, revision, proposal=proposal, cancel=True)
    assert cancelled.status_code == 409
    assert system.client.get(path + "/research-offer").json()["offer"] is None
    response, body = complete(system, path, revision, proposal=proposal)
    assert response.status_code == 200, response.text
    offer = response.json()["research_offer"]
    assert offer and offer["message_id"] == response.json()["assistant_message_id"]
    history = system.client.get(path + "/conversation/messages").json()
    assert history[-1]["research_offer"] == offer
    assert system.client.post(path + "/research-context/run", json=body).status_code == 409
    repeated, _ = complete(system, path, revision, proposal=proposal)
    assert repeated.status_code == 200
    with system.factory() as db:
        assert db.scalar(select(func.count()).select_from(ResearchDraftOffer)) == 1


def test_text_deferral_and_explicit_later_request_and_foreign_evidence(system):
    _, path, revision, _ = ready(system)
    foreign, _ = complete(system, path, revision, proposal={"priority_message_ids": [str(uuid4())]})
    assert foreign.status_code == 200 and foreign.json()["research_offer"] is None
    response, _ = complete(system, path, revision, message="Keep researching for now", proposal={
        "intent": "defer", "reason": "traveler_deferred", "source_quote": "Keep researching"})
    assert response.status_code == 200 and response.json()["research_deferred"]
    response, _ = complete(system, path, revision, proposal={"intent": "offer"})
    assert response.json()["research_offer"]["status"] == "deferred"
    vague, _ = complete(system, path, revision, message="yes", proposal={
        "intent": "request_review", "source_quote": "yes"})
    assert vague.json()["research_deferred"]
    explicit, _ = complete(system, path, revision, message="Let's create a draft", proposal={
        "intent": "request_review", "reason": "traveler_request", "source_quote": "Let's create a draft"})
    assert explicit.status_code == 200 and not explicit.json()["research_deferred"]
    assert explicit.json()["research_offer"]["status"] == "available"


def test_wrong_owner_invalid_missing_and_lifecycle(system):
    plan, path, revision, _ = ready(system)
    review = action(system, path, revision, "request_review").json()
    foreign = jwt.encode(system.claims | {"sub": "another-traveler"}, system.private, algorithm="RS256")
    for authorization, status in [("", 401), (f"Bearer {foreign}", 404)]:
        headers = {**write_headers(system, revision), "Authorization": authorization}
        assert system.client.get(path + "/research-offer", headers=headers).status_code == status
        assert action(system, path, revision, "defer", headers=headers).status_code == status
        assert system.client.post(path + "/research-offer/consume", headers=headers, json={
            "receipt": str(uuid4()), "request_id": str(uuid4()), "revision": revision}).status_code == status
    assert system.client.get(f"/v1/plans/{uuid4()}/research-offer").status_code == 404
    assert action(system, path, revision, "generate").status_code == 422
    assert action(system, path, revision, "confirm", str(uuid4())).status_code == 409
    assert action(system, path, revision, "defer", headers={"If-Match": str(revision)}).status_code == 422
    deleted = mutate(system, plan, "delete").json()
    assert system.client.get(path + "/research-offer").status_code == 404
    assert action(system, path, revision, "request_review").status_code == 404
    restored = mutate(system, deleted, "restore").json()
    assert system.client.get(path + "/research-offer").json()["offer"] == review["offer"]
    mutate(system, restored, "delete")
    system.current[0] += timedelta(days=8)
    with system.factory() as db:
        assert purge_expired(db, database_now=system.current[0]).purged_count == 1
        assert db.scalar(select(func.count()).select_from(ResearchDraftOffer)) == 0


def test_contradicted_priorities_and_changed_destination_remove_readiness(system):
    _, path, revision, _ = ready(system)
    complete(system, path, revision, message="No flights, please.")
    assert system.client.get(path + "/research-offer").json()["readiness"]["eligible"]
    complete(system, path, revision, message="We are unsure about our priorities.")
    assert not system.client.get(path + "/research-offer").json()["readiness"]["eligible"]


def test_current_priority_contradiction_overrides_older_explicit_brief(system):
    plan, path, revision, _ = ready(system)
    brief = system.client.patch(path + "/brief", headers=write_headers(system, plan["revision"]),
                               json={"interests": "Museums and architecture"})
    assert brief.status_code == 200
    assert system.client.get(path + "/research-offer").json()["readiness"]["eligible"]
    system.current[0] += timedelta(seconds=1)
    complete(system, path, revision, message="No museums or architecture; our interests are undecided.")
    assert system.client.get(path + "/research-offer").json()["readiness"]["reasons"] == ["priorities_required"]


def test_initial_preferences_survive_first_destination_confirmation(system):
    plan = create(system)
    path = f"/v1/plans/{plan['plan_id']}"
    system.client.post(path + "/conversation/messages", json={"event_id": str(uuid4()),
        "role": "user", "content": "Lisbon food and walking sound great."})
    system.current[0] += timedelta(seconds=2)
    assert edit(system, path, 1, finalDestination="Lisbon", flexibleDates=True, travelers=2).status_code == 200
    assert system.client.get(path + "/research-offer").json()["readiness"]["eligible"]
    system.current[0] += timedelta(seconds=1)
    assert edit(system, path, 2, finalDestination="Paris").status_code == 200
    assert not system.client.get(path + "/research-offer").json()["readiness"]["eligible"]


def test_begin_policy_and_cancelled_launch_require_live_owned_lease(system):
    _, path, revision, _ = ready(system)
    assert system.client.get(path + "/research-offer").json()["research_entry_required"]
    offer = action(system, path, revision, "request_review").json()["offer"]
    confirmed = action(system, path, revision, "confirm", offer["id"]).json()
    request = str(uuid4())
    begin = system.client.post(path + "/research-context/run", json={"event_id": request, "action": "begin"}).json()
    assert begin["locked"] and begin["research_readiness"]["eligible"] and begin["research_entry_required"]
    assert not system.client.get(path + "/research-offer").json()["readiness"]["eligible"]
    consume = {"receipt": confirmed["research_entry_receipt"], "request_id": request, "revision": revision}
    wrong = {**consume, "request_id": str(uuid4())}
    assert system.client.post(path + "/research-offer/consume", json=wrong).status_code == 409
    system.client.post(path + "/research-context/run", json={"event_id": request, "action": "cancel"})
    assert system.client.post(path + "/research-offer/consume", json=consume).status_code == 409
    system.client.post(path + "/research-context/run", json={"event_id": request, "action": "begin"})
    assert system.client.post(path + "/research-offer/consume", json=consume).status_code == 200
    assert not system.client.get(path + "/research-offer").json()["research_entry_required"]
    system.client.post(path + "/research-context/run", json={"event_id": request, "action": "cancel"})
    edit(system, path, revision, travelers=3)
    assert system.client.get(path + "/research-offer").json()["research_entry_required"]


def test_postgres_offer_http_persistence_and_additive_migration(postgres_engine, system):
    """Only the guarded dedicated test DB is used; real handlers, migration, restart."""
    from alembic import command
    from sqlalchemy import inspect
    from sqlalchemy.orm import sessionmaker

    from services.crud.migration import alembic_config, assert_database_at_head

    factory = sessionmaker(postgres_engine, expire_on_commit=False)
    app = create_app(system.verifier, factory, clock=lambda: system.current[0])
    with TestClient(app, headers={"Authorization": f"Bearer {system.token}"}) as client:
        system.client = client
        plan, path, revision, priority_id = ready(system)
        response, _ = complete(system, path, revision, proposal={"priority_message_ids": [priority_id]})
        assert response.status_code == 200
        assert response.json()["research_offer"]["status"] == "available"
        assert action(system, path, revision, "defer").json()["deferred"]
    with TestClient(create_app(system.verifier, factory, clock=lambda: system.current[0]),
                    headers={"Authorization": f"Bearer {system.token}"}) as restarted:
        assert restarted.get(path + "/research-offer").json()["deferred"]
        assert restarted.get(path + "/conversation/messages").json()[-1]["research_offer"]["status"] == "deferred"
    command.downgrade(alembic_config(), "0010")
    assert "research_draft_offers" not in inspect(postgres_engine).get_table_names()
    command.upgrade(alembic_config(), "head")
    assert_database_at_head(postgres_engine)
    with TestClient(create_app(system.verifier, factory), headers={"Authorization": f"Bearer {system.token}"}) as restarted:
        result = restarted.get(path + "/research-offer")
        assert result.status_code == 200 and result.json()["offer"] is None
        assert result.json()["context"]["finalDestination"] == "Rome"
        assert restarted.get(path).json()["plan_id"] == plan["plan_id"]
