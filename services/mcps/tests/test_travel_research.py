"""Real connector requests with deterministic supplier responses; no bookings."""

import asyncio
import json
from copy import deepcopy

import httpx
import pytest
from pydantic import ValidationError

from services.mcps import travel_research
from services.mcps.liteapi import LiteApi, ProviderUnavailable
from services.mcps.tests.test_liteapi import FLIGHT, flight_payload, hotel_payload
from services.mcps.transport import ToolAuthContext, authenticated_context
from services.mcps.travel_server import travel_mcp, travel_search


class ResearchSupplier:
    def __init__(self):
        self.calls = []
        self.reviews = {
            "data": [
                {
                    "name": "PRIVATE_REVIEWER",
                    "email": "PRIVATE_EMAIL",
                    "averageScore": 8,
                    "date": "2026-10-01 12:00:00",
                    "headline": "<b>Quiet</b>",
                    "pros": "Good breakfast",
                    "cons": "Contact guest@example.test or https://example.test/token",
                }
            ],
            "sentimentAnalysis": {
                "categories": [{"name": "Noise", "rating": 8, "description": "Usually quiet"}],
                "pros": ["Quiet"],
                "cons": ["Small rooms"],
                "secret": "PRIVATE",
            },
        }
        self.search = flight_payload()
        journey = deepcopy(self.search["data"][0]["journeys"][0])
        journey.update(journey.pop("cheapestOffer"))
        journey["pricing"]["display"]["total"] = 280
        journey["fare"] = {"family": "Economy Flex", "mixedCabin": False}
        journey["terms"].update(
            changeable=True, changeFee={"pricing": {"display": {"amount": 40, "currency": "EUR"}}}
        )
        self.verified = {"data": [{"journey": journey, "changes": {"messages": ["Price changed"]}}]}

    def __call__(self, request):
        self.calls.append((request.method, request.url.path, dict(request.url.params)))
        path = request.url.path.removeprefix("/v3.0")
        if path == "/flights/rates":
            return httpx.Response(200, json=self.search)
        if path == "/flights/verify":
            assert json.loads(request.content) == {"offerId": "SECRET_OFFER"}
            return httpx.Response(200, json=self.verified)
        if path == "/data/reviews":
            return httpx.Response(200, json=self.reviews)
        if path == "/data/hotel":
            return httpx.Response(
                200,
                json={
                    "data": {
                        "id": "lp1",
                        "name": "Test stay",
                        "hotelDescription": "Quiet base",
                        "hotelFacilities": ["Pool"],
                    }
                },
            )
        if path == "/hotels/rates":
            return httpx.Response(200, json=hotel_payload())
        pytest.fail(f"Unexpected supplier action: {path}")


@pytest.fixture
def research():
    travel_research._offers.clear()
    supplier = ResearchSupplier()
    api = LiteApi("live_TEST", scope=("owner", "plan"), transport=httpx.MockTransport(supplier))
    yield api, supplier
    travel_research._offers.clear()


def test_reviews_normalized_bounded_and_no_reviewer_identity(research):
    api, supplier = research
    result = asyncio.run(api.call("hotels/reviews", {"hotel_id": "lp1", "sentiment": True}))
    assert result["reviews"][0]["headline"] == "Quiet"
    assert result["sentiment"]["ai_generated"] is True
    assert result["sentiment"]["categories"][0]["score"] == 8
    assert result["sandbox"] is False and result["status"] == "ready"
    wire = json.dumps(result)
    assert all(
        value not in wire for value in ("PRIVATE", "guest@example.test", "https://example.test")
    )
    assert supplier.calls[0][2] == {
        "hotelId": "lp1",
        "limit": "5",
        "offset": "0",
        "getSentiment": "true",
        "timeout": "4",
    }
    supplier.reviews["data"] *= 30
    supplier.reviews["data"][0]["pros"] = "x" * 5000
    result = asyncio.run(api.call("hotels/reviews", {"hotel_id": "lp1", "limit": 2}))
    assert len(result["reviews"]) == 2 and len(result["reviews"][0]["pros"]) == 600
    assert result["sentiment"] is None


