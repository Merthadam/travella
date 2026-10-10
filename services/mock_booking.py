"""Non-sensitive, test-only stay summary allowed in a reviewed canvas snapshot."""
from datetime import date

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
