"""Exercise registered Claude tools through the private MCP connector."""

import asyncio
import json
from copy import deepcopy

import httpx
import pytest
from mcp.types import CallToolRequest, CallToolRequestParams

from services.agent.claude.canvas_travel_tools import CanvasTravelTools
from services.agent.tests.test_canvas_travel import components, context
from services.crud.canvas import CanvasSnapshot
from services.mcps.liteapi import LiteApi
from services.mcps.tests.test_liteapi import END, FLIGHT, HOTEL, START
from services.mcps.tests.test_travel_research import ResearchSupplier
from services.mcps.transport import ToolAuthContext, authenticated_context
from services.mcps.travel_server import travel_mcp


def build_tools(monkeypatch):
    supplier = ResearchSupplier()

    def factory(key, *, scope, flights_enabled):
        return LiteApi(
            "live_TEST",
            scope=scope,
            flights_enabled=flights_enabled,
            transport=httpx.MockTransport(supplier),
        )

    monkeypatch.setattr("services.mcps.travel_server.LiteApi", factory)

    class Connector:
        async def call(self, name, arguments, **scope):
            with authenticated_context(
                ToolAuthContext(scope["subject"], scope["plan_id"], "assertion")
            ):
                blocks = await travel_mcp.call_tool(
                    name, {**arguments, "plan_id": scope["plan_id"]}
                )
                return json.loads(blocks[0].text)

    draft = components()
    draft["essentials"]["dates"].update(start=START, end=END)
    ctx = context()
    tools = CanvasTravelTools(
        Connector(),
        ctx,
        "private-access",
        CanvasSnapshot(components=draft),
        "Compare these options",
    )
    return tools, supplier


async def sdk_call(server, name, arguments):
    result = await server.request_handlers[CallToolRequest](
        CallToolRequest(
            method="tools/call", params=CallToolRequestParams(name=name, arguments=arguments)
        )
    )
    wire = result.root.model_dump()
    assert not wire.get("isError"), wire
    return json.loads(wire["content"][0]["text"])


def test_registered_sdk_stay_tools_reach_real_private_connector(monkeypatch):
    tools, supplier = build_tools(monkeypatch)
    before = deepcopy(tools.draft.model_dump())

    async def run():
        server = tools.server()["instance"]
        search = await sdk_call(
            server, "search_stays", {"criteria": HOTEL, "dates": {"source": "canvas"}}
        )
        option = search["options"][0]
        assert option["hotel_id"] == "lp1" and option["rooms"][0]["board_name"] == "Breakfast"
        details = await sdk_call(server, "get_stay_details", {"hotel_id": option["hotel_id"]})
        reviews = await sdk_call(
            server, "get_stay_reviews", {"hotel_id": option["hotel_id"], "sentiment": True}
        )
        rates = await sdk_call(
            server,
            "get_stay_rates",
            {"criteria": {**HOTEL, "hotel_id": option["hotel_id"]}, "dates": {"source": "canvas"}},
        )
        assert details["hotel"]["facilities"] == ["Pool"]
        assert reviews["sentiment"]["ai_generated"] is True
        assert rates["results"][0]["rooms"][0]["total"]["amount"] == "123.45"
        assert rates["results"][0]["rooms"][0]["refundable"] is False
        assert "checkout_token" not in json.dumps([search, details, reviews, rates])
        assert all(
            word not in json.dumps([search, details, reviews, rates])
            for word in ("SECRET", "PRIVATE_REVIEWER", "private-access")
        )

    asyncio.run(run())
    assert tools.draft.model_dump() == before
    assert len(supplier.calls) == 4
    assert all("prebook" not in path and "booking" not in path for _, path, _ in supplier.calls)


