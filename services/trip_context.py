"""Allow-listed research context, independent of saved Plan requirements and memory."""

from __future__ import annotations

from datetime import date
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

ContextField = Literal[
    "candidates", "finalDestination", "dateStart", "dateEnd", "dateNote",
    "flexibleDates", "travelers", "budget", "noFixedBudget", "flights", "accommodation",
]
Source = Literal["user_explicit", "agent_inferred", "memory", "research", "user_edit"]
Need = Literal["undecided", "needed", "not-needed"]
Place = Annotated[str, Field(min_length=1, max_length=100)]


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)


class Provenance(StrictModel):
    source: Source
    updated_at: str = Field(max_length=64)


class TripContext(StrictModel):
    candidates: list[Place] = Field(default_factory=list, max_length=20)
    finalDestination: str = Field(default="", max_length=100)
    dateStart: str = Field(default="", max_length=10)
    dateEnd: str = Field(default="", max_length=10)
    dateNote: str = Field(default="", max_length=200)
    flexibleDates: bool = False
    travelers: int | None = Field(default=None, ge=1, le=50)
    budget: str = Field(default="", max_length=200)
    noFixedBudget: bool = False
    flights: Need = "undecided"
    accommodation: Need = "undecided"
    provenance: dict[str, Provenance] = Field(default_factory=dict, max_length=12)

    @model_validator(mode="after")
    def consistent(self):
        for value in (self.dateStart, self.dateEnd):
            if value and date.fromisoformat(value).isoformat() != value:
                raise ValueError("use ISO dates")
        if self.dateStart and self.dateEnd and self.dateEnd < self.dateStart:
            raise ValueError("end date precedes start")
        if self.flexibleDates and (self.dateStart or self.dateEnd):
            raise ValueError("flexible dates cannot contain exact dates")
        if self.noFixedBudget and self.budget:
            raise ValueError("unlimited budget cannot contain an amount")
        if len({name.casefold() for name in self.candidates}) != len(self.candidates):
            raise ValueError("duplicate candidates")
        if self.finalDestination and self.finalDestination not in self.candidates:
            raise ValueError("final destination must be a candidate")
        if set(self.provenance) - set(TripContext.model_fields) or "provenance" in self.provenance:
            raise ValueError("unknown provenance field")
        return self


class StateChange(StrictModel):
    operation: Literal["set", "clear", "add_candidate", "remove_candidate"]
    field: ContextField
    value: str | int | bool | None
    source: Source
    # A short quote supports explicit intent; do not store it in the context metadata.
    source_quote: str = Field(default="", max_length=500)

    @model_validator(mode="after")
    def valid_operation(self):
        if self.operation in {"add_candidate", "remove_candidate"}:
            if self.field != "candidates" or not isinstance(self.value, str) or not self.value.strip():
                raise ValueError("candidate operation needs a place name")
        elif self.field == "candidates":
            raise ValueError("change candidates individually")
        if self.operation == "clear" and self.value is not None:
            raise ValueError("clear requires null")
        return self


class TurnResult(StrictModel):
    answer: str = Field(min_length=1, max_length=2000)
    state_changes: list[StateChange] = Field(default_factory=list, max_length=24)


class ContextSnapshot(StrictModel):
    revision: int = Field(ge=1)
    context: TripContext
    locked: bool = False


def a2ui_messages(snapshot: ContextSnapshot) -> list[dict]:
    """Only our registered TripBrief component is allowed on this surface."""
    surface = "trip-brief"
    return [
        {"version": "v0.9", "createSurface": {"surfaceId": surface, "catalogId": "urn:travella:catalog:trip-brief:v1"}},
        {"version": "v0.9", "updateComponents": {"surfaceId": surface, "components": [
            {"id": "root", "component": "TripBrief", "value": {"path": "/tripContext/context"}},
        ]}},
        {"version": "v0.9", "updateDataModel": {"surfaceId": surface, "path": "/tripContext", "value": snapshot.model_dump()}},
    ]


