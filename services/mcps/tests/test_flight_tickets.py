import asyncio
import json
from uuid import uuid4

import httpx
import pytest
from fastapi.testclient import TestClient

from services.agent.app import create_app
from services.auth.contracts import ValidatedIdentity
from services.mcps.flight_checkout import remember
from services.mcps.liteapi import LiteApi, ProviderUnavailable
from services.mcps.sandbox_checkout import seal


@pytest.fixture
def booking(tmp_path, monkeypatch):
    monkeypatch.setenv("FLIGHT_CHECKOUT_JOURNAL", str(tmp_path / "receipts.sqlite3"))
    pid = str(uuid4())
    state = {
        "offer": "offer",
        "booking_id": "booking",
        "criteria": {"adults": 2, "children_ages": [], "infant_ages": []},
    }
    people = [
        {"firstName": name, "lastName": "Tester", "documentNumber": "PRIVATE_PASSPORT"}
        for name in ["Alex", "Sam"]
    ]
    raw = {
        "bookingId": "booking",
        "status": "CONFIRMED",
        "passengers": people,
        "contact": "PRIVATE_CONTACT",
        "ticketData": {
            "pointOfSale": {"environment": "sandbox"},
            "ticketedAt": "2026-11-03T12:00:00Z",
            "tickets": [
                {**p, "passengerIndex": i, "ticketNumber": f"TICKET-{i}", "status": "issued"}
                for i, p in enumerate(people)
            ],
        },
    }
    requests = []

    def supplier(request):
        requests.append(request)
        assert request.method == "GET" and request.url.path.endswith("/flights/bookings/booking")
        return httpx.Response(200, json={"data": [{"booking": raw}]})

    transport = httpx.MockTransport(supplier)
    api = LiteApi("sand_TEST", scope=("owner", pid), transport=transport)
    from services.mcps.flight_checkout import receipt

    receipt(api, state, claim=True)
    remember(api, state, seal(api, "flight-checkout", state))
    return api, raw, requests, transport, pid


def lookup(api, booking_id="booking"):
    return asyncio.run(api.call("sandbox/flights/tickets", {"booking_id": booking_id}))


def test_ticket_lookup_read_only_projection_and_partial_association(booking):
    api, raw, requests, _, _ = booking
    result = lookup(api)
    assert [t["passenger_name"] for t in result["tickets"]] == ["Alex Tester", "Sam Tester"]
    assert "PRIVATE" not in json.dumps(result)
    assert set(result["tickets"][0]) == {
        "passenger_index",
        "passenger_name",
        "ticket_number",
        "status",
    }
    # A missing first ticket must never relabel the second as passenger one.
    raw["ticketData"]["tickets"] = raw["ticketData"]["tickets"][1:]
    assert lookup(api)["tickets"][0]["passenger_index"] == 1
    raw["ticketData"]["tickets"][0]["passengerIndex"] = 0
    assert lookup(api)["tickets"] == []
    assert all(r.method == "GET" for r in requests)


@pytest.mark.parametrize("change", ["wrong_subject", "wrong_plan", "unknown_booking", "wrong_key"])
def test_unowned_ticket_lookup_rejected_before_provider(booking, change):
    api, _, requests, transport, pid = booking
    other = LiteApi(
        "sand_OTHER" if change == "wrong_key" else "sand_TEST",
        scope=(
            "other" if change == "wrong_subject" else "owner",
            "other" if change == "wrong_plan" else pid,
        ),
        transport=transport,
    )
    with pytest.raises(ProviderUnavailable, match="booking_not_found"):
        lookup(other, "unknown" if change == "unknown_booking" else "booking")
    assert requests == []


@pytest.mark.parametrize("change", ["booking_id", "environment", "conflicting_environment"])
def test_mismatched_supplier_identity_fails_closed(booking, change):
    api, raw, _, _, _ = booking
    if change == "booking_id":
        raw["bookingId"] = "different"
    elif change == "environment":
        raw["ticketData"]["pointOfSale"]["environment"] = "production"
    else:
        raw["providerEnvironment"] = "production"
    with pytest.raises(ProviderUnavailable, match="provider_response_invalid"):
        lookup(api)


@pytest.mark.parametrize("status", ["CANCELLED", "PENDING_CONFIRMATION"])
def test_unconfirmed_bookings_never_offer_ticket_downloads(booking, status):
    api, raw, _, _, _ = booking
    raw["status"] = status
    assert lookup(api)["tickets"] == []


def test_http_read_auth_ownership_validation_and_projection(booking):
    api, _, requests, _, pid = booking
    plan = {"lifecycle": "active", "traveler_subject": "owner"}

    def verify(token):
        if token != "valid":
            raise ValueError()
        return ValidatedIdentity(
            "owner", "client", frozenset({"aws.cognito.signin.user.admin"}), 1, 9999999999
        )

    class Client:
        async def call(self, name, args, **scope):
            assert scope["subject"] == "owner" and scope["plan_id"] == pid
            try:
                return await api.call(args["action"], args["criteria"])
            except ProviderUnavailable as exc:
                return {"status": "unavailable", "code": exc.code}

    app = create_app(
        verifier=verify,
        plan_reader=lambda subject, plan_id, token: plan if str(plan_id) == pid else None,
        adapter=object(),
        travel_client=Client(),
    )
    path = f"/v1/agent/plans/{pid}/travel/sandbox/flights/tickets"
    headers = {"Authorization": "Bearer valid"}
    with TestClient(app) as client:
        assert client.post(path, json={"booking_id": "booking"}).status_code == 401
        assert (
            client.post(
                path.replace(pid, str(uuid4())), headers=headers, json={"booking_id": "booking"}
            ).status_code
            == 404
        )
        plan["traveler_subject"] = "other"
        assert client.post(path, headers=headers, json={"booking_id": "booking"}).status_code == 404
        plan["traveler_subject"] = "owner"
        assert (
            client.post(path, headers=headers, json={"booking_id": "../booking"}).status_code == 422
        )
        assert (
            client.post(
                path, headers=headers, json={"booking_id": "booking", "subject": "other"}
            ).status_code
            == 422
        )
        assert client.post(path, headers=headers, json={"booking_id": "missing"}).status_code == 404
        assert requests == []
        response = client.post(path, headers=headers, json={"booking_id": "booking"})
        assert response.status_code == 200 and len(response.json()["tickets"]) == 2
        assert response.headers["cache-control"] == "no-store"
        assert "PRIVATE" not in response.text
