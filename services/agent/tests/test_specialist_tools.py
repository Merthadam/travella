"""Host scope, refinement and evidence budgets; no live model calls."""
import asyncio
import json
from copy import deepcopy

import pytest
from mcp.types import ListToolsRequest

from services.agent.claude.canvas_travel import TravelSelection
from services.agent.claude.canvas_travel_tools import CanvasTravelTools, SpecialistTravelTools
from services.agent.tests.test_canvas_travel import Provider, components, context, hotels
from services.agent.tests.test_travel_research_tools import build_tools, sdk_call
from services.crud.canvas import CanvasSnapshot
from services.mcps.tests.test_liteapi import HOTEL, FLIGHT, START, END


def specialist(topic="stays", provider=None):
    draft = components()
    draft["essentials"]["dates"].update(start=START, end=END)
    return SpecialistTravelTools(provider or Provider(), context(), "secret", CanvasSnapshot(components=draft), "Find options", topic=topic)


def args(currency="EUR"):
    return {"criteria": {**HOTEL, "currency": currency}, "dates": {"source": "canvas"}}


def value(result):
    assert not result.get("is_error"), result
    return json.loads(result["content"][0]["text"])


def test_sdk_catalog_and_invocation_both_enforce_topic():
    async def run():
        for topic, forbidden in (("stays", "search_flights"), ("flights", "search_stays")):
            observer = specialist(topic)
            server = observer.server()["instance"]
            listed = await server.request_handlers[ListToolsRequest](ListToolsRequest(method="tools/list"))
            names = {item.name for item in listed.root.tools}
            assert names == observer.names and forbidden not in names
            assert (await observer.invoke(forbidden, {}))["is_error"]
            assert (await observer.invoke("sandbox/book", {}))["is_error"]
            assert not observer.client.calls
    asyncio.run(run())


def test_refinement_preserves_observed_references_cached_calls_and_three_search_limit():
    async def run():
        observer = specialist()
        first = value(await observer.invoke("search_stays", args()))
        assert value(await observer.invoke("search_stays", args()))["search_id"] == first["search_id"]
        second = value(await observer.invoke("search_stays", args("USD")))
        third = value(await observer.invoke("search_stays", args("GBP")))
        assert len(observer.snapshots) == 3 and observer.rate_calls == 3
        assert observer.calls == 4  # cached capabilities plus three rates
        chosen = observer.selected([TravelSelection(search_id=second["search_id"], mode="stays", option_ids=["stay-2", "stay-0"])])
        assert chosen[0]["preview_ids"] == ["stay-2", "stay-0"]
        assert (await observer.invoke("search_stays", args("HUF")))["is_error"]
        assert observer.calls == 4 and third["search_id"] in observer.snapshots
        with pytest.raises(ValueError):
            observer.selected([TravelSelection(search_id=first["search_id"], mode="stays", option_ids=["invented"])])
    asyncio.run(run())


def test_general_trip_still_allows_only_one_criteria_per_mode():
    async def run():
        observer = specialist()
        ordinary = CanvasTravelTools(observer.client, observer.context, "secret", observer.draft, "search")
        value(await ordinary.invoke("search_stays", args()))
        result = await ordinary.invoke("search_stays", args("USD"))
        assert result["is_error"] and "search_already_attempted" in str(result)
        assert len(ordinary.client.calls) == 2
    asyncio.run(run())


def test_inspections_require_observed_ids_and_share_rate_budget(monkeypatch):
    ordinary, supplier = build_tools(monkeypatch)
    observer = SpecialistTravelTools(ordinary.client, ordinary.context, "secret", ordinary.draft, "compare", topic="stays")
    async def run():
        assert (await observer.invoke("get_stay_details", {"hotel_id": "lp1"}))["is_error"]
        assert not supplier.calls
        value(await observer.invoke("search_stays", args()))
        for currency in ("USD", "GBP"):
            request = args(currency)
            request["criteria"]["hotel_id"] = "lp1"
            value(await observer.invoke("get_stay_rates", request))
        request = args()
        request["criteria"]["hotel_id"] = "lp1"
        assert (await observer.invoke("get_stay_rates", request))["is_error"]
        assert observer.rate_calls == 3
    asyncio.run(run())