@pytest.mark.parametrize("payload", [{"data": {}}, {"data": ["bad"]}, {"wrong": []}])
def test_invalid_review_payload_is_not_an_empty_success(research, payload):
    api, supplier = research
    supplier.reviews = payload
    with pytest.raises(ProviderUnavailable):
        asyncio.run(api.call("hotels/reviews", {"hotel_id": "lp1"}))


def test_empty_reviews_and_input_validation(research):
    api, supplier = research
    supplier.reviews = {"data": []}
    result = asyncio.run(api.call("hotels/reviews", {"hotel_id": "lp1", "sentiment": True}))
    assert result["status"] == "empty" and result["sentiment"] is None
    assert "not supplied" in result["notices"][-1]
    for args in (
        {"hotel_id": "../secret"},
        {"hotel_id": "lp1", "limit": 11},
        {"hotel_id": "lp1", "offset": -1},
        {"hotel_id": "lp1", "subject": "other"},
    ):
        with pytest.raises(ValidationError):
            asyncio.run(api.call("hotels/reviews", args))
    assert len(supplier.calls) == 1


def test_named_mcp_tools_are_discoverable_read_only_and_scoped(research, monkeypatch):
    from services.agent.travel_contracts import HotelSearch
    from services.mcps.tests.test_liteapi import HOTEL
    from services.mcps.transport import AuthenticationError
    from services.mcps.travel_server import (
        get_stay_details,
        get_stay_rates,
        get_stay_reviews,
        verify_flight_offer,
    )

    api, supplier = research
    monkeypatch.setattr("services.mcps.travel_server.LiteApi", lambda *args, **kwargs: api)

    async def run():
        catalog = {tool.name: tool for tool in await travel_mcp.list_tools()}
        names = {"get_stay_details", "get_stay_reviews", "get_stay_rates", "verify_flight_offer"}
        assert names <= catalog.keys()
        for name in names:
            assert catalog[name].annotations.readOnlyHint
            assert not catalog[name].annotations.destructiveHint
            assert "plan_id" in catalog[name].inputSchema["required"]
        for call in (
            lambda: get_stay_details("plan", "lp1"),
            lambda: get_stay_reviews("plan", "lp1"),
            lambda: get_stay_rates(
                "plan", HotelSearch.model_validate({**HOTEL, "hotel_id": "lp1"})
            ),
            lambda: verify_flight_offer("plan", "flight-" + "0" * 32),
        ):
            with pytest.raises(AuthenticationError):
                await call()
            with authenticated_context(ToolAuthContext("owner", "different-plan", "assertion")):
                with pytest.raises(AuthenticationError):
                    await call()
        with authenticated_context(ToolAuthContext("owner", "plan", "assertion")):
            content = await travel_mcp.call_tool(
                "get_stay_rates", {"plan_id": "plan", "criteria": {**HOTEL, "hotel_id": "lp1"}}
            )
            assert json.loads(content[0].text)["results"][0]["rooms"][0]["name"] == "Double"
            assert (await get_stay_rates("plan", HotelSearch.model_validate(HOTEL)))[
                "status"
            ] == "invalid"

    asyncio.run(run())
    assert len(supplier.calls) == 1


@pytest.mark.parametrize("mutation", ["missing_journey", "wrong_route", "wrong_currency"])
def test_invalid_verify_response_fails_closed(research, mutation):
    api, supplier = research
    ref = asyncio.run(api.call("flights/search", FLIGHT))["results"][0]["id"]
    if mutation == "missing_journey":
        supplier.verified = {"data": [{}]}
    elif mutation == "wrong_route":
        supplier.verified["data"][0]["journey"]["segments"][0]["originCode"] = "LHR"
    else:
        supplier.verified["data"][0]["journey"]["pricing"]["display"]["currency"] = "USD"
    with pytest.raises(ProviderUnavailable, match="provider_response_invalid"):
        asyncio.run(api.call("flights/verify", {"option_id": ref}))


