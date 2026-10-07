"""Strict saved-canvas contracts and atomic, explicitly confirmed persistence.

Browser claims are untrusted. Only signatures issued after agent evidence validation
can retain supported/conflicting certainty; signatures bind the full finding.
"""
from __future__ import annotations

import hashlib
import hmac
import json
import os
import re
from datetime import date
from typing import Annotated, Literal
from urllib.parse import urlsplit
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, ValidationError, model_validator

from services.trip_context import TripContext

from .contracts import LifecycleProblem
from .models import PlanLifecycle, PlanningCanvas, ResearchContext, WorkingView
from .repository import as_utc, validate_request_id


class Strict(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)


ItemId = Annotated[str, Field(min_length=1, max_length=80, pattern=r"^[a-zA-Z0-9_-]+$")]


class Component(Strict):
    status: Literal["ready", "empty", "error"]
    error: str | None = Field(default=None, max_length=240)


class Dates(Strict):
    start: str = Field(max_length=10)
    end: str = Field(max_length=10)
    note: str = Field(max_length=200)
    flexible: bool

    @model_validator(mode="after")
    def valid_dates(self):
        for value in (self.start, self.end):
            if value and date.fromisoformat(value).isoformat() != value:
                raise ValueError("invalid date")
        if self.start and self.end and self.end < self.start:
            raise ValueError("invalid date range")
        if self.flexible and (self.start or self.end):
            raise ValueError("flexible dates cannot include exact dates")
        return self


class Budget(Strict):
    label: str = Field(max_length=200)
    noFixedBudget: bool

    @model_validator(mode="after")
    def consistent(self):
        if self.noFixedBudget and self.label:
            raise ValueError("choose amount or no fixed budget")
        return self


class Essentials(Component):
    dates: Dates
    travelers: int | None = Field(ge=1, le=50)
    budget: Budget


class Theme(Strict):
    id: ItemId
    kind: Literal["theme", "pace", "priority", "must_do", "avoid"]
    text: str = Field(min_length=1, max_length=160)
    source: str | None = Field(default=None, max_length=40)


class Themes(Component):
    items: list[Theme] = Field(max_length=20)


class Position(Strict):
    lat: float = Field(ge=-90, le=90, allow_inf_nan=False)
    lng: float = Field(ge=-180, le=180, allow_inf_nan=False)


class Pin(Strict):
    id: ItemId
    name: str = Field(min_length=1, max_length=120)
    category: Literal["stay", "airport", "food", "activity", "other"]
    position: Position
    description: str = Field(max_length=240)


class MapComponent(Component):
    destination: str = Field(max_length=100)
    final: bool
    pins: list[Pin] = Field(max_length=50)

    @model_validator(mode="after")
    def chosen_destination(self):
        if self.final and not self.destination.strip():
            raise ValueError("chosen destination must have a name")
        return self


class Travel(Component):
    need: Literal["undecided", "needed", "not-needed"]
    # No trusted booking input exists yet; the studio still illustrates booked cards.
    bookingStatus: Literal["not-booked"]
    title: str = Field(max_length=160)
    subtitle: str = Field(max_length=160)
    detail: str = Field(max_length=160)
    availability: Literal["unavailable", "ready"]


def public_url(value: str) -> bool:
    try:
        parsed = urlsplit(value)
        host = parsed.hostname or ""
        return bool(parsed.scheme == "https" and not re.search(r"[\s\\]", value)
                    and not parsed.username and not parsed.password
                    and parsed.port in (None, 443) and "." in host
                    and not re.fullmatch(r"[\d.]+", host) and ":" not in host
                    and not re.search(r"(^localhost$|\.(local|internal|localhost)$)", host))
    except ValueError:
        return False


class Source(Strict):
    title: str = Field(max_length=120)
    url: str = Field(max_length=2048)

    @model_validator(mode="after")
    def safe_url(self):
        if not public_url(self.url):
            raise ValueError("use a public HTTPS website")
        return self


