"""Transactional research context writes and cross-process run leases."""
from datetime import timedelta

from sqlalchemy import select

from services.trip_context import ContextSnapshot, TripContext, apply_changes
from .contracts import LifecycleProblem
from .models import PlanLifecycle, ResearchContext
from .repository import as_utc, validate_request_id


class ResearchContextRepository:
    def __init__(self, plans):
        self.plans = plans
        self.session = plans.session

    def _row(self, subject, plan_id):
        plan = self.plans._locked_plan(subject, plan_id)
        if plan.lifecycle is not PlanLifecycle.ACTIVE:
            raise LifecycleProblem("not_found")
        row = self.session.get(ResearchContext, plan_id)
        if row is None:
            row = ResearchContext(plan_id=plan_id, payload=TripContext().model_dump(), revision=1,
                                  updated_at=self.plans.clock())
            self.session.add(row)
            self.session.flush()
        return row

    def _locked(self, row):
        return bool(row.active_event and row.lease_until and as_utc(row.lease_until) > self.plans.clock())

    def snapshot(self, subject, plan_id):
        # A read must never create a record or mutate a Plan.
        plan = self.plans.get(subject, plan_id)
        row = self.session.get(ResearchContext, plan_id)
        return ContextSnapshot(revision=row.revision if row else 1,
                               context=TripContext.model_validate(row.payload) if row else TripContext(),
                               locked=self._locked(row) if row else False)

    def _snapshot(self, row):
        return ContextSnapshot(revision=row.revision, context=TripContext.model_validate(row.payload), locked=self._locked(row))

    def edit(self, subject, plan_id, request_id, revision, changes):
        now = self.plans.clock()
        validate_request_id(request_id, now)
        row = self._row(subject, plan_id)
        payload = {"plan_id": str(plan_id), "revision": revision, "changes": [c.model_dump() for c in changes]}
        receipt = self.plans._receipt(subject, request_id, "research_context", payload)
        if receipt:
            return self._snapshot(row)
        if self._locked(row):
            raise LifecycleProblem("context_locked")
        if row.revision != revision:
            raise LifecycleProblem("revision_conflict")
        try:
            row.payload = apply_changes(TripContext.model_validate(row.payload), changes, now=now.isoformat(), user_edit=True).model_dump()
        except ValueError:
            raise LifecycleProblem("invalid_request") from None
        row.revision += 1
        row.updated_at = now
        self.session.add(self.plans._success_receipt(subject, request_id, "research_context", payload, plan_id, now))
        self.session.commit()
        return self._snapshot(row)

    def run(self, subject, plan_id, data):
        row = self._row(subject, plan_id)
        now = self.plans.clock()
        if data.action == "begin":
            # A durable receipt prevents a retried HTTP event from applying state twice.
            from .models import PlanActionReceipt
            receipt = self.session.scalar(select(PlanActionReceipt).where(
                PlanActionReceipt.traveler_subject == subject,
                PlanActionReceipt.request_id == data.event_id,
                PlanActionReceipt.operation == "research_run",
            ))
            if receipt:
                raise LifecycleProblem("request_reused")
            if self._locked(row):
                raise LifecycleProblem("context_locked")
            row.active_event = data.event_id
            row.lease_until = now + timedelta(minutes=10)
        elif data.action == "cancel":
            if row.active_event == data.event_id:
                row.active_event = None
                row.lease_until = None
        else:
            if not self._locked(row) or row.active_event != data.event_id or row.revision != data.revision:
                raise LifecycleProblem("revision_conflict")
            try:
                updated = apply_changes(TripContext.model_validate(row.payload), data.changes,
                                        now=now.isoformat(), message=data.message)
            except ValueError:
                raise LifecycleProblem("invalid_request") from None
            row.payload = updated.model_dump()
            if data.changes:
                row.revision += 1
            row.updated_at = now
            row.active_event = None
            row.lease_until = None
            payload = {"plan_id": str(plan_id), "event_id": data.event_id}
            self.session.add(self.plans._success_receipt(subject, data.event_id, "research_run", payload, plan_id, now))
            for role, content in (("user", data.message), ("assistant", data.assistant_text)):
                if content:
                    self.plans.append_conversation_message(subject, plan_id, f"{data.event_id}:{role}",
                                                           role, content, generation=data.generation,
                                                           commit=False)
        self.session.commit()
        return self._snapshot(row)