def test_http_reviews_and_verify_authorization_projection_and_expiry(monkeypatch):
    from uuid import uuid4

    from fastapi.testclient import TestClient

    from services.agent.app import create_app
    from services.auth.contracts import ValidatedIdentity

    tools, supplier = build_tools(monkeypatch)
    pid = str(uuid4())
    plan = {"lifecycle": "active", "traveler_subject": "owner", "revision": 1}

    def verifier(token):
        if token != "valid":
            raise ValueError()
        return ValidatedIdentity(
            "owner", "client", frozenset({"aws.cognito.signin.user.admin"}), 1, 9999999999
        )

    app = create_app(
        verifier=verifier,
        plan_reader=lambda subject, plan_id, token: plan if str(plan_id) == pid else None,
        adapter=object(),
        travel_client=tools.client,
    )
    root = f"/v1/agent/plans/{pid}/travel/"
    headers = {"Authorization": "Bearer valid"}
    with TestClient(app) as client:
        assert client.get(root + "hotels/reviews", params={"hotel_id": "lp1"}).status_code == 401
        assert client.post(root + "flights/verify", json={}).status_code == 401
        plan["traveler_subject"] = "other"
        assert (
            client.get(
                root + "hotels/reviews", params={"hotel_id": "lp1"}, headers=headers
            ).status_code
            == 404
        )
        assert client.post(root + "flights/verify", json={}, headers=headers).status_code == 404
        plan["traveler_subject"] = "owner"
        assert (
            client.get(
                root + "hotels/reviews", params={"hotel_id": "lp1", "limit": 11}, headers=headers
            ).status_code
            == 422
        )
        assert client.get(root + "flights/verify", headers=headers).status_code == 404
        assert (
            client.post(
                root + "flights/verify", json={"offerId": "SECRET_OFFER"}, headers=headers
            ).status_code
            == 422
        )
        assert not supplier.calls
        reviews = client.get(
            root + "hotels/reviews",
            params={"hotel_id": "lp1", "sentiment": "true"},
            headers=headers,
        )
        assert reviews.status_code == 200 and reviews.json()["reviews"][0]["score"] == 8
        assert "PRIVATE_REVIEWER" not in reviews.text
        details = client.get(root + "hotels/detail", params={"hotel_id": "lp1"}, headers=headers)
        assert details.status_code == 200 and details.json()["hotel"]["name"] == "Test stay"
        search = client.post(root + "flights/search", json=FLIGHT, headers=headers)
        assert search.status_code == 200
        option_id = search.json()["results"][0]["id"]
        checked = client.post(
            root + "flights/verify", json={"option_id": option_id}, headers=headers
        )
        assert checked.status_code == 200 and checked.json()["price_changed"]
        assert "SECRET" not in checked.text
        expired = client.post(
            root + "flights/verify", json={"option_id": "flight-" + "0" * 32}, headers=headers
        )
        assert expired.status_code == 409 and expired.json()["code"] == "offer_expired"
        plan["lifecycle"] = "deleted"
        assert (
            client.post(
                root + "flights/verify", json={"option_id": option_id}, headers=headers
            ).status_code
            == 404
        )
    assert plan["revision"] == 1
    assert len(supplier.calls) == 4


def test_registered_flight_verification_keeps_preview_and_evidence_consistent(monkeypatch):
    tools, supplier = build_tools(monkeypatch)

    async def run():
        server = tools.server()["instance"]
        search = await sdk_call(
            server, "search_flights", {"criteria": FLIGHT, "dates": {"source": "canvas"}}
        )
        option = search["options"][0]
        result = await sdk_call(server, "verify_flight_offer", {"option_id": option["id"]})
        assert result["price_changed"] and result["flight"]["price"]["amount"] == "280"
        assert tools.snapshots[search["search_id"]].results[0].price.amount == "280"
        assert "checkout_token" not in json.dumps(result) and "SECRET" not in json.dumps(result)

    asyncio.run(run())
    assert len(supplier.calls) == 2


def test_inspection_budget_cache_validation_and_output_limits(monkeypatch):
    tools, supplier = build_tools(monkeypatch)

    async def run():
        for invalid in ({"hotel_id": "lp1", "subject": "other"}, {"hotel_id": "../x"}):
            result = await tools.invoke("get_stay_details", invalid)
            assert result["is_error"]
        result = await tools.invoke(
            "get_stay_rates", {"criteria": HOTEL, "dates": {"source": "canvas"}}
        )
        assert result["is_error"] and not supplier.calls
        for index in range(6):
            result = await tools.invoke("get_stay_reviews", {"hotel_id": "lp1", "offset": index})
            assert not result.get("is_error"), result
        cached = await tools.invoke("get_stay_reviews", {"hotel_id": "lp1", "offset": 0})
        assert not cached.get("is_error") and len(supplier.calls) == 6
        blocked = await tools.invoke("get_stay_reviews", {"hotel_id": "lp1", "offset": 6})
        assert blocked["is_error"] and len(supplier.calls) == 6
        tools.tool_bytes = 24576
        assert (await tools.invoke("get_stay_reviews", {"hotel_id": "lp1", "offset": 0}))[
            "is_error"
        ]
        assert (await tools.invoke("sandbox/book", {}))["is_error"]

    asyncio.run(run())


def test_expired_offer_and_cancellation_are_explicit(monkeypatch):
    tools, _ = build_tools(monkeypatch)

    async def run():
        result = await tools.invoke("verify_flight_offer", {"option_id": "flight-" + "0" * 32})
        assert result["is_error"] and "offer_expired" in result["content"][0]["text"]
        await tools.invoke("search_stays", {"criteria": HOTEL, "dates": {"source": "canvas"}})
        assert tools.snapshots

        async def cancelled(*args, **kwargs):
            raise asyncio.CancelledError()

        tools.client.call = cancelled
        with pytest.raises(asyncio.CancelledError):
            await tools.invoke("get_stay_details", {"hotel_id": "lp1"})
        assert not tools.snapshots

    asyncio.run(run())
