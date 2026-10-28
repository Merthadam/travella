"""Bounded temporary view operations over authorized, observed travel results."""
import json
from decimal import Decimal
from typing import Literal

from pydantic import Field, model_validator

from services.travel_topics import Strict, TravelReference, WorkspaceView
from .travel_registry import travel_registry


class WorkspaceFilters(Strict):
    budget: str | None = Field(default=None, max_length=16, pattern=r"^(?:\d+(?:\.\d+)?)?$")
    refundable: bool | None = Field(default=None, strict=True)
    direct: bool | None = Field(default=None, strict=True)
    bag: bool | None = Field(default=None, strict=True)
    stars: Literal["", "3", "4", "5"] | None = None
    rating: Literal["", "7", "8", "9"] | None = None
    airline: str | None = Field(default=None, max_length=240)


class WorkspaceOperation(Strict):
    search_id: str = Field(min_length=1, max_length=100)
    operation: Literal["filter", "sort", "dismiss", "restore", "compare"]
    filters: WorkspaceFilters | None = None
    sort: Literal["provider", "price", "quality"] | None = None
    references: list[TravelReference] | None = Field(default=None, max_length=3)

    @model_validator(mode="after")
    def operation_fields(self):
        if self.operation == "filter":
            if self.filters is None or self.sort is not None or self.references is not None:
                raise ValueError("Use filters only for a filter operation")
        elif self.operation == "sort":
            if self.sort is None or self.filters is not None or self.references is not None:
                raise ValueError("Use sort only for a sort operation")
        elif self.references is None or self.filters is not None or self.sort is not None or (self.operation != "compare" and not self.references):
            raise ValueError("Use exact references for this operation")
        return self


def visible_workspace_options(snapshot, view):
    """Manual parity: exclude known violations, retain unknowns with a count."""
    visible, unknown_ids = [], []
    for item in snapshot.results:
        if item.id in view.dismissed_ids:
            continue
        checks = []
        if view.budget:
            checks.append(None if item.price.amount is None else Decimal(item.price.amount) <= Decimal(view.budget))
        if snapshot.mode == "stays":
            if view.stars:
                checks.append(None if item.stars is None else item.stars >= int(view.stars))
            if view.rating:
                checks.append(None if item.review_score is None else item.review_score >= int(view.rating))
            if view.refundable:
                checks.append(True if any(r.refundable is True for r in item.rooms) else None if not item.rooms or any(r.refundable is None for r in item.rooms) else False)
        else:
            if view.refundable:
                checks.append(item.refundable)
            if view.bag:
                checks.append(item.cabin_bag_included)
            if view.direct:
                stops = [item.outbound.stops, item.inbound.stops]
                checks.append(False if any(s is not None and s > 0 for s in stops) else None if None in stops else True)
            if view.airline:
                checks.append(view.airline in item.airlines if item.airlines else None)
        if False in checks:
            continue
        visible.append(item)
        if None in checks:
            unknown_ids.append(item.id)
    if view.sort != "provider":
        def metric(item):
            if view.sort == "price":
                return Decimal(item.price.amount) if item.price.amount is not None else Decimal("Infinity")
            if snapshot.mode == "stays":
                return -item.review_score if item.review_score is not None else float("inf")
            duration = [item.outbound.duration_minutes, item.inbound.duration_minutes]
            return sum(duration) if None not in duration else float("inf")
        visible.sort(key=metric)
    return visible, unknown_ids


class WorkspaceSession:
    """One worker-owned view. Public inputs cannot introduce evidence or scope."""
    def __init__(self, subject, plan_id, topic, context):
        self.subject, self.plan_id, self.topic = subject, str(plan_id), topic
        self.dirty = bool(context.get("draft_dirty"))
        self.search_id = context.get("search_id")
        self.view = WorkspaceView.model_validate(context["view"])
        self.view.validate_topic(topic)
        self.operations = 0
        self.changed = False
        if self.search_id:
            self.current(self.search_id)

    def current(self, search_id):
        if search_id != self.search_id:
            raise ValueError("workspace_search_changed")
        snapshot = travel_registry.get(self.subject, self.plan_id, search_id, self.topic)
        self.view.validate_members(snapshot)
        return snapshot

    def observed(self, snapshot):
        if snapshot.plan_id != self.plan_id or snapshot.mode != self.topic:
            raise ValueError("workspace_scope_mismatch")
        travel_registry.put(self.subject, self.plan_id, snapshot)
        if self.search_id != snapshot.search_id:
            self.view = WorkspaceView()
        self.search_id = snapshot.search_id
        self.changed = True