class Finding(Strict):
    id: ItemId
    title: str = Field(min_length=1, max_length=120)
    summary: str = Field(max_length=600)
    sources: list[Source] = Field(max_length=5)
    certainty: Literal["supported", "uncertain", "conflicting", "unavailable"]
    researchedAt: str | None = Field(default=None, max_length=40)


class Findings(Component):
    items: list[Finding] = Field(max_length=30)


class Link(Source):
    id: ItemId
    title: str = Field(min_length=1, max_length=120)
    purpose: str = Field(max_length=240)
    category: Literal["official", "transport", "attraction", "practical", "other"]


class Links(Component):
    items: list[Link] = Field(max_length=20)


COMPONENT_MODELS = {"essentials": Essentials, "map": MapComponent, "themes": Themes,
                    "flights": Travel, "accommodation": Travel, "findings": Findings,
                    "links": Links}


class CanvasSnapshot(Strict):
    version: Literal[1] = 1
    components: dict[str, dict] = Field(max_length=7)
    evidence: dict[ItemId, Annotated[str, Field(min_length=64, max_length=64, pattern=r"^[0-9a-f]{64}$")]] = Field(default_factory=dict, max_length=30)

    @model_validator(mode="after")
    def valid_components(self):
        if set(self.components) - set(COMPONENT_MODELS):
            raise ValueError("unknown component")
        for name, data in self.components.items():
            component = COMPONENT_MODELS[name].model_validate(data)
            # The renderer allows these fields to be omitted, never explicit null.
            if "error" in data and data["error"] is None:
                raise ValueError("component error must be text when present")
            optional_item_key = {"themes": "source", "findings": "researchedAt"}.get(name)
            if optional_item_key and any(optional_item_key in item and item[optional_item_key] is None
                                         for item in data.get("items", [])):
                raise ValueError("optional item field must be text when present")
            items = getattr(component, "items", getattr(component, "pins", []))
            if len({item.id for item in items}) != len(items):
                raise ValueError("duplicate item ids")
        serialized = json.dumps(self.model_dump(), ensure_ascii=False)
        try:
            size = len(serialized.encode("utf-8"))
        except UnicodeEncodeError:
            raise ValueError("canvas contains invalid Unicode") from None
        # PostgreSQL JSONB rejects null characters even when escaped in JSON.
        def contains_null(value):
            if isinstance(value, str):
                return "\x00" in value
            if isinstance(value, dict):
                return any(contains_null(key) or contains_null(item) for key, item in value.items())
            if isinstance(value, list):
                return any(contains_null(item) for item in value)
            return False
        if contains_null(self.components):
            raise ValueError("canvas contains null characters")
        if size > 65536:
            raise ValueError("canvas too large")
        return self


class CanvasMutation(Strict):
    snapshot: CanvasSnapshot | None
    context_revision: int = Field(ge=1)


class CanvasOutput(BaseModel):
    plan_id: UUID
    revision: int
    context_revision: int
    snapshot: CanvasSnapshot | None
    saved_at: str | None
    saved_context_revision: int | None


class CanvasChallengeOutput(BaseModel):
    challenge: str
    revision: int
    expires_in: int = 300


def _evidence_token(subject: str, plan_id: UUID | str, finding: dict) -> str | None:
    secret = os.environ.get("CANVAS_EVIDENCE_SIGNING_KEY", "")
    if len(secret) < 32:
        return None
    # Validate/canonicalize optional fields before signing to prevent representation drift.
    claim = Finding.model_validate(finding).model_dump(exclude_none=True)
    payload = json.dumps({"domain": "travella-canvas-evidence-v1", "subject": subject,
                          "plan_id": str(plan_id), "finding": claim}, sort_keys=True,
                         separators=(",", ":"), ensure_ascii=False).encode()
    return hmac.new(secret.encode(), payload, hashlib.sha256).hexdigest()


