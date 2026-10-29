"""Bounded travel contracts shared by the public and private boundaries."""

import re
from datetime import date, timedelta
from typing import Annotated, Literal
from uuid import UUID
from urllib.parse import urlsplit

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from services.shared.traveler_profile import reference_catalog

Country = Annotated[str, Field(pattern=r"^[A-Z]{2}$")]
Currency = Literal["EUR", "USD", "GBP", "HUF", "CAD", "AUD", "JPY", "CHF"]
HotelId = Annotated[str, Field(pattern=r"^[A-Za-z0-9_-]{1,100}$")]
PlaceId = Annotated[str, Field(pattern=r"^[A-Za-z0-9_-]{1,255}$")]
Iata = Annotated[str, Field(pattern=r"^[A-Z]{3}$")]


def carrier_logo(value):
    """Only the supplier image origin observed in the bounded flight sample."""
    if not isinstance(value, str) or len(value) > 2000 or re.search(r"[\s\\\x00-\x1f\x7f]", value):
        return None
    try:
        url = urlsplit(value)
        if (url.scheme == 'https' and url.hostname == 'assets.nuitee.flights'
                and not url.username and not url.password and not url.query
                and not url.fragment and url.port in (None, 443)):
            return value
    except ValueError:
        pass
    return None


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
    hotel_type_ids: list[Annotated[int, Field(strict=True, ge=1)]] = Field(default_factory=list, max_length=10)
    facility_ids: list[Annotated[int, Field(strict=True, ge=1)]] = Field(default_factory=list, max_length=10)
    strict_facility_filtering: bool = True
    refundable_rates_only: bool = False
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


class HotelReviewsQuery(HotelQuery):
    limit: int = Field(default=5, ge=1, le=10)
    offset: int = Field(default=0, ge=0, le=1000)
    sentiment: bool = False


class FlightVerifyQuery(Strict):
    option_id: str = Field(pattern=r"^flight-[a-f0-9]{32}$")


class StayCatalogQuery(Strict):
    kind: Literal["hotel_types", "facilities"]
    q: str = Field(default="", max_length=80)


class StayCatalogItem(Strict):
    id: int = Field(strict=True, ge=1)
    name: str = Field(min_length=1, max_length=120)


class StayCatalog(Strict):
    provider: Literal["LiteAPI"] = "LiteAPI"
    sandbox: bool
    kind: Literal["hotel_types", "facilities"]
    items: list[StayCatalogItem] = Field(max_length=1000)
    truncated: bool = False


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


class ResearchSnapshotQuery(Strict):
    search_id: str = Field(min_length=1, max_length=100)


class FlightServiceSelection(Strict):
    id: str = Field(min_length=1, max_length=64)
    passenger_index: int = Field(ge=0, le=8)
    quantity: int = Field(default=1, ge=1, le=3)


class SandboxFlightServices(SandboxFlightConfirm):
    selected_services: list[FlightServiceSelection] = Field(max_length=64)


class TestFlightPassenger(TestGuest):
    date_of_birth: date
    gender: Literal["M", "F"]
    nationality: Country
    document_issue_country: Country
    document_number: str = Field(pattern=r"^TEST[A-Z0-9]{4,16}$")
    document_expiry: date
    _dates = field_validator("date_of_birth", "document_expiry", mode="before")(exact_date)
    _countries = field_validator("nationality", "document_issue_country")(Destination.country.__func__)


class TestFlightContact(TestGuest):
    # Sandbox contacts cannot address real travelers. Never checkpoint these fields.
    email: str = Field(max_length=120, pattern=r"^[A-Za-z0-9._%+-]+@example\.(com|test)$")
    phone_country_code: str = Field(pattern=r"^[1-9][0-9]{0,2}$")
    phone_number: str = Field(pattern=r"^[0-9]{6,14}$")


class SandboxFlightPrebook(SandboxFlightConfirm):
    passengers: list[TestFlightPassenger] | None = Field(default=None, min_length=1, max_length=9)
    contact: TestFlightContact | None = None

    @model_validator(mode="after")
    def complete_party(self):
        if (self.passengers is None) != (self.contact is None):
            raise ValueError("Provide passengers and contact together.")
        return self


class TravelInvocation(Strict):
    plan_id: UUID
    action: Literal[
        "research/snapshot",
        "capabilities",
        "airports",
        "places",
        "hotels/search",
        "hotels/detail",
        "hotels/reviews",
        "hotels/catalog",
        "flights/search",
        "flights/verify",
        "sandbox/prebook",
        "sandbox/book",
        "sandbox/status",
        "sandbox/flights/verify",
        "sandbox/flights/prebook",
        "sandbox/flights/book",
        "sandbox/flights/status",
        "sandbox/flights/services",
    ]
    criteria: dict = Field(default_factory=dict)