def test_six_inspection_limit_and_cache(monkeypatch):
    ordinary, supplier = build_tools(monkeypatch)
    observer = SpecialistTravelTools(ordinary.client, ordinary.context, "secret", ordinary.draft, "compare", topic="stays")
    async def run():
        value(await observer.invoke("search_stays", args()))
        for offset in range(6):
            value(await observer.invoke("get_stay_reviews", {"hotel_id": "lp1", "offset": offset}))
        value(await observer.invoke("get_stay_reviews", {"hotel_id": "lp1", "offset": 0}))
        assert (await observer.invoke("get_stay_reviews", {"hotel_id": "lp1", "offset": 6}))["is_error"]
        assert observer.counts["inspection"] == 6 and len(supplier.calls) == 7
    asyncio.run(run())


def test_unknown_filters_and_invalid_dates_do_not_search():
    async def run():
        observer = specialist()
        request = args()
        request["criteria"]["facility_ids"] = [9999]
        assert (await observer.invoke("search_stays", request))["is_error"]
        request = args()
        request["criteria"]["check_in"] = "2000-01-01"
        assert (await observer.invoke("search_stays", request))["is_error"]
        assert not observer.client.calls
    asyncio.run(run())


def test_verification_replaces_fare_and_rejects_foreign_reference(monkeypatch):
    ordinary, supplier = build_tools(monkeypatch)
    observer = SpecialistTravelTools(ordinary.client, ordinary.context, "secret", ordinary.draft, "compare", topic="flights")
    async def run():
        found = value(await observer.invoke("search_flights", {"criteria": FLIGHT, "dates": {"source": "canvas"}}))
        identifier = found["options"][0]["id"]
        checked = value(await observer.invoke("verify_flight_offer", {"option_id": identifier}))
        assert checked["price_changed"]
        assert observer.snapshots[found["search_id"]].results[0].price.amount == "280"
        assert observer.observation_times[identifier] == checked["checked_at"]
        assert (await observer.invoke("verify_flight_offer", {"option_id": "flight-" + "0" * 32}))["is_error"]
    asyncio.run(run())


def test_total_budget_is_shared_across_search_and_inspection(monkeypatch):
    ordinary, supplier = build_tools(monkeypatch)
    observer = SpecialistTravelTools(ordinary.client, ordinary.context, "secret", ordinary.draft, "compare", topic="stays")
    async def run():
        for currency in ("EUR", "USD", "GBP"):
            value(await observer.invoke("search_stays", args(currency)))
        for offset in range(6):
            value(await observer.invoke("get_stay_reviews", {"hotel_id": "lp1", "offset": offset}))
        assert observer.calls == 10
        count = len(supplier.calls)
        assert (await observer.invoke("search_destinations", {"q": "Lisbon", "country_code": "PT"}))["is_error"]
        assert len(supplier.calls) == count
    asyncio.run(run())


def test_failed_inspection_cannot_repeat_and_expired_flight_cannot_be_compared(monkeypatch):
    ordinary, supplier = build_tools(monkeypatch)
    observer = SpecialistTravelTools(ordinary.client, ordinary.context, "secret", ordinary.draft, "compare", topic="flights")
    async def run():
        found = value(await observer.invoke("search_flights", {"criteria": FLIGHT, "dates": {"source": "canvas"}}))
        identifier = found["options"][0]["id"]
        attempts = []
        async def expired(*args, **kwargs):
            attempts.append(1)
            return {"status": "unavailable", "code": "offer_expired"}
        observer.client.call = expired
        assert (await observer.invoke("verify_flight_offer", {"option_id": identifier}))["is_error"]
        assert (await observer.invoke("verify_flight_offer", {"option_id": identifier}))["is_error"]
        assert len(attempts) == 1
        with pytest.raises(ValueError):
            observer.selected([TravelSelection(search_id=found["search_id"], mode="flights", option_ids=[identifier])])
    asyncio.run(run())


def test_rate_inspection_retains_observed_room_ids_prices_and_terms():
    class RoomProvider(Provider):
        async def call(self, name, arguments, **scope):
            if arguments["action"] != "hotels/search":
                return await super().call(name, arguments, **scope)
            result = hotels(1)
            if arguments["criteria"].get("hotel_id"):
                room = result["results"][0]["rooms"][0]
                room.update(id="inspected-room", name="Kitchenette apartment", total={"amount": "734.60", "currency": "EUR"}, refundable=True)
            return result
    async def run():
        observer = specialist(provider=RoomProvider())
        found = value(await observer.invoke("search_stays", args()))
        request = args()
        request["criteria"]["hotel_id"] = "property-0"
        inspected = value(await observer.invoke("get_stay_rates", request))
        observed_room = inspected["results"][0]["rooms"][0]
        retained = observer.snapshots[found["search_id"]].results[0].rooms[0]
        assert retained.id == observed_room["id"] == "inspected-room"
        assert retained.total.amount == "734.60" and retained.refundable is True
    asyncio.run(run())


