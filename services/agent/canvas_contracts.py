"""Validated draft data matching the approved TripThemes component."""

from typing import Literal

from pydantic import Field, model_validator

from .claude.research_result import StrictResult

ThemeKind = Literal["theme", "pace", "priority", "must_do", "avoid"]


class ThemeSummaryItem(StrictResult):
    kind: ThemeKind
    text: str = Field(min_length=1, max_length=160)
    source_id: str = Field(min_length=1, max_length=80)
    source_quote: str = Field(min_length=1, max_length=500)


class ThemesSummary(StrictResult):
    items: list[ThemeSummaryItem] = Field(max_length=20)


class ThemeComponentItem(StrictResult):
    id: str = Field(min_length=1, max_length=80, pattern=r"^[a-zA-Z0-9_-]+$")
    kind: ThemeKind
    text: str = Field(min_length=1, max_length=160)
    source: Literal["Conversation", "Trip context", "Saved preference"]


class ThemesComponent(StrictResult):
    status: Literal["ready"] = "ready"
    items: list[ThemeComponentItem] = Field(max_length=20)

    @model_validator(mode="after")
    def unique_ids(self):
        if len({item.id for item in self.items}) != len(self.items):
            raise ValueError("Duplicate theme ids")
        return self


class CanvasDraft(StrictResult):
    component: Literal["TripThemes"] = "TripThemes"
    data: ThemesComponent
