"""Bounded public specialist contracts; provider payloads never cross this boundary."""
import hashlib
import hmac
import json
import os
from datetime import datetime
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

Topic = Literal["trip", "stays", "flights"]
SpecialistTopic = Literal["stays", "flights"]
Text = Annotated[str, Field(max_length=240)]


class Strict(BaseModel):
    model_config = ConfigDict(extra="forbid")


class TravelReference(Strict):
    search_id: str = Field(min_length=1, max_length=100)
    option_id: str = Field(min_length=1, max_length=100)
    room_id: str | None = Field(default=None, min_length=1, max_length=100)


class TravelDiscussion(Strict):
    intent: Literal["discuss", "compare", "review"] = "discuss"
    options: list[TravelReference] = Field(min_length=1, max_length=3)

    @model_validator(mode="after")
    def cardinality(self):
        keys = [(r.search_id, r.option_id, r.room_id) for r in self.options]
        if len(set(keys)) != len(keys) or (self.intent == "compare" and len(keys) < 2) or (self.intent == "review" and len(keys) != 1):
            raise ValueError("Invalid option selection")
        return self


Identifier = Annotated[str, Field(min_length=1, max_length=100)]


class WorkspaceView(Strict):
    budget: str = Field(default="", max_length=16, pattern=r"^(?:\d+(?:\.\d+)?)?$")
    refundable: bool = Field(default=False, strict=True)
    direct: bool = Field(default=False, strict=True)
    bag: bool = Field(default=False, strict=True)
    sort: Literal["provider", "price", "quality"] = "provider"
    stars: Literal["", "3", "4", "5"] = ""
    rating: Literal["", "7", "8", "9"] = ""
    airline: str = Field(default="", max_length=240)
    page: int = Field(default=1, ge=1, le=100, strict=True)
    dismissed_ids: list[Identifier] = Field(default_factory=list, max_length=100)
    comparison_refs: list[TravelReference] = Field(default_factory=list, max_length=3)

    @model_validator(mode="after")
    def unique(self):
        if len(set(self.dismissed_ids)) != len(self.dismissed_ids) or len({(r.search_id, r.option_id, r.room_id) for r in self.comparison_refs}) != len(self.comparison_refs):
            raise ValueError("Duplicate workspace reference")
        return self

    def validate_topic(self, topic):
        if (topic == "stays" and (self.direct or self.bag or self.airline)) or (topic == "flights" and (self.stars or self.rating)):
            raise ValueError("Unsupported topic filter")

    def validate_members(self, snapshot):
        options = {o.id: o for o in snapshot.results}
        if any(i not in options for i in self.dismissed_ids):
            raise ValueError("Unknown dismissed option")
        for ref in self.comparison_refs:
            option = options.get(ref.option_id)
            if ref.search_id != snapshot.search_id or option is None or (ref.room_id and (snapshot.mode != "stays" or not any(r.id == ref.room_id for r in option.rooms))):
                raise ValueError("Unknown comparison option")


class WorkspaceContext(Strict):
    instance_id: Identifier
    revision: int = Field(ge=0, le=9007199254740991, strict=True)
    search_id: Identifier | None = None
    view: WorkspaceView
    draft_dirty: bool = Field(strict=True)

    @model_validator(mode="after")
    def bounded(self):
        if len(self.model_dump_json().encode()) > 32768:
            raise ValueError("Workspace context too large")
        if self.search_id is None and (self.view.dismissed_ids or self.view.comparison_refs):
            raise ValueError("Workspace references require a search")
        return self


class WorkspaceUpdate(Strict):
    action_id: Identifier
    plan_id: Identifier
    topic: SpecialistTopic
    instance_id: Identifier
    base_revision: int = Field(ge=0, le=9007199254740991, strict=True)
    run_id: Identifier
    brief_digest: str = Field(pattern=r"^[a-f0-9]{64}$")
    search_id: Identifier
    snapshot: dict
    view: WorkspaceView

    @model_validator(mode="after")
    def scoped(self):
        from services.agent.claude.canvas_travel import FlightSnapshot, StaySnapshot
        snapshot = (StaySnapshot if self.topic == "stays" else FlightSnapshot).model_validate(self.snapshot)
        if snapshot.plan_id != self.plan_id or snapshot.search_id != self.search_id:
            raise ValueError("Workspace snapshot scope mismatch")
        self.view.validate_topic(self.topic)
        self.view.validate_members(snapshot)
        self.snapshot = snapshot.model_dump(mode="json")
        return self


