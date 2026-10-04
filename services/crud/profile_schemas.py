"""Strict public contract for reusable traveler profile details."""

import re

from pydantic import BaseModel, ConfigDict, Field, field_validator

_STREET_ADDRESS = re.compile(
    r"\b\d{1,6}\s+[\w.'-]+(?:\s+[\w.'-]+){0,3}\s+"
    r"(?:street|st\.?|road|rd\.?|avenue|ave\.?|boulevard|blvd\.?|"
    r"lane|ln\.?|drive|dr\.?|way|court|ct\.?|place|pl\.?)\b",
    re.IGNORECASE,
)


class ProfileInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    departure_base: str = Field(default="", max_length=120)
    citizenships: list[str] = Field(default_factory=list, max_length=10)
    food_needs: str = Field(default="", max_length=1000)
    accessibility_needs: str = Field(default="", max_length=1000)
    travel_interests: str = Field(default="", max_length=1000)
    onboarding_complete: bool = False

    @field_validator("citizenships")
    @classmethod
    def validate_citizenships(cls, values: list[str]) -> list[str]:
        normalized = [value.strip() for value in values]
        if any(not value or len(value) > 80 or _STREET_ADDRESS.search(value) for value in normalized):
            raise ValueError("Each citizenship must be between 1 and 80 characters.")
        return list(dict.fromkeys(normalized))

    @field_validator("departure_base", "food_needs", "accessibility_needs", "travel_interests")
    @classmethod
    def trim_text(cls, value: str) -> str:
        normalized = value.strip()
        if _STREET_ADDRESS.search(normalized):
            raise ValueError("Use a city or airport, not a street address.")
        return normalized


class ProfileOutput(ProfileInput):
    exists: bool
    updated_at: str | None = None

    @classmethod
    def from_row(cls, row):
        payload = row.payload if row is not None else {}
        return cls(
            departure_base=payload.get("departure_base", ""),
            citizenships=payload.get("citizenships", []),
            food_needs=payload.get("food_needs", ""),
            accessibility_needs=payload.get("accessibility_needs", ""),
            travel_interests=payload.get("travel_interests", ""),
            onboarding_complete=bool(row.onboarding_complete) if row is not None else False,
            exists=row is not None,
            updated_at=row.updated_at.isoformat() if row is not None else None,
        )