def apply_workspace_view(session, arguments):
    session.operations += 1
    if session.operations > 12:
        raise ValueError("workspace_action_limit")
    if session.dirty:
        raise ValueError("workspace_pending_edits")
    op = WorkspaceOperation.model_validate(arguments)
    snapshot = session.current(op.search_id)
    candidate = session.view.model_dump()
    if op.operation == "filter":
        candidate.update(op.filters.model_dump(exclude_none=True))
    elif op.operation == "sort":
        candidate["sort"] = op.sort
    else:
        # Validate exact search/option/room parents even for restore and compare-clear.
        WorkspaceView(comparison_refs=op.references).validate_members(snapshot)
        ids = [r.option_id for r in op.references]
        if op.operation == "dismiss":
            candidate["dismissed_ids"] = list(dict.fromkeys(candidate["dismissed_ids"] + ids))
        elif op.operation == "restore":
            candidate["dismissed_ids"] = [i for i in candidate["dismissed_ids"] if i not in ids]
        else:
            candidate["comparison_refs"] = [r.model_dump() for r in op.references]
    candidate["page"] = 1
    view = WorkspaceView.model_validate(candidate)
    view.validate_topic(session.topic)
    view.validate_members(snapshot)
    changed = view != session.view
    session.view = view
    session.changed = True
    visible, unknown = visible_workspace_options(snapshot, view)
    return {"search_id": snapshot.search_id, "operation": op.operation, "changed": changed,
            "visible_count": len(visible), "total_count": len(snapshot.results), "unknown_count": len(unknown),
            "notice": "Unknown matches remain visible; no saved choices changed."}


def finalize_workspace_view(session):
    if session is None or session.dirty or not session.changed or not session.search_id:
        return None
    session.current(session.search_id)
    return {"search_id": session.search_id, "view": session.view.model_dump()}


def workspace_comparison_evidence(session):
    """Ordered exact references, with bounded facts and no implied room choice."""
    if not session or not session.search_id:
        return []
    snapshot = session.current(session.search_id)
    evidence = []
    for ref in session.view.comparison_refs:
        option = next(item for item in snapshot.results if item.id == ref.option_id)
        raw = option.model_dump(mode="json")
        if snapshot.mode == "stays":
            facts = {key: raw[key] for key in ("id", "hotel_id", "name", "stars", "review_score")}
            room = next((item for item in option.rooms if item.id == ref.room_id), None)
            rate = room.model_dump(mode="json", exclude={"excluded_taxes"}) if room else None
            if rate is not None:
                rate["excluded_taxes_omitted"] = len(room.excluded_taxes)
        else:
            facts = {key: raw[key] for key in ("id", "baggage_summary", "cabin_bag_included", "refundable", "cancellation_summary")}
            facts["price"] = {key: raw["price"][key] for key in ("amount", "currency", "basis", "estimated")}
            for leg in ("outbound", "inbound"):
                facts[leg] = {key: raw[leg][key] for key in ("stops", "duration_minutes")}
            rate = None
        evidence.append({"reference": ref.model_dump(), "observed_at": snapshot.searched_at,
                         "option": facts, "room": rate,
                         "detail_notice": "Bounded evidence; inspect for omitted facilities, segments and taxes. A null room is not a selected rate."})
    if len(json.dumps(evidence, ensure_ascii=False).encode()) > 12288:
        # Preserve exact identity and ordinal authority; never silently truncate
        # cancellation/occupancy text into a different factual claim.
        return [{"reference": item["reference"], "observed_at": item["observed_at"],
                 "option": {"id": item["option"]["id"]}, "room": {"id": item["room"]["id"]} if item["room"] else None,
                 "evidence_omitted": True, "detail_notice": "Inspect exact references; detailed comparison evidence exceeded the input budget."}
                for item in evidence]
    return evidence
