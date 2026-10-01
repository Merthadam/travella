"""Transactional Plan lifecycle repository.

The repository is deliberately independent from the auth session store. Callers pass
the already verified traveler subject; the HTTP boundary is responsible for verifying
the token before invoking these methods.
"""

from __future__ import annotations

import hashlib
import json
import re
import secrets
import unicodedata
from datetime import datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy import and_, or_, select
from sqlalchemy.orm import Session, joinedload

from .contracts import BriefRef, ConversationRef, DestinationRef, LifecycleProblem, PlanRef
from .models import (
    Conversation,
    ConversationMessage,
    DestinationPin,
    Plan,
    PlanActionReceipt,
    PlanChallenge,
    PlanningBrief,
    PlanLifecycle,
    ReceiptStatus,
    TitleSource,
    WorkingView,
)

REQUEST_ID_RE = re.compile(r"^(\d{13})\.([0-9a-fA-F-]{36})$")
REQUEST_MAX_AGE = timedelta(minutes=5)
REQUEST_FUTURE_SKEW = timedelta(seconds=60)
RECEIPT_RETENTION = timedelta(days=30)
RECOVERY_PERIOD = timedelta(days=7)


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def as_utc(value: datetime) -> datetime:
    return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value


def normalize_title(value: str) -> str:
    normalized = unicodedata.normalize("NFC", value).strip()
    if (
        not normalized
        or len(normalized) > 120
        or any(unicodedata.category(ch) == "Cc" for ch in normalized)
    ):
        raise LifecycleProblem(
            "invalid_title", "Enter a valid plan name of 120 characters or fewer."
        )
    return normalized


def validate_request_id(request_id: str, now: datetime | None = None) -> None:
    match = REQUEST_ID_RE.fullmatch(request_id)
    if not match:
        raise LifecycleProblem("invalid_request", "Request could not be processed.")
    try:
        UUID(match.group(2))
    except ValueError as exc:
        raise LifecycleProblem("invalid_request", "Request could not be processed.") from exc
    issued = datetime.fromtimestamp(int(match.group(1)) / 1000, tz=timezone.utc)
    current = now or utc_now()
    if issued < current - REQUEST_MAX_AGE or issued > current + REQUEST_FUTURE_SKEW:
        raise LifecycleProblem("expired_request", "Request could not be processed.")


def payload_digest(payload: object) -> str:
    encoded = json.dumps(
        payload, sort_keys=True, separators=(",", ":"), ensure_ascii=False
    ).encode()
    return hashlib.sha256(encoded).hexdigest()


def _ref(plan: Plan) -> PlanRef:
    if plan.conversation is None:
        raise LifecycleProblem("inconsistent_plan", "Plan is temporarily unavailable.")
    return PlanRef(
        plan.id,
        plan.traveler_subject,
        plan.lifecycle,
        plan.revision,
        plan.title,
        plan.title_source,
        plan.destination_summary,
        plan.last_working_view,
        plan.last_activity_at,
        plan.recovery_deadline,
        ConversationRef(plan.conversation.id, plan.id),
    )


def _destination_ref(row: DestinationPin) -> DestinationRef:
    """Project PostgreSQL Decimal coordinates back to the public float contract."""
    return DestinationRef(
        row.id,
        row.plan_id,
        row.place_id,
        row.name,
        row.address,
        float(row.latitude),
        float(row.longitude),
        row.granularity,
    )


