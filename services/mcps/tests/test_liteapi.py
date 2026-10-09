import asyncio
from datetime import date, timedelta
import json
import httpx
import pytest
from pydantic import ValidationError
from services.agent.travel_contracts import HotelSearch, FlightSearch
from services.mcps.liteapi import (
    LiteApi,
    ProviderUnavailable,
    normalize_hotels,
    normalize_flights,
    photo,
)

START = (date.today() + timedelta(days=30)).isoformat()
END = (date.today() + timedelta(days=33)).isoformat()
HOTEL = {
    "destination": {"city": "Rome", "country_code": "IT"},
    "check_in": START,
    "check_out": END,
    "rooms": [{"adults": 2, "children_ages": []}],
    "guest_nationality": "HU",
    "currency": "EUR",
}
FLIGHT = {
    "origin": "BUD",
    "destination": "FCO",
    "departure_date": START,
    "return_date": END,
    "adults": 2,
    "country_code": "HU",
    "currency": "EUR",
}


def hotel_payload():
    return {
        "hotels": [
            {
                "id": "lp1",
                "name": "Test stay",
                "stars": 4,
                "rating": 9.1,
                "main_photo": "https://images.example.com/stay.jpg",
            }
        ],
        "data": [
            {
                "hotelId": "lp1",
                "roomTypes": [
                    {
                        "offerId": "SECRET_OFFER",
                        "offerRetailRate": {"amount": 123.45, "currency": "EUR"},
                        "rates": [
                            {
                                "rateId": "SECRET_RATE",
                                "name": "Double",
                                "adultCount": 2,
                                "childCount": 0,
                                "boardName": "Breakfast",
                                "retailRate": {
                                    "taxesAndFees": [
                                        {
                                            "included": False,
                                            "description": "City tax",
                                            "amount": 8.2,
                                            "currency": "EUR",
                                        }
                                    ]
                                },
                                "cancellationPolicies": {"refundableTag": "NRFN"},
                            }
                        ],
                    }
                ],
            }
        ],
    }


def flight_payload():
    segments = [
        {
            "direction": direction,
            "originCode": origin,
            "destinationCode": dest,
            "departureTime": day + "T10:00:00",
            "arrivalTime": day + "T12:00:00",
            "stopCount": 1 if direction == "OUTBOUND" else 0,
            "technicalStops": [{"airportCode": "VIE"}] if direction == "OUTBOUND" else [],
            "carrier": {
                "marketingCode": "SA",
                "marketingName": "Test Air",
                "operatingName": "Operating Air",
            },
            "flight": {"marketingNumber": "123"},
            "duration": {"minutes": 120},
        }
        for direction, origin, dest, day in [
            ("OUTBOUND", "BUD", "FCO", START),
            ("INBOUND", "FCO", "BUD", END),
        ]
    ]
    return {
        "data": [
            {
                "journeys": [
                    {
                        "journeyKey": "SECRET_KEY",
                        "segments": segments,
                        "cheapestOffer": {
                            "offerId": "SECRET_OFFER",
                            "pricing": {"display": {"total": 246.5, "currency": "EUR"}},
                            "baggage": {"hasCarryOnBag": True},
                            "terms": {"refundable": False},
                        },
                        "legDurations": [
                            {"direction": "OUTBOUND", "duration": {"minutes": 120}},
                            {"direction": "INBOUND", "duration": {"minutes": 120}},
                        ],
                    }
                ]
            }
        ]
    }


def test_hotel_totals_excluded_taxes_unknowns_and_secret_projection():
    result = normalize_hotels(hotel_payload())[0]
    assert result["price"]["amount"] == "123.45" and result["price"]["basis"] == "stay"
    assert result["price"]["excluded_taxes"][0]["amount"] == "8.2"
    assert result["rooms"][0]["refundable"] is False
    assert result["rooms"][0]["cancellation_deadline"] is None
    assert "SECRET" not in json.dumps(result)


