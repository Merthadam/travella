"""Strict public contract for reusable traveler profile details."""

import re
import unicodedata
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from services.shared.traveler_profile import reference_catalog

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


class HomeCity(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=2, max_length=110)
    country_code: str = Field(min_length=2, max_length=2)
    place_id: str | None = Field(default=None, min_length=1, max_length=255)
    address: str | None = Field(default=None, max_length=500)
    source: Literal["manual", "google"]

    @field_validator("address", mode="before")
    @classmethod
    def valid_address(cls, value):
        if isinstance(value, str):
            if any(unicodedata.category(char) == "Cc" for char in value):
                raise ValueError("Enter an address without control characters.")
            return value.strip()
        return value

    @field_validator("name")
    @classmethod
    def valid_city_name(cls, value: str) -> str:
        value = value.strip()
        if len(value) < 2 or not any(char.isalpha() for char in value):
            raise ValueError("Enter a city name.")
        if _STREET_ADDRESS.search(value) or any(ord(char) < 32 for char in value):
            raise ValueError("Use a city, not a street address.")
        return value

    @field_validator("country_code")
    @classmethod
    def known_country(cls, value: str) -> str:
        if value not in {item["code"] for item in reference_catalog("countries")}:
            raise ValueError("Choose a country from the list.")
        return value

    @model_validator(mode="after")
    def google_identifier(self):
        if self.source == "google" and not self.place_id:
            raise ValueError("A Google city selection requires its place ID.")
        return self


class OnboardingSteps(BaseModel):
    model_config = ConfigDict(extra="forbid")
    home: Literal["pending", "completed"] = "pending"
    citizenship: Literal["pending", "completed", "skipped"] = "pending"
    needs: Literal["pending", "completed", "skipped"] = "pending"
    interests: Literal["pending", "completed", "skipped"] = "pending"


class OnboardingProgress(BaseModel):
    model_config = ConfigDict(extra="forbid")
    version: Literal[2] = 2
    steps: OnboardingSteps = Field(default_factory=OnboardingSteps)
    completed_version: Literal[0, 2] = 0


class HomeValues(BaseModel):
    model_config = ConfigDict(extra="forbid")
    home_city: HomeCity
    default_airport: str | None

    @field_validator("default_airport")
    @classmethod
    def known_airport(cls, value):
        if value is not None and value not in {
            item["code"] for item in reference_catalog("airports")
        }:
            raise ValueError("Choose an airport from the list.")
        return value


class CitizenshipValues(BaseModel):
    model_config = ConfigDict(extra="forbid")
    citizenships: list[str] = Field(max_length=10)

    @field_validator("citizenships")
    @classmethod
    def bounded_citizenships(cls, values):
        # Existing free text is accepted only when the repository confirms it
        # was already saved. Newly supplied citizenships must be catalog codes.
        return ProfileInput.validate_citizenships(values)


class NeedsValues(BaseModel):
    model_config = ConfigDict(extra="forbid")
    accessibility_needs: str = Field(max_length=1000)
    food_needs: str = Field(max_length=1000)

    @field_validator("accessibility_needs", "food_needs")
    @classmethod
    def bounded_text(cls, value):
        return ProfileInput.trim_text(value)


class InterestValues(BaseModel):
    model_config = ConfigDict(extra="forbid")
    interest_ids: list[str] = Field(max_length=40)
    custom_interests: list[str] = Field(max_length=20)

    @model_validator(mode="after")
    def valid_interests(self):
        labels = {item["id"]: item["label"] for item in reference_catalog("interests")}
        if any(value not in labels for value in self.interest_ids):
            raise ValueError("Choose interests from the list.")
        self.interest_ids = list(dict.fromkeys(self.interest_ids))
        custom = [" ".join(value.split()) for value in self.custom_interests]
        if any(not value or len(value) > 80 or _STREET_ADDRESS.search(value) for value in custom):
            raise ValueError("Custom interests must be 1–80 characters.")
        seen = {labels[value].lower() for value in self.interest_ids}
        unique = []
        for value in custom:
            if value.lower() not in seen:
                unique.append(value)
                seen.add(value.lower())
        self.custom_interests = unique
        if len(seen) < 5:
            raise ValueError("Choose at least five interests, or skip this step.")
        if len(", ".join([labels[value] for value in self.interest_ids] + unique)) > 1000:
            raise ValueError("Please shorten your custom interests.")
        return self


STEP_SCHEMAS = {
    "home": HomeValues, "citizenship": CitizenshipValues,
    "needs": NeedsValues, "interests": InterestValues,
}


class OnboardingMutation(BaseModel):
    model_config = ConfigDict(extra="forbid")
    step: Literal["home", "citizenship", "needs", "interests"]
    action: Literal["continue", "skip"]
    expected_revision: int = Field(ge=0, strict=True)
    event_id: UUID
    values: dict = Field(default_factory=dict)

    @model_validator(mode="after")
    def step_values(self):
        if self.action == "skip":
            if self.step == "home" or self.values:
                raise ValueError("Only optional steps with no changed values may be skipped.")
        else:
            self.values = STEP_SCHEMAS[self.step].model_validate(self.values).model_dump(mode="json")
        return self


class ProfileOutput(ProfileInput):
    home_city: HomeCity | None = None
    default_airport: str | None = None
    interest_ids: list[str] = Field(default_factory=list)
    custom_interests: list[str] = Field(default_factory=list)
    onboarding: OnboardingProgress = Field(default_factory=OnboardingProgress)
    revision: int = Field(default=0, ge=0)
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
            home_city=payload.get("home_city"),
            default_airport=payload.get("default_airport"),
            interest_ids=payload.get("interest_ids", []),
            custom_interests=payload.get("custom_interests", []),
            onboarding=payload.get("onboarding", OnboardingProgress()),
            revision=payload.get("revision", 0),
            onboarding_complete=bool(row.onboarding_complete) if row is not None else False,
            exists=row is not None,
            updated_at=row.updated_at.isoformat() if row is not None else None,
        )