POST_ACTIONS = {
    "sandbox/flights/services",
    "flights/verify",
    "sandbox/flights/verify",
    "sandbox/flights/prebook",
    "sandbox/flights/book",
    "sandbox/flights/status",
    "hotels/search",
    "flights/search",
    "sandbox/prebook",
    "sandbox/book",
    "sandbox/status",
}

INPUTS = {
    "research/snapshot": ResearchSnapshotQuery,
    "sandbox/flights/verify": SandboxHandle,
    "sandbox/flights/prebook": SandboxFlightPrebook,
    "sandbox/flights/services": SandboxFlightServices,
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
    "hotels/reviews": HotelReviewsQuery,
    "hotels/catalog": StayCatalogQuery,
    "flights/search": FlightSearch,
    "flights/verify": FlightVerifyQuery,
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
    marketing_code: str | None = Field(default=None, max_length=3)
    marketing_logo: str | None = None
    operating_code: str | None = Field(default=None, max_length=3)
    operating_logo: str | None = None
    flight_number: str | None = None
    duration_minutes: int | None = None
    technical_stops: list[str] = Field(default_factory=list, max_length=10)

    @field_validator('marketing_logo', 'operating_logo', mode='before')
    @classmethod
    def safe_carrier_logo(cls, value):
        return carrier_logo(value)


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
    airport_groups: dict[Iata, Annotated[list[Iata], Field(min_length=1, max_length=12)]] = Field(default_factory=dict, max_length=2)
    search_id: str | None = Field(default=None, min_length=1, max_length=100)
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


class GuestReview(Public):
    score: float | None = Field(default=None, ge=0, le=10)
    date: str | None = Field(default=None, max_length=40)
    headline: str | None = Field(default=None, max_length=240)
    pros: str | None = Field(default=None, max_length=600)
    cons: str | None = Field(default=None, max_length=600)


class ReviewCategory(Public):
    name: str = Field(max_length=80)
    score: float | None = Field(default=None, ge=0, le=10)
    description: str | None = Field(default=None, max_length=400)


class ReviewSentiment(Public):
    ai_generated: Literal[True] = True
    categories: list[ReviewCategory] = Field(default_factory=list, max_length=10)
    pros: list[str] = Field(default_factory=list, max_length=10)
    cons: list[str] = Field(default_factory=list, max_length=10)


class HotelReviews(Envelope):
    hotel_id: HotelId
    checked_at: str
    reviews: list[GuestReview] = Field(max_length=10)
    sentiment: ReviewSentiment | None = None
    notices: list[str] = Field(default_factory=list, max_length=5)


class FlightVerification(Envelope):
    checked_at: str
    flight: Flight
    previous_price: Money
    price_changed: bool
    fare_name: str | None = Field(default=None, max_length=240)
    changeable: bool | None = None
    change_fee: Money | None = None
    mixed_cabin: bool | None = None
    notices: list[str] = Field(default_factory=list, max_length=10)


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


class FlightService(Public):
    id: str
    kind: Literal["seat", "baggage"]
    label: str
    segment_index: int
    passenger_indexes: list[int]
    price: Money
    max_quantity: int = 1
    seat_row: int | None = None
    seat_column: str | None = None


class SelectedFlightService(Public):
    id: str
    kind: Literal["seat", "baggage"]
    label: str
    segment_index: int
    passenger_index: int
    quantity: int
    price: Money


class SandboxFlightResult(Public):
    sandbox: Literal[True] = True
    mode: Literal["flights"] = "flights"
    provider: Literal["LiteAPI"] = "LiteAPI"
    status: Literal[
        "review", "ready_to_book", "confirmed", "pending", "cancelled", "failed", "unknown"
    ]
    token: str
    flight: Flight
    passenger_count: int
    passenger_ages: list[int] = Field(default_factory=list, max_length=9)
    country_code: str = "US"
    services: list[FlightService] = Field(default_factory=list, max_length=2000)
    selected_services: list[SelectedFlightService] = Field(default_factory=list, max_length=64)
    payment_secret: str | None = None
    booking_id: str | None = None
    confirmation_code: str | None = None


OUTPUTS = {
    **{f"sandbox/flights/{action}": SandboxFlightResult for action in ("verify", "prebook", "services", "book", "status")},
    "sandbox/prebook": SandboxResult,
    "sandbox/book": SandboxResult,
    "sandbox/status": SandboxResult,
    "capabilities": Capabilities,
    "airports": Airports,
    "places": Places,
    "hotels/search": SearchResult,
    "hotels/detail": HotelDetail,
    "hotels/reviews": HotelReviews,
    "hotels/catalog": StayCatalog,
    "flights/search": SearchResult,
    "flights/verify": FlightVerification,
}