def issue_canvas_evidence(subject: str, plan_id: UUID | str, components: dict) -> dict[str, str]:
    """Server-only: call ONLY for findings already validated against observed sources."""
    evidence = {}
    for finding in components.get("findings", {}).get("items", []):
        token = _evidence_token(subject, plan_id, finding)
        if token and finding.get("certainty") in {"supported", "conflicting"}:
            evidence[finding["id"]] = token
    return evidence


class CanvasRepository:
    def __init__(self, plans):
        self.plans = plans
        self.session = plans.session

    def _active(self, subject, plan_id):
        plan = self.plans._locked_plan(subject, plan_id)
        if plan.lifecycle is not PlanLifecycle.ACTIVE:
            raise LifecycleProblem("not_found")
        return plan

    def read(self, subject, plan_id):
        plan = self._active(subject, plan_id)
        row = self.session.get(PlanningCanvas, plan_id)
        context = self.session.get(ResearchContext, plan_id)
        return {"plan_id": str(plan_id), "revision": plan.revision,
                "context_revision": context.revision if context else 1,
                "snapshot": row.payload if row else None,
                "saved_at": as_utc(row.updated_at).isoformat() if row else None,
                "saved_context_revision": row.context_revision if row else None}

    def _validate_evidence(self, subject, plan_id, snapshot):
        if snapshot is None:
            return
        for finding in snapshot.components.get("findings", {}).get("items", []):
            if finding["certainty"] not in {"supported", "conflicting"}:
                continue
            expected = _evidence_token(subject, plan_id, finding)
            supplied = snapshot.evidence.get(finding["id"], "")
            if not expected or not hmac.compare_digest(expected, supplied):
                raise LifecycleProblem("canvas_evidence_invalid")

    def _validate_consistency(self, snapshot, context_row):
        """Reject stale duplicated display facts without rewriting the reviewed draft."""
        if snapshot is None:
            return
        components = snapshot.components
        context = TripContext.model_validate(context_row.payload) if context_row else TripContext()
        essentials = components.get("essentials")
        dates = essentials["dates"] if essentials else {
            "start": context.dateStart, "end": context.dateEnd, "flexible": context.flexibleDates,
        }
        travelers = essentials["travelers"] if essentials else context.travelers
        map_data = components.get("map")
        destination = map_data["destination"] if map_data else context.finalDestination
        subtitle = f"{travelers} travelers" if travelers else "Travelers not set"
        detail = "Flexible dates" if dates["flexible"] else (
            " → ".join(value for value in (dates["start"], dates["end"]) if value) or "Dates not set"
        )
        for name, prefix in (("flights", "Flights to"), ("accommodation", "Stay in")):
            if name not in components:
                continue
            title = f"{prefix} {destination}" if destination else "Destination not set"
            card = components[name]
            if (card["title"], card["subtitle"], card["detail"]) != (title, subtitle, detail):
                raise LifecycleProblem("canvas_inconsistent")

    def challenge(self, subject, plan_id, request_id, revision, mutation):
        validate_request_id(request_id, self.plans.clock())
        self._active(subject, plan_id)
        self._validate_evidence(subject, plan_id, mutation.snapshot)
        context = self._context(subject, plan_id, mutation.context_revision)
        self._validate_consistency(mutation.snapshot, context)
        token = self.plans.issue_challenge(subject, plan_id, "canvas_save", revision,
                                          mutation.model_dump())
        return {"challenge": token, "revision": revision, "expires_in": 300}

    def _context(self, subject, plan_id, expected_revision):
        row = self.session.get(ResearchContext, plan_id)
        if row and row.active_event and row.lease_until and as_utc(row.lease_until) > self.plans.clock():
            raise LifecycleProblem("context_locked")
        if (row.revision if row else 1) != expected_revision:
            raise LifecycleProblem("revision_conflict")
        return row

    def save(self, subject, plan_id, request_id, revision, mutation, challenge):
        now = self.plans.clock()
        plan = self._active(subject, plan_id)
        payload = {"plan_id": str(plan_id), "revision": revision, **mutation.model_dump()}
        receipt = self.plans._receipt(subject, request_id, "canvas_save", payload)
        if receipt:
            return receipt.result_json
        validate_request_id(request_id, now)
        if plan.revision != revision:
            raise LifecycleProblem("revision_conflict")
        context = self._context(subject, plan_id, mutation.context_revision)
        self._validate_consistency(mutation.snapshot, context)
        self._validate_evidence(subject, plan_id, mutation.snapshot)
        if not challenge:
            raise LifecycleProblem("challenge_invalid")
        self.plans._consume_challenge(subject, plan_id, "canvas_save", revision,
                                      mutation.model_dump(), challenge)
        row = self.session.get(PlanningCanvas, plan_id)
        if mutation.snapshot is None:
            if row:
                self.session.delete(row)
            plan.last_working_view = WorkingView.CONVERSATION
        else:
            snapshot = mutation.snapshot.model_dump()
            if row:
                row.payload = snapshot
                row.updated_at = now
            else:
                row = PlanningCanvas(plan_id=plan_id, payload=snapshot, updated_at=now,
                                     context_revision=mutation.context_revision)
                self.session.add(row)
            # Map pins are canonical in this snapshot, committed with the same transaction.
            # They are places of interest, not destination candidates.
            # Essentials and need states are the same facts consumed by resumed chat.
            current = TripContext.model_validate(context.payload) if context else TripContext()
            data = current.model_dump()
            components = mutation.snapshot.components
            changed = {}
            if "essentials" in components:
                essentials = components["essentials"]
                changed.update(dateStart=essentials["dates"]["start"], dateEnd=essentials["dates"]["end"],
                               dateNote=essentials["dates"]["note"], flexibleDates=essentials["dates"]["flexible"],
                               travelers=essentials["travelers"], budget=essentials["budget"]["label"],
                               noFixedBudget=essentials["budget"]["noFixedBudget"])
            for name in ("flights", "accommodation"):
                if name in components:
                    changed[name] = components[name]["need"]
            if "map" in components:
                map_data = components["map"]
                changed["finalDestination"] = map_data["destination"] if map_data["final"] else ""
                destination = changed["finalDestination"]
                if destination and destination not in data["candidates"]:
                    matching = next((index for index, candidate in enumerate(data["candidates"])
                                     if candidate.casefold() == destination.casefold()), None)
                    if matching is not None:
                        # Preserve the exact reviewed spelling without creating a duplicate.
                        data["candidates"][matching] = destination
                    elif len(data["candidates"]) >= 20:
                        raise LifecycleProblem("canvas_destination_limit")
                    else:
                        data["candidates"].append(destination)
                    data["provenance"]["candidates"] = {"source": "user_edit", "updated_at": now.isoformat()}
                plan.destination_summary = changed["finalDestination"] or None
            for field, value in changed.items():
                if data[field] != value:
                    data[field] = value
                    data["provenance"][field] = {"source": "user_edit", "updated_at": now.isoformat()}
            try:
                data = TripContext.model_validate(data).model_dump()
            except ValidationError:
                raise LifecycleProblem("invalid_request") from None
            if data != current.model_dump():
                if context:
                    context.payload = data
                    context.revision += 1
                    context.updated_at = now
                else:
                    context = ResearchContext(plan_id=plan_id, payload=data, revision=2, updated_at=now)
                    self.session.add(context)
            row.context_revision = context.revision if context else 1
            plan.last_working_view = WorkingView.WORKSPACE
        plan.revision += 1
        plan.updated_at = now
        plan.last_activity_at = now
        self.session.flush()
        result = self.read(subject, plan_id)
        receipt = self.plans._success_receipt(subject, request_id, "canvas_save", payload, plan_id, now)
        receipt.result_json = result
        self.session.add(receipt)
        self.session.commit()
        return result