class ResearchOption(Strict):
    id: str = Field(min_length=1, max_length=100)
    title: str = Field(min_length=1, max_length=160)
    summary: str = Field(default="", max_length=600)
    price_label: str = Field(default="", max_length=120)
    facts: list[Text] = Field(default_factory=list, max_length=8)
    unknowns: list[Text] = Field(default_factory=list, max_length=6)
    observed_at: str = Field(max_length=40)
    provider: str = Field(min_length=1, max_length=50)
    criteria: dict[str, str | int | bool | None] = Field(default_factory=dict, max_length=16)
    reference: TravelReference | None = None

    @model_validator(mode="after")
    def bounded(self):
        if datetime.fromisoformat(self.observed_at.replace("Z", "+00:00")).tzinfo is None:
            raise ValueError("observation requires timezone")
        allowed = {"destination", "check_in", "check_out", "departure_date", "return_date", "origin", "adults", "children", "travelers", "currency", "cabin", "refundable", "property_type"}
        if set(self.criteria) - allowed or len(json.dumps(self.criteria).encode()) > 1024:
            raise ValueError("invalid research criteria")
        return self


class Comparison(Strict):
    options: list[ResearchOption] = Field(default_factory=list, max_length=3)

    @model_validator(mode="after")
    def unique(self):
        if len({o.id for o in self.options}) != len(self.options):
            raise ValueError("duplicate options")
        return self


class TopicNote(Strict):
    text: str = Field(min_length=1, max_length=400)
    kind: Literal["user_preference", "assistant_inference", "rejection", "research_override"]
    source_message_ids: list[str] = Field(min_length=1, max_length=4)


class TopicNotes(Strict):
    items: list[TopicNote] = Field(default_factory=list, max_length=12)
    covered_through_sequence: int = Field(default=0, ge=0)
    incomplete: bool = True

    @model_validator(mode="after")
    def bounded(self):
        if len(self.model_dump_json().encode()) > 4096:
            raise ValueError("notes exceed budget")
        return self


class TopicRun(Strict):
    action: Literal["begin", "complete", "cancel"]
    event_id: str = Field(min_length=1, max_length=80)
    message: str = Field(default="", max_length=2000)
    assistant_text: str = Field(default="", max_length=2000)
    generation: int = Field(default=0, ge=0)
    brief_digest: str = Field(default="", max_length=64)
    comparison: Comparison | None = None
    comparison_proof: str = Field(default="", max_length=64)
    notes: TopicNotes | None = None
    discussion: TravelDiscussion | None = None
    workspace_input_digest: str | None = Field(default=None, pattern=r"^[a-f0-9]{64}$")


class ChoiceMutation(Strict):
    action: Literal["shortlist", "prefer", "remove"]
    evidence_id: str = Field(min_length=1, max_length=100)


class TopicSnapshot(Strict):
    plan_id: str
    topic: SpecialistTopic
    revision: int
    brief: dict
    messages: list[dict]
    notes: TopicNotes
    comparison: Comparison | None = None
    comparison_stale: bool = False
    shortlist: list[dict] = Field(default_factory=list, max_length=5)
    preferred: dict | None = None
    readiness: Literal["researching", "ready", "needs_review"] = "researching"
    locked: bool = False


def digest(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode()).hexdigest()


def issue_comparison_proof(subject, plan_id, topic, event_id, brief_digest, comparison):
    """Call only after the Agent host validates every fact against observed tools."""
    secret = os.environ.get("CANVAS_EVIDENCE_SIGNING_KEY", "")
    if len(secret) < 32:
        return ""
    value = {"domain": "travel-comparison-v1", "subject": subject, "plan_id": str(plan_id),
             "topic": topic, "event_id": event_id, "brief_digest": brief_digest,
             "comparison": Comparison.model_validate(comparison).model_dump()}
    return hmac.new(secret.encode(), digest(value).encode(), hashlib.sha256).hexdigest()
