"""Saved, verbatim Google place metadata shared by canvas contracts."""

from pydantic import BaseModel, ConfigDict, Field


class GooglePlaceDetails(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    summary: str | None = Field(max_length=10000)
    language: str | None = Field(default=None, max_length=80)
    placeId: str = Field(min_length=1, max_length=300)
