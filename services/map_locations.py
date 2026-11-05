"""Non-private location identity shared by saved receipts and canvas pins."""
import re
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


class LocationPosition(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    lat: float = Field(ge=-90, le=90, allow_inf_nan=False)
    lng: float = Field(ge=-180, le=180, allow_inf_nan=False)


class LocationSource(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    provider: Literal["liteapi", "iata"]
    id: str = Field(min_length=1, max_length=100, pattern=r"^[A-Za-z0-9_-]+$")

    @model_validator(mode="after")
    def airport_code(self):
        if self.provider == "iata" and not re.fullmatch(r"[A-Z]{3}", self.id):
            raise ValueError("use an exact airport code")
        return self
