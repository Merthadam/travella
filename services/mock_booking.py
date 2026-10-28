"""Non-sensitive, test-only stay summary allowed in a reviewed canvas snapshot."""
from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


class MockStaySummary(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    reference: str = Field(min_length=1, max_length=100)
    hotelName: str = Field(min_length=1, max_length=160)
    checkIn: str = Field(min_length=10, max_length=10)
    checkOut: str = Field(min_length=10, max_length=10)

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
