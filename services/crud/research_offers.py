"""Research invitation policy, review receipts and persistence under the Plan lock."""
import hashlib
import json
import re
from datetime import timedelta
from uuid import uuid4

from sqlalchemy import select

from services.research_offers import (
    ResearchOffer,
    ResearchReadiness,
    assess_research_readiness,
    explicit_draft_request,
    normalized_priorities,
    priority_conflict,
    priority_evidence,
)
from services.trip_context import ContextSnapshot, flight_need_confirmed

from .contracts import LifecycleProblem
from .models import (
    ConversationMessage,
    PlanActionReceipt,
    PlanningBrief,
    PlanningCanvas,
    ResearchContext,
    ResearchDraftOffer,
)
from .repository import as_utc, validate_request_id
from .research_context import ResearchContextRepository


class ResearchOfferSnapshot(ContextSnapshot):
    readiness: ResearchReadiness
    deferred: bool = False
    offer: ResearchOffer | None = None
    research_entry_receipt: str | None = None


class ResearchOfferRepository:
    def __init__(self, plans):
        self.plans, self.session = plans, plans.session

    def _latest(self, plan_id):
        return self.session.scalar(select(ResearchDraftOffer).where(
            ResearchDraftOffer.plan_id == plan_id).order_by(ResearchDraftOffer.sequence.desc()).limit(1))

    def _priorities(self, subject, plan_id, context):
        plan = self.plans.get(subject, plan_id)
        # Bound database work; only completed traveler messages from this Plan qualify.
        messages = self.session.scalars(select(ConversationMessage).where(
            ConversationMessage.conversation_id == plan.conversation.conversation_id,
            ConversationMessage.role == "user", ConversationMessage.status == "complete",
        ).order_by(ConversationMessage.sequence.desc()).limit(500)).all()
        research = self.session.get(ResearchContext, plan_id)
        cutoff = as_utc(research.priorities_since) if research and research.priorities_since else None
        evidence = []
        meanings = set()
        conflict_at = None
        for message in messages:
            # Context from a superseded destination must not establish readiness.
            if cutoff and as_utc(message.created_at) < cutoff:
                continue
            priorities = normalized_priorities(message.content)
            if priorities:
                evidence.append(str(message.id))
                meanings.update(priorities)
            elif priority_conflict(message.content):
                # A later contradiction invalidates older conversational preferences.
                conflict_at = as_utc(message.created_at)
                break
        brief = self.session.scalar(select(PlanningBrief).where(PlanningBrief.plan_id == plan_id))
        if brief and (not cutoff or as_utc(brief.updated_at) >= cutoff) and (not conflict_at or as_utc(brief.updated_at) > conflict_at) and "interests" not in (brief.inactive or {}) and brief.provenance.get("interests") in {"traveler_stated", "user_edit", "user_explicit"}:
            priorities = normalized_priorities(str(brief.payload.get("interests", "")), stated_field=True)
            if priorities:
                evidence.append("brief:" + hashlib.sha256(str(brief.payload["interests"]).encode()).hexdigest())
                meanings.update(priorities)
        return evidence, sorted(meanings)

    def _state(self, subject, plan_id):
        snapshot = ResearchContextRepository(self.plans).snapshot(subject, plan_id)
        snapshot.research_entry_required = self._entry_required(subject, plan_id)
        priorities, meanings = self._priorities(subject, plan_id, snapshot.context)
        readiness = assess_research_readiness(snapshot.context, has_priorities=bool(priorities), locked=snapshot.locked)
        # Optional budget/flight edits stale review via revision, not invitation identity.
        ctx = snapshot.context
        identity = [ctx.finalDestination, ctx.dateStart, ctx.dateEnd, ctx.flexibleDates, ctx.travelers, meanings]
        fingerprint = hashlib.sha256(json.dumps(identity, sort_keys=True).encode()).hexdigest()
        return snapshot, readiness, fingerprint, priorities

    @staticmethod
    def project(row, snapshot, fingerprint=None):
        if row is None:
            return None
        status = row.status
        if status in {"available", "review"} and (row.revision != snapshot.revision or
                (fingerprint is not None and row.fingerprint != fingerprint)):
            status = "superseded"
        return ResearchOffer(id=str(row.id), status=status, revision=row.revision, message_id=row.message_id)

    def snapshot(self, subject, plan_id):
        snapshot, readiness, fingerprint, _ = self._state(subject, plan_id)
        latest = self._latest(plan_id)
        return ResearchOfferSnapshot(**snapshot.model_dump(), readiness=readiness,
            deferred=bool(latest and latest.deferred), offer=self.project(latest, snapshot, fingerprint))

    def decorate(self, subject, plan_id, snapshot):
        public = self.snapshot(subject, plan_id)
        snapshot.research_offer = public.offer
        snapshot.research_readiness = public.readiness
        snapshot.research_deferred = public.deferred
        snapshot.research_entry_required = public.research_entry_required
        return snapshot

    def _entry_required(self, subject, plan_id):
        if self.session.get(PlanningCanvas, plan_id) is not None:
            return False
        receipts = self.session.scalars(select(PlanActionReceipt).where(
            PlanActionReceipt.plan_id == plan_id, PlanActionReceipt.traveler_subject == subject,
            PlanActionReceipt.operation == "research_offer_action"))
        # Once the traveler has entered a draft, existing explicit regeneration
        # controls remain available across edits (including changed flight needs).
        # This classification is separate from a receipt's exact-revision check.
        return not any(receipt.result_json.get("accepted_request_id") for receipt in receipts)

    def _new(self, plan_id, snapshot, fingerprint, *, status, deferred, event_id=None, message_id=None):
        previous = self._latest(plan_id)
        if previous and previous.status in {"available", "review"}:
            previous.status = "superseded"
        row = ResearchDraftOffer(plan_id=plan_id, revision=snapshot.revision,
            fingerprint=fingerprint, status=status, deferred=deferred,
            event_id=event_id, message_id=message_id,
            sequence=previous.sequence + 1 if previous else 1, created_at=self.plans.clock())
        self.session.add(row)
        self.session.flush()
        return row

    def action(self, subject, plan_id, request_id, revision, data):
        now = self.plans.clock()
        validate_request_id(request_id, now)
        self.plans._locked_plan(subject, plan_id)
        snapshot, readiness, fingerprint, _ = self._state(subject, plan_id)
        payload = {"plan_id": str(plan_id), "revision": revision, **data.model_dump()}
        prior = self.plans._receipt(subject, request_id, "research_offer_action", payload)
        if prior:
            return ResearchOfferSnapshot.model_validate(prior.result_json["snapshot"])
        if snapshot.locked:
            raise LifecycleProblem("context_locked")
        if snapshot.revision != revision:
            raise LifecycleProblem("revision_conflict")
        row = self._latest(plan_id)
        if data.offer_id and (not row or str(row.id) != data.offer_id):
            raise LifecycleProblem("challenge_invalid")
        receipt_token = None
        if data.action == "defer":
            if row:
                row.deferred, row.status = True, "deferred"
            else:
                row = self._new(plan_id, snapshot, fingerprint, status="deferred", deferred=True)
        elif data.action == "request_review":
            if not readiness.eligible:
                raise LifecycleProblem("research_not_ready")
            if row and row.status in {"available", "review"} and row.revision == revision and row.fingerprint == fingerprint:
                row.status = "review"
            else:
                row = self._new(plan_id, snapshot, fingerprint, status="review", deferred=bool(row and row.deferred))
        else:
            if not readiness.eligible or not flight_need_confirmed(snapshot.context):
                raise LifecycleProblem("research_not_ready")
            if not data.offer_id or not row or row.status != "review" or row.revision != revision or row.fingerprint != fingerprint:
                raise LifecycleProblem("challenge_invalid")
            receipt_token = str(uuid4())
        result = ResearchOfferSnapshot(**snapshot.model_dump(), readiness=readiness,
            deferred=row.deferred, offer=self.project(row, snapshot, fingerprint), research_entry_receipt=receipt_token)
        receipt = self.plans._success_receipt(subject, request_id, "research_offer_action", payload, plan_id, now)
        receipt.result_json = {"snapshot": result.model_dump(), "fingerprint": fingerprint}
        if receipt_token:
            receipt.result_ref = receipt_token
            receipt.expires_at = now + timedelta(minutes=5)
        self.session.add(receipt)
        self.session.commit()
        return result

    def consume(self, subject, plan_id, data):
        self.plans._locked_plan(subject, plan_id)
        snapshot, readiness, fingerprint, _ = self._state(subject, plan_id)
        receipt = self.session.scalar(select(PlanActionReceipt).where(
            PlanActionReceipt.traveler_subject == subject, PlanActionReceipt.plan_id == plan_id,
            PlanActionReceipt.operation == "research_offer_action", PlanActionReceipt.result_ref == data.receipt))
        if not receipt or as_utc(receipt.expires_at) <= self.plans.clock():
            raise LifecycleProblem("challenge_invalid")
        result = receipt.result_json
        confirmed = result.get("snapshot", {})
        if snapshot.revision != data.revision or confirmed.get("revision") != data.revision or result.get("fingerprint") != fingerprint:
            raise LifecycleProblem("revision_conflict")
        accepted = result.get("accepted_request_id")
        if accepted:
            if accepted != data.request_id:
                raise LifecycleProblem("request_reused")
            return {"accepted": True, "request_id": accepted, "revision": data.revision, "replayed": True}
        context_row = self.session.get(ResearchContext, plan_id)
        if not snapshot.locked or not context_row or context_row.active_event != data.request_id:
            raise LifecycleProblem("context_locked")
        if any(reason != "context_locked" for reason in readiness.reasons) or not flight_need_confirmed(snapshot.context):
            raise LifecycleProblem("research_not_ready")
        row = self._latest(plan_id)
        if not row or str(row.id) != confirmed.get("offer", {}).get("id") or row.status != "review":
            raise LifecycleProblem("challenge_invalid")
        row.status = "consumed"
        receipt.result_json = {**result, "accepted_request_id": data.request_id}
        self.session.commit()
        return {"accepted": True, "request_id": data.request_id, "revision": data.revision, "replayed": False}

    def complete(self, subject, plan_id, data, assistant_message_id):
        proposal = data.draft_offer
        if proposal is None or not assistant_message_id:
            return
        snapshot, readiness, fingerprint, priorities = self._state(subject, plan_id)
        current = self._latest(plan_id)
        quote = proposal.source_quote.strip().casefold()
        explicit = bool(quote and quote in data.message.casefold())
        if proposal.intent == "defer":
            if explicit and re.search(r"\b(keep researching|continue researching|not yet|later|don't.*draft|do not.*draft)\b", quote):
                self._new(plan_id, snapshot, fingerprint, status="deferred", deferred=True,
                          event_id=data.event_id, message_id=assistant_message_id)
            return
        requested = proposal.intent == "request_review"
        if requested and not (explicit and explicit_draft_request(data.message) and re.search(r"\b(draft|itinerary)\b", quote) and
                re.search(r"\b(create|make|generate|review|ready|let's|lets)\b", quote) and
                not re.search(r"\b(not|don't|later)\b", quote)):
            return
        if not readiness.eligible or (current and current.deferred and not requested):
            return
        refs = set(proposal.priority_message_ids)
        # Advisory references must belong to the authorized evidence; 'current' is
        # validated against this turn's actual traveler message, never model prose.
        if refs - set(priorities) - {"current"} or ("current" in refs and not priority_evidence(data.message)):
            return
        if current and current.fingerprint == fingerprint and not requested:
            return
        self._new(plan_id, snapshot, fingerprint, status="available", deferred=False,
                  event_id=data.event_id, message_id=assistant_message_id)
