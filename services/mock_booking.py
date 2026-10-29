"""Non-sensitive, test-only stay summary allowed in a reviewed canvas snapshot."""
from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


class StayMoney(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    amount: str | None = Field(default=None, max_length=30, pattern=r"^\d+(\.\d+)?$")
    currency: str | None = Field(default=None, pattern=r"^[A-Z]{3}$")


class StayTax(StayMoney):
    name: str = Field(max_length=300)


class StayGuest(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    room: int | None = Field(ge=1, le=4)
    firstName: str = Field(min_length=1, max_length=50)
    lastName: str = Field(min_length=1, max_length=50)


class StayRoom(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    room: int = Field(ge=1, le=4)
    name: str = Field(max_length=500)
    board: str | None = Field(default=None, max_length=300)
    occupancy: str | None = Field(default=None, max_length=300)
    refundable: bool | None = None
    cancellation: str | None = Field(default=None, max_length=4000)
    cancellationDeadline: str | None = Field(default=None, max_length=120)
    excludedTaxes: list[StayTax] = Field(default_factory=list, max_length=50)


class StayReservation(BaseModel):
    """Owner-only reservation document; never included in agent context."""
    model_config = ConfigDict(extra="forbid", strict=True)
    provider: Literal["LiteAPI"] = "LiteAPI"
    sandbox: Literal[True] = True
    hotelId: str = Field(max_length=100)
    address: str | None = Field(default=None, max_length=1000)
    confirmationCode: str | None = Field(default=None, max_length=100)
    roomCount: int = Field(ge=1, le=4)
    rooms: list[StayRoom] = Field(min_length=1, max_length=4)
    guests: list[StayGuest] = Field(default_factory=list, max_length=40)
    total: StayMoney
    priceSource: Literal["prebook", "booking"]
    roomSource: Literal["prebook", "booking"] = "prebook"
    paymentStatus: str | None = Field(default=None, max_length=100)
    terms: str | None = Field(default=None, max_length=12000)

    @model_validator(mode="after")
    def valid_rooms(self):
        if {r.room for r in self.rooms} != set(range(1, self.roomCount + 1)) or len(self.rooms) != self.roomCount:
            raise ValueError("reservation must contain each occupied room")
        if any(g.room is not None and g.room > self.roomCount for g in self.guests):
            raise ValueError("guest room is outside the reservation")
        return self


def without_stay_document(snapshot):
    """Copy a canvas for agent use without private reservation/guest details."""
    from copy import deepcopy
    value = deepcopy(snapshot)
    if isinstance(value, dict):
        booking = value.get("components", {}).get("accommodation", {}).get("mockBooking")
        if isinstance(booking, dict):
            booking.pop("reservation", None)
    return value


class MockStaySummary(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    reference: str = Field(min_length=1, max_length=100)
    hotelName: str = Field(min_length=1, max_length=160)
    checkIn: str = Field(min_length=10, max_length=10)
    checkOut: str = Field(min_length=10, max_length=10)
    reservation: StayReservation | None = None

    @model_validator(mode="after")
    def valid_dates(self):
        for value in (self.checkIn, self.checkOut):
            if date.fromisoformat(value).isoformat() != value:
                raise ValueError("invalid stay date")
        if self.checkOut <= self.checkIn:
            raise ValueError("invalid stay range")
        return self


class ItinerarySegment(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    origin: str = Field(pattern=r"^[A-Z]{3}$")
    destination: str = Field(pattern=r"^[A-Z]{3}$")
    departureAt: str = Field(min_length=16, max_length=40)
    arrivalAt: str = Field(min_length=16, max_length=40)
    airline: str = Field(max_length=100)
    flightNumber: str = Field(max_length=40)

    @model_validator(mode="after")
    def valid_times(self):
        datetime.fromisoformat(self.departureAt)
        datetime.fromisoformat(self.arrivalAt)
        return self


class ItineraryExtra(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    kind: Literal["seat", "baggage"]
    label: str = Field(max_length=200)
    segmentIndex: int = Field(ge=0, le=23)
    passengerIndex: int = Field(ge=0, le=8)
    quantity: int = Field(ge=1, le=3)
    amount: str = Field(max_length=30, pattern=r"^\d+(\.\d+)?$")
    currency: str = Field(pattern=r"^[A-Z]{3}$")


class FlightItinerary(BaseModel):
    """Non-personal document data only; never a provider payload or passenger list."""
    model_config = ConfigDict(extra="forbid", strict=True)
    outbound: list[ItinerarySegment] = Field(min_length=1, max_length=12)
    inbound: list[ItinerarySegment] = Field(min_length=1, max_length=12)
    passengerCount: int = Field(ge=1, le=9)
    amount: str = Field(max_length=30, pattern=r"^\d+(\.\d+)?$")
    currency: str = Field(pattern=r"^[A-Z]{3}$")
    baggage: str = Field(max_length=500)
    fareConditions: str = Field(max_length=1000)
    confirmationCode: str = Field(max_length=100)
    extras: list[ItineraryExtra] = Field(default_factory=list, max_length=64)


class MockFlightSummary(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    reference: str = Field(min_length=1, max_length=100)
    origin: str = Field(pattern=r"^[A-Z]{3}$")
    destination: str = Field(pattern=r"^[A-Z]{3}$")
    departureDate: str = Field(min_length=10, max_length=10)
    returnDate: str = Field(min_length=10, max_length=10)
    itinerary: FlightItinerary | None = None

    @model_validator(mode="after")
    def valid_dates(self):
        for value in (self.departureDate, self.returnDate):
            if date.fromisoformat(value).isoformat() != value:
                raise ValueError("invalid flight date")
        if self.returnDate <= self.departureDate or self.origin == self.destination:
            raise ValueError("invalid return journey")
        if self.itinerary:
            outbound, inbound = self.itinerary.outbound, self.itinerary.inbound
            if (outbound[0].origin != self.origin or outbound[-1].destination != self.destination
                    or outbound[0].departureAt[:10] != self.departureDate
                    or inbound[0].departureAt[:10] != self.returnDate):
                raise ValueError("itinerary must match booking summary")
        return self