def test_flights_preserve_local_times_party_total_and_technical_stop():
    results, truncated = normalize_flights(flight_payload(), FLIGHT)
    f = results[0]
    assert not truncated and f["price"]["amount"] == "246.5"
    assert f["outbound"]["stops"] == 1 and f["inbound"]["stops"] == 0
    assert f["outbound"]["segments"][0]["departure_at"] == START + "T10:00:00"
    assert f["outbound"]["segments"][0]["operating_airline"] == "Operating Air"
    assert "SECRET" not in json.dumps(results)
    p = flight_payload()
    p["data"][0]["journeys"][0]["segments"] = p["data"][0]["journeys"][0]["segments"][:1]
    assert normalize_flights(p, FLIGHT)[0] == []


@pytest.mark.parametrize(
    "model,body,change",
    [
        (HotelSearch, HOTEL, {"check_out": START}),
        (HotelSearch, HOTEL, {"guest_nationality": "XX"}),
        (HotelSearch, HOTEL, {"rooms": [{"adults": True}]}),
        (FlightSearch, FLIGHT, {"destination": "BUD"}),
        (FlightSearch, FLIGHT, {"infant_ages": [0, 0, 0]}),
        (FlightSearch, FLIGHT, {"children_ages": [12]}),
        (FlightSearch, FLIGHT, {"offerId": "secret"}),
    ],
)
def test_invalid_inputs(model, body, change):
    with pytest.raises(ValidationError):
        model.model_validate(body | change)


def test_read_only_request_translation_and_sanitized_result():
    seen = []

    def respond(req):
        seen.append(req)
        if req.url.path.endswith("airports/"):
            assert req.url.params["q"] == "BUD"
            return httpx.Response(
                200,
                json={
                    "data": [{"airports": [{"iata": "BUD", "name": "Budapest", "country": "HU"}]}]
                },
            )
        body = json.loads(req.content)
        if "flights" in req.url.path:
            assert len(body["legs"]) == 2 and body["legs"][1]["origin"] == "FCO"
            assert "departureDate" not in body and body["children"] == 0
            return httpx.Response(200, json=flight_payload())
        assert body["occupancies"] == [{"adults": 2, "children": []}]
        assert body["cityName"] == "Rome" and body["maxRatesPerHotel"] == 4
        return httpx.Response(200, json=hotel_payload())

    api = LiteApi("sand_SECRET", transport=httpx.MockTransport(respond))
    for action, criteria in [
        ("airports", {"q": "BUD"}),
        ("hotels/search", HOTEL),
        ("flights/search", FLIGHT),
    ]:
        result = asyncio.run(api.call(action, criteria))
        assert result["sandbox"] and "SECRET" not in json.dumps(result)
    assert len(seen) == 3


@pytest.mark.parametrize(
    "response",
    [
        httpx.Response(403, json={"error": "SECRET"}),
        httpx.Response(301, headers={"Location": "https://evil.example/"}),
        httpx.Response(200, text="SECRET"),
    ],
)
def test_failures_are_safe_and_redirects_not_followed(response):
    api = LiteApi("sand_SECRET", transport=httpx.MockTransport(lambda req: response))
    with pytest.raises(ProviderUnavailable) as e:
        asyncio.run(api.call("hotels/search", HOTEL))
    assert "SECRET" not in str(e.value)


def test_empty_not_failure_and_missing_key_capabilities():
    api = LiteApi("sand_KEY", transport=httpx.MockTransport(lambda req: httpx.Response(204)))
    assert asyncio.run(api.call("hotels/search", HOTEL))["status"] == "empty"
    assert asyncio.run(LiteApi(None).call("capabilities", {}))["hotels"] is False


@pytest.mark.parametrize(
    "url",
    [
        "http://example.com/a",
        "https://localhost/a",
        "https://127.0.0.1/a",
        "https://user:secret@example.com/a",
        "https://example.com/a?token=secret",
    ],
)
def test_unsafe_images_rejected(url):
    assert photo(url) is None


def test_nonempty_malformed_results_are_errors_not_empty_availability():
    for action, criteria, payload in [
        ("hotels/search", HOTEL, {"data": [{"wrong": "shape"}]}),
        ("flights/search", FLIGHT, {"data": [{"wrong": "shape"}]}),
    ]:
        api = LiteApi(
            "sand_test",
            transport=httpx.MockTransport(lambda request: httpx.Response(200, json=payload)),
        )
        with pytest.raises(ProviderUnavailable):
            asyncio.run(api.call(action, criteria))