def test_specialist_evidence_budget_supports_rich_refinements_and_inspection():
    """Reproduce a second real-sized search exhausting the old24KiB ceiling."""
    class RichProvider(Provider):
        async def call(self, name, arguments, **scope):
            if arguments["action"] != "hotels/search":
                return await super().call(name, arguments, **scope)
            result = hotels(1 if arguments["criteria"].get("hotel_id") else 10)
            for hotel in result["results"]:
                original = hotel["rooms"][0]
                hotel["rooms"] = [{**deepcopy(original), "id": f"{hotel['hotel_id']}-room-{index}",
                    "name": "Apartment with kitchenette and separate lounge " * 3,
                    "cancellation_summary": "Cancellation conditions apply before arrival. " * 3,
                    "occupancy_summary": "Two adults in one apartment", "board_name": "Room only"} for index in range(8)]
                hotel["facilities"] = [f"Observed facility {index}" for index in range(20)]
            return result
    async def run():
        observer = specialist(provider=RichProvider())
        for currency in ("EUR", "USD"):
            found = value(await observer.invoke("search_stays", args(currency)))
            assert len(found["options"]) == 10
            assert len(found["options"][0]["rooms"]) == 3 and found["options"][0]["rooms_omitted"] == 5
            assert len(found["options"][0]["facilities"]) == 12 and found["options"][0]["facilities_omitted"] == 8
        assert observer.tool_bytes > 24576
        # A further lookup crosses the inherited base boundary too, then room
        # inspection still succeeds as the third rate request.
        value(await observer.invoke("travel_capabilities", {}))
        request = args()
        request["criteria"]["hotel_id"] = "property-0"
        inspected = value(await observer.invoke("get_stay_rates", request))
        assert len(inspected["results"][0]["rooms"]) == 6
        assert observer.tool_bytes < observer.evidence_limit == 96 * 1024
        assert observer.rate_calls == 3
        three_searches = specialist(provider=RichProvider())
        for currency in ("EUR", "USD", "GBP"):
            value(await three_searches.invoke("search_stays", args(currency)))
        assert len(three_searches.snapshots) == 3 and three_searches.tool_bytes < three_searches.evidence_limit
        observer.tool_bytes = observer.evidence_limit
        exhausted = await observer.invoke("travel_capabilities", {})
        assert exhausted["is_error"] and observer.tool_bytes == observer.evidence_limit
        ordinary = CanvasTravelTools(observer.client, observer.context, "secret", observer.draft, "search")
        assert ordinary.evidence_limit == 24576
        ordinary.tool_bytes = 24576
        assert ordinary._evidence({"evidence": "bounded"})["is_error"]
    asyncio.run(run())


def workspace_specialist(topic="stays", *, dirty=False, provider=None):
    from services.agent.request_context import bind_workspace_context, reset_workspace_context
    from services.travel_topics import WorkspaceView
    token = bind_workspace_context({"instance_id": "test-instance", "revision": 0, "search_id": None,
                                   "view": WorkspaceView().model_dump(), "draft_dirty": dirty})
    try:
        return specialist(topic, provider=provider)
    finally:
        reset_workspace_context(token)


def test_registered_workspace_operations_are_local_bounded_and_reference_checked():
    async def run():
        observer = workspace_specialist()
        server = observer.server()["instance"]
        listed = await server.request_handlers[ListToolsRequest](ListToolsRequest(method="tools/list"))
        assert "update_workspace_view" in {item.name for item in listed.root.tools}
        found = await sdk_call(server, "search_stays", args())
        sid = found["search_id"]
        calls = observer.calls
        request = {"search_id": sid, "operation": "sort", "sort": "price"}
        for _ in range(12):
            changed = await sdk_call(server, "update_workspace_view", request)
            assert changed["visible_count"] == 4
        assert (await observer.invoke("update_workspace_view", request))["is_error"]
        assert observer.calls == calls
        other = workspace_specialist()
        assert (await other.invoke("update_workspace_view", request))["is_error"]
    asyncio.run(run())


def test_dirty_workspace_denies_search_and_local_changes_before_provider_calls():
    async def run():
        observer = workspace_specialist(dirty=True)
        result = await observer.invoke("search_stays", args())
        assert result.get("is_error") and "pending" in str(result)
        assert not observer.client.calls
    asyncio.run(run())