class PlanRepository:
    def __init__(self, session: Session, *, clock=utc_now) -> None:
        self.session = session
        self.clock = clock

    def _receipt(
        self, subject: str, request_id: str, operation: str, payload: object
    ) -> PlanActionReceipt | None:
        digest = payload_digest(payload)
        receipt = self.session.scalar(
            select(PlanActionReceipt).where(
                PlanActionReceipt.traveler_subject == subject,
                PlanActionReceipt.request_id == request_id,
            )
        )
        if receipt and receipt.payload_digest != digest:
            raise LifecycleProblem("request_reused", "Request could not be processed.")
        if receipt and receipt.operation != operation:
            raise LifecycleProblem("request_reused", "Request could not be processed.")
        return receipt

    def create(self, subject: str, request_id: str) -> PlanRef:
        now = self.clock()
        validate_request_id(request_id, now)
        payload = {"operation": "create"}
        existing = self._receipt(subject, request_id, "create", payload)
        if existing and existing.plan_id:
            plan = self.session.scalar(
                select(Plan)
                .options(joinedload(Plan.conversation))
                .where(Plan.id == existing.plan_id)
            )
            if plan and plan.traveler_subject == subject and plan.lifecycle is PlanLifecycle.ACTIVE:
                return _ref(plan)
            raise LifecycleProblem("plan_unavailable")
        plan = Plan(
            traveler_subject=subject,
            lifecycle=PlanLifecycle.ACTIVE,
            revision=1,
            title="Untitled plan",
            title_source=TitleSource.AUTOMATIC,
            last_working_view=WorkingView.CONVERSATION,
            last_activity_at=now,
            created_at=now,
            updated_at=now,
        )
        self.session.add(plan)
        self.session.flush()
        self.session.add(Conversation(plan_id=plan.id, created_at=now))
        self.session.flush()
        self.session.add(
            PlanActionReceipt(
                traveler_subject=subject,
                request_id=request_id,
                operation="create",
                payload_digest=payload_digest(payload),
                plan_id=plan.id,
                result_status=ReceiptStatus.SUCCEEDED,
                result_ref=str(plan.id),
                result_json={},
                created_at=now,
                expires_at=now + RECEIPT_RETENTION,
            )
        )
        self.session.commit()
        self.session.refresh(plan)
        return _ref(plan)

    def get(self, subject: str, plan_id: UUID, *, include_deleted: bool = False) -> PlanRef:
        plan = self.session.scalar(
            select(Plan)
            .options(joinedload(Plan.conversation))
            .where(Plan.id == plan_id, Plan.traveler_subject == subject)
        )
        if not plan or (plan.lifecycle is PlanLifecycle.DELETED and not include_deleted):
            raise LifecycleProblem("not_found")
        if plan.lifecycle is PlanLifecycle.DELETED and (
            not plan.recovery_deadline or as_utc(plan.recovery_deadline) <= self.clock()
        ):
            raise LifecycleProblem("gone", "This plan can no longer be restored.")
        return _ref(plan)

    def list(
        self,
        subject: str,
        *,
        deleted: bool = False,
        limit: int | None = None,
        after: tuple[datetime, UUID] | None = None,
    ) -> list[PlanRef]:
        lifecycle = PlanLifecycle.DELETED if deleted else PlanLifecycle.ACTIVE
        query = (
            select(Plan)
            .options(joinedload(Plan.conversation))
            .where(Plan.traveler_subject == subject, Plan.lifecycle == lifecycle)
        )
        if deleted:
            query = query.where(Plan.recovery_deadline > self.clock())
        if after:
            activity, plan_id = after
            query = query.where(
                or_(
                    Plan.last_activity_at < activity,
                    and_(Plan.last_activity_at == activity, Plan.id > plan_id),
                )
            )
        query = query.order_by(Plan.last_activity_at.desc(), Plan.id)
        if limit is not None:
            query = query.limit(limit)
        return [_ref(plan) for plan in self.session.scalars(query).all()]

    def record_activity(
        self, subject: str, plan_id: UUID, request_id: str, expected_revision: int | None = None
    ) -> PlanRef:
        now = self.clock()
        validate_request_id(request_id, now)
        payload = {"plan_id": str(plan_id), "operation": "activity", "revision": expected_revision}
        existing = self._receipt(subject, request_id, "activity", payload)
        if existing:
            return self.get(subject, plan_id)
        plan = self.session.scalar(
            select(Plan)
            .options(joinedload(Plan.conversation))
            .where(Plan.id == plan_id, Plan.traveler_subject == subject)
            .with_for_update(of=Plan)
        )
        if not plan or plan.lifecycle is not PlanLifecycle.ACTIVE:
            raise LifecycleProblem("not_found")
        if expected_revision is not None and plan.revision != expected_revision:
            raise LifecycleProblem("revision_conflict", "Plan changed. Refresh and try again.")
        plan.last_activity_at = now
        plan.updated_at = now
        plan.revision += 1
        self.session.add(
            PlanActionReceipt(
                traveler_subject=subject,
                request_id=request_id,
                operation="activity",
                payload_digest=payload_digest(payload),
                plan_id=plan.id,
                result_status=ReceiptStatus.SUCCEEDED,
                result_ref=str(plan.id),
                result_json={},
                created_at=now,
                expires_at=now + RECEIPT_RETENTION,
            )
        )
        self.session.commit()
        return _ref(plan)

    def issue_challenge(
        self,
        subject: str,
        plan_id: UUID,
        operation: str,
        expected_revision: int,
        change: object,
        *,
        ttl: timedelta = timedelta(minutes=5),
    ) -> str:
        now = self.clock()
        if operation not in {"rename", "delete", "restore"}:
            raise LifecycleProblem("invalid_request", "Request could not be processed.")
        plan = self._locked_plan(subject, plan_id)
        wanted = PlanLifecycle.DELETED if operation == "restore" else PlanLifecycle.ACTIVE
        if plan.lifecycle is not wanted:
            raise LifecycleProblem("not_found")
        if operation == "restore" and (
            not plan.recovery_deadline or as_utc(plan.recovery_deadline) <= now
        ):
            raise LifecycleProblem("gone", "This plan can no longer be restored.")
        if plan.revision != expected_revision:
            raise LifecycleProblem("revision_conflict", "Plan changed. Refresh and try again.")
        token = secrets.token_urlsafe(32)
        self.session.add(
            PlanChallenge(
                token_hash=hashlib.sha256(token.encode()).digest(),
                traveler_subject=subject,
                plan_id=plan_id,
                operation=operation,
                expected_revision=expected_revision,
                change_digest=payload_digest(change),
                expires_at=now + ttl,
            )
        )
        self.session.commit()
        return token

    def _consume_challenge(
        self,
        subject: str,
        plan_id: UUID,
        operation: str,
        expected_revision: int,
        change: object,
        token: str | None,
    ) -> None:
        if token is None:
            return
        now = self.clock()
        challenge = self.session.scalar(
            select(PlanChallenge)
            .where(
                PlanChallenge.token_hash == hashlib.sha256(token.encode()).digest(),
                PlanChallenge.traveler_subject == subject,
                PlanChallenge.plan_id == plan_id,
                PlanChallenge.operation == operation,
            )
            .with_for_update(of=PlanChallenge)
        )
        if (
            not challenge
            or challenge.consumed_at is not None
            or as_utc(challenge.expires_at) <= now
            or challenge.expected_revision != expected_revision
            or challenge.change_digest != payload_digest(change)
        ):
            raise LifecycleProblem("challenge_invalid", "Confirmation is no longer valid.")
        challenge.consumed_at = now

    def _locked_plan(self, subject: str, plan_id: UUID) -> Plan:
        plan = self.session.scalar(
            select(Plan)
            .options(joinedload(Plan.conversation))
            .where(Plan.id == plan_id, Plan.traveler_subject == subject)
            .with_for_update(of=Plan)
        )
        if not plan:
            raise LifecycleProblem("not_found")
        return plan

    def get_brief(self, subject: str, plan_id: UUID) -> BriefRef:
        plan = self.session.scalar(select(Plan).where(Plan.id == plan_id, Plan.traveler_subject == subject))
        if not plan or plan.lifecycle is not PlanLifecycle.ACTIVE:
            raise LifecycleProblem("plan_unavailable")
        row = self.session.scalar(select(PlanningBrief).where(PlanningBrief.plan_id == plan_id))
        payload = row.payload if row else {}
        return BriefRef(plan_id, payload, plan.revision)

    @staticmethod
    def _message_projection(row: ConversationMessage) -> dict:
        return {"message_id": str(row.id), "conversation_id": str(row.conversation_id), "event_id": row.event_id, "role": row.role, "content": row.content, "status": row.status, "generation": row.generation, "sequence": row.sequence, "created_at": as_utc(row.created_at).isoformat()}

    def append_conversation_message(self, subject: str, plan_id: UUID, event_id: str, role: str, content: str, *, generation: int = 0, status: str = "complete") -> dict:
        if role not in {"user", "assistant"} or not event_id or len(content) > 2000:
            raise LifecycleProblem("invalid_request", "Request could not be processed.")
        plan = self._locked_plan(subject, plan_id)
        if plan.lifecycle is not PlanLifecycle.ACTIVE or not plan.conversation:
            raise LifecycleProblem("not_found")
        existing = self.session.scalar(select(ConversationMessage).where(ConversationMessage.conversation_id == plan.conversation.id, ConversationMessage.event_id == event_id))
        if existing:
            return self._message_projection(existing)
        sequence = int(self.session.scalar(select(ConversationMessage.sequence).where(ConversationMessage.conversation_id == plan.conversation.id).order_by(ConversationMessage.sequence.desc()).limit(1)) or 0) + 1
        row = ConversationMessage(conversation_id=plan.conversation.id, event_id=event_id, role=role, content=content, generation=generation, status=status, sequence=sequence, created_at=self.clock())
        self.session.add(row)
        self.session.flush()
        self.session.commit()
        return self._message_projection(row)

    def conversation_messages(self, subject: str, plan_id: UUID, limit: int = 12) -> list[dict]:
        plan = self.session.scalar(select(Plan).where(Plan.id == plan_id, Plan.traveler_subject == subject))
        if not plan or plan.lifecycle is not PlanLifecycle.ACTIVE or not plan.conversation:
            raise LifecycleProblem("not_found")
        rows = self.session.scalars(select(ConversationMessage).where(ConversationMessage.conversation_id == plan.conversation.id).order_by(ConversationMessage.sequence.desc()).limit(max(1, min(limit, 50)))).all()
        return [self._message_projection(row) for row in reversed(rows)]

    def agent_context(self, subject: str, plan_id: UUID, limit: int = 12) -> dict:
        plan = self.session.scalar(select(Plan).options(joinedload(Plan.conversation)).where(Plan.id == plan_id, Plan.traveler_subject == subject))
        if not plan or plan.lifecycle is not PlanLifecycle.ACTIVE or not plan.conversation:
            raise LifecycleProblem("not_found")
        brief = self.session.scalar(select(PlanningBrief).where(PlanningBrief.plan_id == plan_id))
        payload = brief.payload if brief else {}
        provenance = brief.provenance if brief else {}
        inactive = brief.inactive if brief else {}
        brief_entries = {key: {"value": value, "origin": provenance.get(key, "traveler_stated"), "active": key not in inactive} for key, value in payload.items()}
        return {"plan_id": str(plan.id), "conversation_id": str(plan.conversation.id), "revision": plan.revision, "brief": brief_entries, "inactive": inactive, "messages": self.conversation_messages(subject, plan_id, limit)}

    def update_brief(self, subject: str, plan_id: UUID, request_id: str, expected_revision: int, data: dict) -> BriefRef:
        now = self.clock(); validate_request_id(request_id, now)
        payload = {"operation": "brief_update", "plan_id": str(plan_id), **data}
        existing = self._receipt(subject, request_id, "brief_update", payload)
        plan = self._locked_plan(subject, plan_id)
        if existing:
            return self.get_brief(subject, plan_id)
        if plan.lifecycle is not PlanLifecycle.ACTIVE or plan.revision != expected_revision:
            raise LifecycleProblem("revision_conflict")
        row = self.session.scalar(select(PlanningBrief).where(PlanningBrief.plan_id == plan_id))
        if row:
            row.payload = dict(data); row.provenance = {key: "traveler_stated" for key in data}; row.inactive = {}; row.updated_at = now
        else:
            self.session.add(PlanningBrief(plan_id=plan_id, payload=dict(data), provenance={key: "traveler_stated" for key in data}, inactive={}, updated_at=now))
        plan.revision += 1; plan.last_activity_at = now; plan.updated_at = now
        self.session.add(self._success_receipt(subject, request_id, "brief_update", payload, plan_id, now))
        self.session.commit()
        return BriefRef(plan_id, data, plan.revision)

    def destinations(self, subject: str, plan_id: UUID) -> list[DestinationRef]:
        plan = self.session.scalar(select(Plan).where(Plan.id == plan_id, Plan.traveler_subject == subject))
        if not plan or plan.lifecycle is not PlanLifecycle.ACTIVE:
            raise LifecycleProblem("plan_unavailable")
        rows = self.session.scalars(
            select(DestinationPin).where(DestinationPin.plan_id == plan_id).order_by(DestinationPin.created_at, DestinationPin.id)
        ).all()
        return [_destination_ref(row) for row in rows]

    def add_destination(self, subject: str, plan_id: UUID, request_id: str, expected_revision: int, data: dict) -> tuple[DestinationRef, int]:
        now = self.clock()
        validate_request_id(request_id, now)
        payload = {"operation": "destination_add", "plan_id": str(plan_id), **data}
        existing = self._receipt(subject, request_id, "destination_add", payload)
        if existing and existing.result_ref:
            row = self.session.get(DestinationPin, UUID(existing.result_ref))
            plan = self._locked_plan(subject, plan_id)
            if row: return _destination_ref(row), plan.revision
            raise LifecycleProblem("plan_unavailable")
        plan = self._locked_plan(subject, plan_id)
        if plan.revision != expected_revision:
            raise LifecycleProblem("revision_conflict")
        duplicate = self.session.scalar(select(DestinationPin).where(DestinationPin.plan_id == plan_id, DestinationPin.place_id == data["place_id"]))
        if duplicate:
            return _destination_ref(duplicate), plan.revision
        row = DestinationPin(plan_id=plan_id, place_id=data["place_id"], name=data["name"], address=data["address"], latitude=data["latitude"], longitude=data["longitude"], granularity=data["granularity"], created_at=now)
        self.session.add(row)
        plan.revision += 1; plan.last_activity_at = now; plan.updated_at = now
        self.session.add(self._success_receipt(subject, request_id, "destination_add", payload, plan_id, now, result_ref=row.id))
        self.session.flush()
        self.session.commit()
        return _destination_ref(row), plan.revision

    def remove_destination(self, subject: str, plan_id: UUID, destination_id: UUID, request_id: str, expected_revision: int) -> int:
        now = self.clock(); validate_request_id(request_id, now)
        payload = {"operation": "destination_remove", "plan_id": str(plan_id), "destination_id": str(destination_id)}
        existing = self._receipt(subject, request_id, "destination_remove", payload)
        plan = self._locked_plan(subject, plan_id)
        if existing: return plan.revision
        if plan.revision != expected_revision: raise LifecycleProblem("revision_conflict")
        row = self.session.scalar(select(DestinationPin).where(DestinationPin.id == destination_id, DestinationPin.plan_id == plan_id))
        if not row: raise LifecycleProblem("plan_unavailable")
        self.session.delete(row); plan.revision += 1; plan.last_activity_at = now; plan.updated_at = now
        self.session.add(self._success_receipt(subject, request_id, "destination_remove", payload, destination_id, now))
        self.session.commit()
        return plan.revision

    def rename(
        self,
        subject: str,
        plan_id: UUID,
        request_id: str,
        expected_revision: int,
        title: str,
        *,
        challenge: str | None = None,
    ) -> PlanRef:
        now = self.clock()
        validate_request_id(request_id, now)
        title = normalize_title(title)
        payload = {
            "plan_id": str(plan_id),
            "operation": "rename",
            "title": title,
            "revision": expected_revision,
        }
        existing = self._receipt(subject, request_id, "rename", payload)
        if existing:
            return self.get(subject, plan_id, include_deleted=True)
        plan = self._locked_plan(subject, plan_id)
        if plan.lifecycle is not PlanLifecycle.ACTIVE:
            raise LifecycleProblem("not_found")
        if plan.revision != expected_revision:
            raise LifecycleProblem("revision_conflict", "Plan changed. Refresh and try again.")
        self._consume_challenge(
            subject, plan_id, "rename", expected_revision, {"title": title}, challenge
        )
        plan.title = title
        plan.title_source = TitleSource.MANUAL
        plan.revision += 1
        plan.updated_at = now
        self.session.add(
            self._success_receipt(subject, request_id, "rename", payload, plan.id, now)
        )
        self.session.commit()
        return _ref(plan)

    def delete(
        self,
        subject: str,
        plan_id: UUID,
        request_id: str,
        expected_revision: int,
        *,
        challenge: str | None = None,
    ) -> PlanRef:
        now = self.clock()
        validate_request_id(request_id, now)
        payload = {"plan_id": str(plan_id), "operation": "delete", "revision": expected_revision}
        existing = self._receipt(subject, request_id, "delete", payload)
        if existing:
            return self.get(subject, plan_id, include_deleted=True)
        plan = self._locked_plan(subject, plan_id)
        if plan.lifecycle is not PlanLifecycle.ACTIVE:
            raise LifecycleProblem("not_found")
        if plan.revision != expected_revision:
            raise LifecycleProblem("revision_conflict", "Plan changed. Refresh and try again.")
        self._consume_challenge(subject, plan_id, "delete", expected_revision, {}, challenge)
        plan.lifecycle = PlanLifecycle.DELETED
        plan.deleted_at = now
        plan.recovery_deadline = now + RECOVERY_PERIOD
        plan.revision += 1
        plan.updated_at = now
        self.session.add(
            self._success_receipt(subject, request_id, "delete", payload, plan.id, now)
        )
        self.session.commit()
        return _ref(plan)

    def restore(
        self,
        subject: str,
        plan_id: UUID,
        request_id: str,
        *,
        challenge: str | None = None,
        expected_revision: int | None = None,
    ) -> PlanRef:
        now = self.clock()
        validate_request_id(request_id, now)
        payload = {"plan_id": str(plan_id), "operation": "restore", "revision": expected_revision}
        existing = self._receipt(subject, request_id, "restore", payload)
        if existing:
            return self.get(subject, plan_id, include_deleted=True)
        plan = self._locked_plan(subject, plan_id)
        if plan.lifecycle is not PlanLifecycle.DELETED:
            raise LifecycleProblem("not_deleted")
        if not plan.recovery_deadline or as_utc(plan.recovery_deadline) <= now:
            raise LifecycleProblem("gone", "This plan can no longer be restored.")
        if expected_revision is not None and plan.revision != expected_revision:
            raise LifecycleProblem("revision_conflict", "Plan changed. Refresh and try again.")
        self._consume_challenge(subject, plan_id, "restore", plan.revision, {}, challenge)
        plan.lifecycle = PlanLifecycle.ACTIVE
        plan.deleted_at = None
        plan.recovery_deadline = None
        plan.last_activity_at = now
        plan.updated_at = now
        plan.revision += 1
        self.session.add(
            self._success_receipt(subject, request_id, "restore", payload, plan.id, now)
        )
        self.session.commit()
        return _ref(plan)

    def purge_expired(self) -> int:
        now = self.clock()
        plans = self.session.scalars(
            select(Plan)
            .where(
                Plan.lifecycle == PlanLifecycle.DELETED,
                Plan.recovery_deadline <= now,
            )
            .with_for_update(of=Plan)
        ).all()
        count = len(plans)
        for plan in plans:
            self.session.delete(plan)
        self.session.commit()
        return count

    @staticmethod
    def _success_receipt(
        subject: str,
        request_id: str,
        operation: str,
        payload: object,
        plan_id: UUID,
        now: datetime,
        result_ref: UUID | None = None,
    ) -> PlanActionReceipt:
        return PlanActionReceipt(
            traveler_subject=subject,
            request_id=request_id,
            operation=operation,
            payload_digest=payload_digest(payload),
            plan_id=plan_id,
            result_status=ReceiptStatus.SUCCEEDED,
            result_ref=str(result_ref or plan_id),
            result_json={},
            created_at=now,
            expires_at=now + RECEIPT_RETENTION,
        )
