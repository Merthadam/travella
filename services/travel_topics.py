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
