"""Allow-listed canvas editing projections; provider facts never come from the model."""
from typing import Annotated
from urllib.parse import urlsplit

from pydantic import Field, field_validator, model_validator

from services.crud.canvas import CanvasSnapshot

from .canvas_contracts import PinPosition
from .claude.research_result import StrictResult, public_https_url


class MapArea(StrictResult):
    south: float = Field(ge=-90, le=90, allow_inf_nan=False)
    west: float = Field(ge=-180, le=180, allow_inf_nan=False)
    north: float = Field(ge=-90, le=90, allow_inf_nan=False)
    east: float = Field(ge=-180, le=180, allow_inf_nan=False)

    @model_validator(mode="after")
    def rectangle(self):
        if self.south >= self.north or self.west >= self.east:
            raise ValueError("Map area must be a non-empty rectangle")
        return self

    def contains(self, position: PinPosition) -> bool:
        return (self.south <= position.lat <= self.north
                and self.west <= position.lng <= self.east)


class ActivityPlace(StrictResult):
    id: str = Field(min_length=1, max_length=80, pattern=r"^[a-zA-Z0-9_-]+$")
    place_id: str = Field(min_length=1, max_length=300)
    name: str = Field(min_length=1, max_length=120)
    address: str = Field(max_length=240)
    position: PinPosition
    rating: float | None = Field(default=None, ge=0, le=5, allow_inf_nan=False)
    rating_count: int | None = Field(default=None, ge=0)
    types: list[Annotated[str, Field(max_length=80)]] = Field(default_factory=list, max_length=10)
    maps_url: str = Field(max_length=2048)
    reason: str = Field(default="", max_length=240)

    @field_validator("maps_url")
    @classmethod
    def google_maps_url(cls, value):
        value = public_https_url(value)
        parts = urlsplit(value)
        if (parts.hostname not in {"google.com", "www.google.com", "maps.google.com"}
                or (parts.hostname != "maps.google.com" and not parts.path.startswith("/maps"))):
            raise ValueError("Expected a Google Maps link")
        return value


class SignedActivityPlace(ActivityPlace):
    ticket: str = Field(min_length=1, max_length=4096)


class CanvasEditRequest(StrictResult):
    draft: CanvasSnapshot
    suggestions: list[SignedActivityPlace] = Field(default_factory=list, max_length=5)
    area: MapArea | None = None


class CanvasEditResult(StrictResult):
    suggestions: list[ActivityPlace] = Field(default_factory=list, max_length=5)
    add_ids: list[Annotated[str, Field(max_length=80)]] = Field(default_factory=list, max_length=5)
    area: MapArea | None = None

    @model_validator(mode="after")
    def known_additions(self):
        known = {item.id for item in self.suggestions}
        if len(known) != len(self.suggestions) or len(set(self.add_ids)) != len(self.add_ids):
            raise ValueError("Duplicate places")
        if not set(self.add_ids).issubset(known):
            raise ValueError("Added places must appear in suggestions")
        return self


class PublicCanvasEditResult(CanvasEditResult):
    suggestions: list[SignedActivityPlace] = Field(default_factory=list, max_length=5)