def test_supplier_expiry_and_failures_do_not_become_success(research):
    api, supplier = research
    ref = asyncio.run(api.call("flights/search", FLIGHT))["results"][0]["id"]
    api.transport = httpx.MockTransport(lambda _: httpx.Response(404, json={"secret": "PRIVATE"}))
    with pytest.raises(ProviderUnavailable, match="offer_expired"):
        asyncio.run(api.call("flights/verify", {"option_id": ref}))
    api.transport = httpx.MockTransport(lambda _: httpx.Response(503, json={"secret": "PRIVATE"}))
    with pytest.raises(ProviderUnavailable, match="provider_unavailable"):
        asyncio.run(api.call("hotels/reviews", {"hotel_id": "lp1"}))


def test_verify_updates_fare_without_reserving_or_exposing_offer(research):
    api, supplier = research
    search = asyncio.run(api.call("flights/search", FLIGHT))
    ref = search["results"][0]["id"]
    assert ref.startswith("flight-") and len(ref) == 39
    api2 = LiteApi(api.key, scope=api.scope, transport=api.transport)
    result = asyncio.run(api2.call("flights/verify", {"option_id": ref}))
    assert result["flight"]["id"] == ref and result["flight"]["price"]["amount"] == "280"
    assert result["price_changed"] and result["previous_price"]["amount"] == "246.5"
    assert result["change_fee"] == {"amount": "40", "currency": "EUR"}
    assert result["changeable"] and result["fare_name"] == "Economy Flex"
    assert "SECRET" not in json.dumps(result) and result["flight"]["checkout_token"] is None
    assert [x[1] for x in supplier.calls] == ["/v3.0/flights/rates", "/v3.0/flights/verify"]


@pytest.mark.parametrize(
    "scope,key",
    [
        (None, "live_TEST"),
        (("other", "plan"), "live_TEST"),
        (("owner", "other"), "live_TEST"),
        (("owner", "plan"), "live_OTHER"),
    ],
)
def test_offer_cannot_cross_traveler_plan_or_provider_account(research, scope, key):
    api, supplier = research
    ref = asyncio.run(api.call("flights/search", FLIGHT))["results"][0]["id"]
    foreign = LiteApi(key, scope=scope, transport=api.transport)
    with pytest.raises(ProviderUnavailable, match="offer_expired"):
        asyncio.run(foreign.call("flights/verify", {"option_id": ref}))
    assert len(supplier.calls) == 1


def test_offer_expiry_eviction_restart_and_disabled_mode(research, monkeypatch):
    api, supplier = research
    monkeypatch.setattr(travel_research, "MAX_OFFERS", 1)
    first = asyncio.run(api.call("flights/search", FLIGHT))["results"][0]["id"]
    second = asyncio.run(api.call("flights/search", FLIGHT))["results"][0]["id"]
    assert len(travel_research._offers) == 1
    with pytest.raises(ProviderUnavailable, match="offer_expired"):
        asyncio.run(api.call("flights/verify", {"option_id": first}))
    travel_research._offers[second]["expires"] = 0
    with pytest.raises(ProviderUnavailable, match="offer_expired"):
        asyncio.run(api.call("flights/verify", {"option_id": second}))
    travel_research._offers.clear()
    with pytest.raises(ProviderUnavailable):
        asyncio.run(api.call("flights/verify", {"option_id": second}))
    api.flights_enabled = False
    with pytest.raises(ProviderUnavailable):
        asyncio.run(api.call("flights/verify", {"option_id": second}))
    assert len(supplier.calls) == 2


def test_private_mcp_dispatch_runs_normalization_and_auth(research, monkeypatch):
    api, supplier = research
    monkeypatch.setattr("services.mcps.travel_server.LiteApi", lambda *args, **kwargs: api)

    async def run():
        with authenticated_context(ToolAuthContext("owner", "plan", "assertion")):
            content = await travel_mcp.call_tool(
                "get_stay_reviews", {"hotel_id": "lp1", "plan_id": "plan"}
            )
            structured = json.loads(content[0].text)
            assert structured["reviews"][0]["headline"] == "Quiet"
            invalid = await travel_search(
                "hotels/reviews", {"hotel_id": "lp1", "limit": 100}, "plan"
            )
            assert invalid == {"status": "invalid"}

    asyncio.run(run())
    assert len(supplier.calls) == 1