class ContextSurface(ContextSnapshot):
    a2ui_messages: list[dict] = Field(default_factory=list, max_length=3)


class ContextActionData(StrictModel):
    revision: int = Field(ge=1)
    changes: list[StateChange] = Field(min_length=1, max_length=24)


class ContextAction(StrictModel):
    name: Literal["update_trip_context"]
    surfaceId: Literal["trip-brief"]
    sourceComponentId: Literal["root"]
    timestamp: str = Field(min_length=1, max_length=64)
    context: ContextActionData


class A2uiClientMessage(StrictModel):
    action: ContextAction


class ForwardedProps(StrictModel):
    a2ui: A2uiClientMessage


class ContextEdit(StrictModel):
    changes: list[StateChange] = Field(min_length=1, max_length=24)


class ContextRun(StrictModel):
    event_id: str = Field(min_length=1, max_length=100)
    action: Literal["begin", "complete", "cancel"]
    revision: int = Field(default=1, ge=1)
    changes: list[StateChange] = Field(default_factory=list, max_length=24)
    message: str = Field(default="", max_length=2000)
    assistant_text: str = Field(default="", max_length=2000)
    generation: int = Field(default=0, ge=0)


def apply_changes(context: TripContext, changes: list[StateChange], *, now: str,
                  user_edit: bool = False, message: str = "") -> TripContext:
    """Validate the whole batch before publishing; omissions never clear fields."""
    data = context.model_dump()
    defaults = TripContext().model_dump()
    for change in changes:
        source = "user_edit" if user_edit else change.source
        if not user_edit:
            if source == "user_edit":
                raise ValueError("agent cannot claim a sidebar edit")
            explicit = source == "user_explicit" and bool(change.source_quote.strip()) and change.source_quote.strip().casefold() in message.casefold()
            if source == "user_explicit" and not explicit:
                raise ValueError("explicit change requires a quote from this message")
            if (change.operation in {"clear", "remove_candidate"} or change.field == "finalDestination") and not explicit:
                raise ValueError("removal and final choice require explicit traveler intent")
            if source == "research" and change.operation != "add_candidate":
                raise ValueError("research cannot decide personal trip details")
            if source == "memory" and (change.field != "budget" or data["budget"] or data["noFixedBudget"] or "budget" in data["provenance"]):
                raise ValueError("memory only prefills an untouched budget")
            prior = data["provenance"].get(change.field, {})
            if (source == "agent_inferred" and change.operation == "set"
                    and prior.get("source") in {"user_explicit", "user_edit"}
                    and data[change.field] != change.value):
                raise ValueError("inference cannot overwrite a traveler decision")
        field = change.field
        touched = {field}
        if change.operation == "add_candidate":
            name = change.value.strip()
            if not any(item.casefold() == name.casefold() for item in data["candidates"]):
                data["candidates"].append(name)
        elif change.operation == "remove_candidate":
            name = change.value.strip().casefold()
            data["candidates"] = [item for item in data["candidates"] if item.casefold() != name]
            if data["finalDestination"].casefold() == name:
                data["finalDestination"] = ""
                touched.add("finalDestination")
        else:
            data[field] = defaults[field] if change.operation == "clear" else change.value
            if field == "finalDestination" and data[field]:
                known = next((item for item in data["candidates"] if item.casefold() == str(data[field]).casefold()), None)
                if known:
                    data[field] = known
                else:
                    data["candidates"].append(data[field])
                    touched.add("candidates")
            if field == "flexibleDates" and data[field]:
                data.update(dateStart="", dateEnd="", dateNote="")
                touched.update(("dateStart", "dateEnd", "dateNote"))
            if field in {"dateStart", "dateEnd"} and data[field]:
                data["flexibleDates"] = False
                touched.add("flexibleDates")
            if field == "noFixedBudget" and data[field]:
                data["budget"] = ""
                touched.add("budget")
            if field == "budget":
                data["noFixedBudget"] = False
                touched.add("noFixedBudget")
        for key in touched:
            data["provenance"][key] = {"source": source, "updated_at": now}
    return TripContext.model_validate(data)
