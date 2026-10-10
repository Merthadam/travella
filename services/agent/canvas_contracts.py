"""Validated draft data matching the approved TripThemes component."""

from typing import Any, Literal

from pydantic import Field, model_validator
from services.mock_booking import MockStaySummary, MockFlightSummary

from .claude.research_result import StrictResult

ThemeKind = Literal["theme", "pace", "priority", "must_do", "avoid"]


class ThemeAcceptance(StrictResult):
    source_id: str = Field(min_length=1, max_length=80)
    source_quote: str = Field(min_length=1, max_length=500)


class ThemeSummaryItem(StrictResult):
    kind: ThemeKind
    text: str = Field(min_length=1, max_length=160)
    source_id: str = Field(min_length=1, max_length=80)
    source_quote: str = Field(min_length=1, max_length=500)
    acceptance: ThemeAcceptance | None = None


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
    # Legacy themes fields remain readable while the connected surface uses components.
    component: Literal["TripThemes"] | None = None
    data: ThemesComponent | None = None
    components: dict[Literal["themes", "essentials", "map", "flights", "accommodation",
                             "findings", "links"], dict[str, Any]] = Field(default_factory=dict)
    group_status: dict[Literal["themes", "research"], Literal["loading", "ready", "error"]] = Field(default_factory=dict)
    generation_id: str | None = Field(default=None, max_length=100)
    context_revision: int | None = Field(default=None, ge=1)
    plan_revision: int | None = Field(default=None, ge=1)
    evidence: dict[str, str] = Field(default_factory=dict)

    @model_validator(mode="after")
    def validate_components(self):
        import json
        if len(json.dumps(self.components)) > 65536:
            raise ValueError("Canvas exceeds size limit")
        for key, value in self.components.items():
            COMPONENT_MODELS[key].model_validate(value)
            items = value.get("items", value.get("pins", []))
            if len({item["id"] for item in items}) != len(items):
                raise ValueError("Duplicate component item ids")
        return self


class CanvasReviewIssue(StrictResult):
    component_id: Literal["items", "findings", "links"]
    item_id: str = Field(min_length=1, max_length=80)
    code: str = Field(min_length=1, max_length=80)
    instruction: str = Field(min_length=1, max_length=300)


class CanvasReview(StrictResult):
    verdict: Literal["accept", "revise"]
    issues: list[CanvasReviewIssue] = Field(max_length=8)


class EvidenceReference(StrictResult):
    evidence_id: str = Field(min_length=1, max_length=180)
    quote: str = Field(min_length=1, max_length=500)


class CanvasFinding(StrictResult):
    title: str = Field(min_length=1, max_length=120)
    summary: str = Field(min_length=1, max_length=600)
    sources: list[EvidenceReference] = Field(max_length=5)
    certainty: Literal["supported", "uncertain", "conflicting", "unavailable"]
    time_sensitive: bool


class CanvasLink(StrictResult):
    evidence_id: str = Field(min_length=1, max_length=180)
    purpose: str = Field(min_length=1, max_length=240)
    category: Literal["official", "transport", "attraction", "practical", "other"]


class CanvasResearchSummary(StrictResult):
    findings: list[CanvasFinding] = Field(max_length=30)
    links: list[CanvasLink] = Field(max_length=20)


class ReadyState(StrictResult):
    status: Literal["ready", "empty", "loading", "error"] = "ready"
    error: str | None = Field(default=None, max_length=240)


class CanvasDates(StrictResult):
    start: str = Field(max_length=10)
    end: str = Field(max_length=10)
    note: str = Field(max_length=200)
    flexible: bool


class CanvasBudgetValue(StrictResult):
    label: str = Field(max_length=200)
    noFixedBudget: bool


class EssentialsComponent(ReadyState):
    dates: CanvasDates
    travelers: int | None = Field(ge=1, le=50)
    budget: CanvasBudgetValue


class PinPosition(StrictResult):
    lat: float = Field(ge=-90, le=90)
    lng: float = Field(ge=-180, le=180)


class CanvasPin(StrictResult):
    id: str = Field(min_length=1, max_length=80, pattern=r"^[a-zA-Z0-9_-]+$")
    name: str = Field(min_length=1, max_length=120)
    category: Literal["stay", "airport", "food", "activity", "other"]
    position: PinPosition
    description: str = Field(max_length=240)


class MapComponent(ReadyState):
    destination: str = Field(max_length=120)
    final: bool
    pins: list[CanvasPin] = Field(max_length=50)


class TravelComponent(ReadyState):
    need: Literal["needed", "not-needed", "undecided"]
    bookingStatus: Literal["booked", "not-booked", "mock-booked"]
    mockBooking: MockStaySummary | MockFlightSummary | None = None
    title: str = Field(max_length=160)
    subtitle: str = Field(max_length=160)
    detail: str = Field(max_length=160)
    availability: Literal["preview", "unavailable", "ready"]


class PublicSource(StrictResult):
    title: str = Field(max_length=120)
    url: str = Field(max_length=2048)

    @model_validator(mode="after")
    def valid_url(self):
        from .claude.research_result import public_https_url
        public_https_url(self.url)
        return self


class FindingComponentItem(StrictResult):
    id: str = Field(min_length=1, max_length=80, pattern=r"^[a-zA-Z0-9_-]+$")
    title: str = Field(min_length=1, max_length=120)
    summary: str = Field(max_length=600)
    sources: list[PublicSource] = Field(max_length=5)
    certainty: Literal["supported", "uncertain", "conflicting", "unavailable"]
    researchedAt: str | None = Field(default=None, max_length=40)


class FindingsComponent(ReadyState):
    items: list[FindingComponentItem] = Field(max_length=30)


class LinkComponentItem(PublicSource):
    id: str = Field(min_length=1, max_length=80, pattern=r"^[a-zA-Z0-9_-]+$")
    purpose: str = Field(max_length=240)
    category: Literal["official", "transport", "attraction", "practical", "other"]


class LinksComponent(ReadyState):
    items: list[LinkComponentItem] = Field(max_length=20)


COMPONENT_MODELS = {
    "themes": ThemesComponent, "essentials": EssentialsComponent,
    "map": MapComponent, "flights": TravelComponent, "accommodation": TravelComponent,
    "findings": FindingsComponent, "links": LinksComponent,
}
