"""Bounded travel contracts shared by the public and private boundaries."""

from datetime import date, timedelta
import re
from typing import Annotated, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator, field_validator
from services.shared.traveler_profile import reference_catalog

Country = Annotated[str, Field(pattern=r"^[A-Z]{2}$")]
Currency = Literal["EUR", "USD", "GBP", "HUF", "CAD", "AUD", "JPY", "CHF"]
HotelId = Annotated[str, Field(pattern=r"^[A-Za-z0-9_-]{1,100}$")]
PlaceId = Annotated[str, Field(pattern=r"^[A-Za-z0-9_-]{1,255}$")]
Iata = Annotated[str, Field(pattern=r"^[A-Z]{3}$")]


class Strict(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class Destination(Strict):
    city: str = Field(min_length=2, max_length=120)
    country_code: Country
    place_id: PlaceId | None = None

    @field_validator("country_code")
    @classmethod
    def country(cls, value):
        if value not in {x["code"] for x in reference_catalog("countries")}:
            raise ValueError("Choose a country.")
        return value


class Room(Strict):
    adults: Annotated[int, Field(strict=True, ge=1, le=6)]
    children_ages: list[Annotated[int, Field(strict=True, ge=0, le=17)]] = Field(
        default_factory=list, max_length=4
    )


def exact_date(value):
    if (
        not isinstance(value, (str, date))
        or isinstance(value, str)
        and not re.fullmatch(r"\d{4}-\d{2}-\d{2}", value)
    ):
        raise ValueError("Use an exact ISO date.")
    return value


class HotelSearch(Strict):
    destination: Destination
    check_in: date
    check_out: date
    rooms: list[Room] = Field(min_length=1, max_length=4)
    guest_nationality: Country
    currency: Currency = "EUR"
    hotel_id: HotelId | None = None
    _exact_dates = field_validator("check_in", "check_out", mode="before")(exact_date)
    _nationality = field_validator("guest_nationality")(Destination.country.__func__)

    @model_validator(mode="after")
    def dates(self):
        validate_dates(self.check_in, self.check_out, 30)
        if sum(r.adults + len(r.children_ages) for r in self.rooms) > 16:
            raise ValueError("At most sixteen guests per search.")
        return self


class FlightSearch(Strict):
    origin: Iata
    destination: Iata
    departure_date: date
    return_date: date
    adults: Annotated[int, Field(strict=True, ge=1, le=9)]
    children_ages: list[Annotated[int, Field(strict=True, ge=2, le=11)]] = Field(
        default_factory=list, max_length=8
    )
    infant_ages: list[Annotated[int, Field(strict=True, ge=0, le=1)]] = Field(
        default_factory=list, max_length=8
    )
    cabin_class: Literal["ECONOMY", "PREMIUM_ECONOMY", "BUSINESS", "FIRST"] = "ECONOMY"
    currency: Currency = "EUR"
    country_code: Country
    _exact_dates = field_validator("departure_date", "return_date", mode="before")(exact_date)
    _country = field_validator("country_code")(Destination.country.__func__)

    @model_validator(mode="after")
    def trip(self):
        validate_dates(self.departure_date, self.return_date, 365)
        if (
            self.origin == self.destination
            or len(self.infant_ages) > self.adults
            or self.adults + len(self.children_ages) + len(self.infant_ages) > 9
        ):
            raise ValueError("Check airports and passenger counts.")
        return self


def validate_dates(start, end, maximum):
    if not date.today() <= start < end <= start + timedelta(
        days=maximum
    ) or end > date.today() + timedelta(days=730):
        raise ValueError("Choose future, ordered travel dates within the search limit.")


class AirportQuery(Strict):
    q: str = Field(min_length=2, max_length=80)


class PlaceQuery(Strict):
    q: str = Field(min_length=2, max_length=120)
    country_code: Country
    _country = field_validator("country_code")(Destination.country.__func__)


class HotelQuery(Strict):
    hotel_id: HotelId


class SandboxHandle(Strict):
    token: str = Field(min_length=50, max_length=40000, pattern=r"^[A-Za-z0-9_=-]+$")


class TestGuest(Strict):
    first_name: str = Field(min_length=1, max_length=50, pattern=r"^[^<>\x00-\x1f]+$")
    last_name: str = Field(min_length=1, max_length=50, pattern=r"^[^<>\x00-\x1f]+$")


class SandboxBook(SandboxHandle):
    confirm_mock: Literal[True]
    guests: list[TestGuest] = Field(min_length=1, max_length=4)


class SandboxFlightConfirm(SandboxHandle):
    confirm_mock: Literal[True]


class TravelInvocation(Strict):
    plan_id: UUID
    action: Literal[
        "capabilities", "airports", "places", "hotels/search", "hotels/detail", "flights/search",
        "sandbox/prebook", "sandbox/book", "sandbox/status",
        "sandbox/flights/verify", "sandbox/flights/prebook", "sandbox/flights/book", "sandbox/flights/status"
    ]
    criteria: dict = Field(default_factory=dict)


POST_ACTIONS = {"sandbox/flights/verify", "sandbox/flights/prebook", "sandbox/flights/book", "sandbox/flights/status", "hotels/search", "flights/search", "sandbox/prebook", "sandbox/book", "sandbox/status"}

INPUTS = {
    "sandbox/flights/verify": SandboxHandle,
    "sandbox/flights/prebook": SandboxFlightConfirm,
    "sandbox/flights/book": SandboxFlightConfirm,
    "sandbox/flights/status": SandboxHandle,
    "sandbox/prebook": SandboxHandle,
    "sandbox/book": SandboxBook,
    "sandbox/status": SandboxHandle,
    "capabilities": Strict,
    "airports": AirportQuery,
    "places": PlaceQuery,
    "hotels/search": HotelSearch,
    "hotels/detail": HotelQuery,
    "flights/search": FlightSearch,
}


# The response is allowlisted again at every public hop. Extra provider fields
# cannot accidentally become a browser projection when a connector changes.
class Public(BaseModel):
    model_config = ConfigDict(extra="ignore")


class Money(Public):
    amount: str | None = None
    currency: str | None = None


class Tax(Money):
    name: str


class Price(Money):
    basis: Literal["stay", "party_return"]
    estimated: bool = False
    excluded_taxes: list[Tax] = Field(default_factory=list, max_length=50)


class RoomOffer(Public):
    checkout_token: str | None = None
    id: str
    name: str
    board_name: str | None = None
    refundable: bool | None = None
    cancellation_summary: str | None = None
    cancellation_deadline: str | None = None
    total: Money
    excluded_taxes: list[Tax] = Field(default_factory=list, max_length=50)
    occupancy_summary: str | None = None


class Hotel(Public):
    id: str
    hotel_id: str
    name: str
    address: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    stars: float | None = None
    review_score: float | None = None
    review_count: int | None = None
    image_url: str | None = None
    price: Price
    rooms: list[RoomOffer] = Field(default_factory=list, max_length=30)
    facilities: list[str] = Field(default_factory=list, max_length=40)


class Segment(Public):
    origin: str
    destination: str
    departure_at: str
    arrival_at: str
    airline: str | None = None
    operating_airline: str | None = None
    flight_number: str | None = None
    duration_minutes: int | None = None
    technical_stops: list[str] = Field(default_factory=list, max_length=10)


class Leg(Public):
    duration_minutes: int | None = None
    stops: int | None = None
    segments: list[Segment] = Field(max_length=12)


class Flight(Public):
    checkout_token: str | None = None
    id: str
    price: Price
    airlines: list[str] = Field(max_length=12)
    outbound: Leg
    inbound: Leg
    baggage_summary: str | None = None
    cabin_bag_included: bool | None = None
    refundable: bool | None = None
    cancellation_summary: str | None = None


class Envelope(Public):
    status: Literal["ready", "empty"]
    provider: Literal["LiteAPI"] = "LiteAPI"
    sandbox: bool


class SearchResult(Envelope):
    searched_at: str
    results: list[Hotel] | list[Flight] = Field(max_length=100)
    returned_count: int
    truncated: bool
    notices: list[str] = Field(default_factory=list, max_length=10)


class Capabilities(Public):
    provider: Literal["LiteAPI"] = "LiteAPI"
    sandbox: bool
    hotels: bool
    flights: bool


class Airport(Public):
    iata: str
    name: str
    city: str | None = None
    country_code: str | None = None


class Airports(Envelope):
    airports: list[Airport] = Field(max_length=12)


class Place(Public):
    place_id: PlaceId
    name: str
    address: str | None = None


class Places(Envelope):
    places: list[Place] = Field(max_length=8)


class Image(Public):
    url: str
    caption: str | None = None


class HotelContent(Public):
    hotel_id: str
    name: str
    description: str | None = None
    address: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    stars: float | None = None
    review_score: float | None = None
    review_count: int | None = None
    images: list[Image] = Field(default_factory=list, max_length=16)
    facilities: list[str] = Field(default_factory=list, max_length=40)


class HotelDetail(Envelope):
    hotel: HotelContent


class SandboxResult(Public):
    sandbox: Literal[True] = True
    provider: Literal["LiteAPI"] = "LiteAPI"
    status: Literal["review", "confirmed", "pending", "cancelled", "failed", "not_found"]
    token: str
    hotel_name: str
    check_in: str
    check_out: str
    room_count: int
    total: Money
    room: RoomOffer
    terms: str | None = None
    booking_id: str | None = None
    confirmation_code: str | None = None


class SandboxFlightResult(Public):
    sandbox: Literal[True] = True
    mode: Literal["flights"] = "flights"
    provider: Literal["LiteAPI"] = "LiteAPI"
    status: Literal["review", "ready_to_book", "confirmed", "pending", "cancelled", "failed", "unknown"]
    token: str
    flight: Flight
    passenger_count: int
    booking_id: str | None = None
    confirmation_code: str | None = None


OUTPUTS = {
    **{f"sandbox/flights/{action}": SandboxFlightResult for action in ("verify", "prebook", "book", "status")},
    "sandbox/prebook": SandboxResult,
    "sandbox/book": SandboxResult,
    "sandbox/status": SandboxResult,
    "capabilities": Capabilities,
    "airports": Airports,
    "places": Places,
    "hotels/search": SearchResult,
    "hotels/detail": HotelDetail,
    "flights/search": SearchResult,
}
