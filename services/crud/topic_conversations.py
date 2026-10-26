"""Topic research is advisory; only reviewed choices change durable Plan decisions."""
import hmac
import json
from datetime import timedelta
from uuid import UUID, uuid4

from sqlalchemy import select

from services.travel_topics import TopicNotes, digest, issue_comparison_proof
from services.trip_context import TripContext
from .contracts import LifecycleProblem
from .models import ConversationMessage, PlanActionReceipt, PlanLifecycle, PlanningCanvas, TravelTopicRun, TravelTopicState
from .research_context import ResearchContextRepository
from .repository import validate_request_id


class TopicRepository:
    def __init__(self, plans):
        self.plans, self.session = plans, plans.session
        self.contexts = ResearchContextRepository(plans)

    def _active(self, subject, plan_id):
        plan = self.plans._locked_plan(subject, plan_id)
        if plan.lifecycle is not PlanLifecycle.ACTIVE:
            raise LifecycleProblem("not_found")
        return plan

    def _state(self, plan_id, topic):
        row = self.session.get(TravelTopicState, (plan_id, topic))
        return dict(row.payload) if row else {}

    def _save(self, plan_id, topic, payload):
        row = self.session.get(TravelTopicState, (plan_id, topic))
        if row:
            row.payload = payload
        else:
            self.session.add(TravelTopicState(plan_id=plan_id, topic=topic, payload=payload))

    def brief(self, subject, plan_id):
        plan = self._active(subject, plan_id)
        snapshot = self.contexts.snapshot(subject, plan_id)
        context = snapshot.context
        canvas = self.session.get(PlanningCanvas, plan_id)
        components = canvas.payload.get("components", {}) if canvas else {}
        pins = components.get("map", {}).get("pins", [])
        selected = [{k: p[k] for k in ("id", "name", "category", "position") if k in p} for p in pins[:10]]
        facts = {"destination": context.finalDestination,
                 "dates": {"start": context.dateStart, "end": context.dateEnd, "flexible": context.flexibleDates},
                 "travelers": context.travelers, "budget": context.budget, "no_fixed_budget": context.noFixedBudget,
                 "date_note": context.dateNote, "flights_need": context.flights, "stays_need": context.accommodation,
                 "themes": [{"text": t["text"], "kind": t["kind"], "source": t.get("source", "saved_canvas")}
                            for t in components.get("themes", {}).get("items", [])[:10]],
                 "selected_places": selected, "omitted_places": max(0, len(pins)-10)}
        # Digest every saved relevant place, including the omitted tail, but keep the
        # projected context small. Unknown Google payload fields are never included.
        facts_digest = digest({**facts, "all_selected_places": [{k: p.get(k) for k in ("id", "name", "category", "position")} for p in pins]})
        choices = []
        for topic in ("stays", "flights"):
            state = self._state(plan_id, topic)
            preferred = next((x for x in state.get("shortlist", []) if x["id"] == state.get("preferred_id")), None)
            if preferred:
                criteria = {key: value[:160] if isinstance(value, str) else value
                            for key, value in preferred.get("criteria", {}).items()
                            if key in {"destination", "origin", "check_in", "check_out", "departure_date", "return_date",
                                       "adults", "children", "travelers", "currency", "cabin", "refundable", "property_type"}}
                choices.append({"topic": topic, "title": preferred["title"], "summary": preferred["summary"][:240],
                                "criteria": criteria, "facts": [fact[:160] for fact in preferred.get("facts", [])[:4]],
                                "observed_at": preferred.get("observed_at"), "source": "traveler_confirmed_choice",
                                "needs_review": preferred["facts_digest"] != facts_digest, "unbooked": True})
        brief = {**facts, "facts_digest": facts_digest, "accepted_choices": choices,
                 "plan_revision": plan.revision, "context_revision": snapshot.revision,
                 "source": "saved_trip", "provenance": {key: value.model_dump() for key, value in context.provenance.items()}}
        # Revisions are provenance; only meaningful trip content invalidates research.
        brief["digest"] = digest({"facts_digest": facts_digest, "accepted_choices": choices})
        while len(json.dumps(brief, ensure_ascii=False).encode()) > 8192 and brief["selected_places"]:
            brief["selected_places"].pop()
            brief["omitted_places"] += 1
        while len(json.dumps(brief, ensure_ascii=False).encode()) > 8192 and brief["themes"]:
            brief["themes"].pop()
            brief["omitted_themes"] = brief.get("omitted_themes", 0) + 1
        # Preserve dates/party/location criteria if large multilingual facts consume
        # the remaining budget. Explicit omission counts avoid pretending complete recall.
        for choice in brief["accepted_choices"]:
            if len(json.dumps(brief, ensure_ascii=False).encode()) <= 8192:
                break
            choice["summary"] = ""
            choice["context_truncated"] = True
        while len(json.dumps(brief, ensure_ascii=False).encode()) > 8192:
            choice = max(brief["accepted_choices"], key=lambda value: len(value["facts"]), default=None)
            if not choice or not choice["facts"]:
                break
            choice["facts"].pop()
            choice["omitted_facts"] = choice.get("omitted_facts", 0) + 1
        return brief

    def snapshot(self, subject, plan_id, topic):
        plan = self._active(subject, plan_id)
        state = self._state(plan_id, topic)
        brief = self.brief(subject, plan_id)
        shortlist = state.get("shortlist", [])
        preferred = next((x for x in shortlist if x["id"] == state.get("preferred_id")), None)
        comparison = state.get("comparison")
        # Keep historical prices, explicitly mark applicability rather than delete evidence.
        readiness = "researching" if not preferred else "ready" if preferred["facts_digest"] == brief["facts_digest"] else "needs_review"
        return {"plan_id": str(plan_id), "topic": topic, "revision": plan.revision,
                "brief": brief, "messages": self.plans.conversation_messages(subject, plan_id, 12, topic),
                "notes": state.get("notes", TopicNotes().model_dump()), "comparison": comparison,
                "comparison_stale": bool(comparison and state.get("comparison_digest") != brief["facts_digest"]),
                "shortlist": shortlist, "preferred": preferred, "readiness": readiness,
                "locked": self.contexts.snapshot(subject, plan_id).locked}

    def run(self, subject, plan_id, topic, data):
        self._active(subject, plan_id)
        lease = self.contexts._row(subject, plan_id)
        now = self.plans.clock()
        run = self.session.get(TravelTopicRun, (plan_id, data.event_id))
        input_digest = digest({"topic": topic, "message": data.message, "generation": data.generation})
        if run and (run.topic != topic or (data.action != "cancel" and run.input_digest != input_digest)):
            raise LifecycleProblem("request_reused")
        if data.action == "begin":
            if run or self.session.scalar(select(PlanActionReceipt).where(PlanActionReceipt.traveler_subject == subject, PlanActionReceipt.request_id == data.event_id)):
                raise LifecycleProblem("request_reused")
            if self.contexts._locked(lease):
                raise LifecycleProblem("context_locked")
            if lease.active_event:
                expired = self.session.get(TravelTopicRun, (plan_id, lease.active_event))
                if expired and expired.status == "active":
                    expired.status = "interrupted"
                    self.session.get(ConversationMessage, expired.message_id).status = "interrupted"
            if not data.message.strip():
                raise LifecycleProblem("invalid_request")
            brief = self.brief(subject, plan_id)
            message = self.plans.append_conversation_message(subject, plan_id, data.event_id + ":user", "user", data.message,
                topic=topic, generation=data.generation, status="pending", commit=False)
            run = TravelTopicRun(plan_id=plan_id, event_id=data.event_id, topic=topic, input_digest=input_digest,
                                brief_digest=brief["digest"], status="active", message_id=UUID(message["message_id"]))
            self.session.add(run)
            lease.active_event, lease.lease_until = data.event_id, now + timedelta(minutes=10)
        elif data.action == "cancel":
            if run and run.status == "active":
                run.status = "interrupted"
                self.session.get(ConversationMessage, run.message_id).status = "interrupted"
                if lease.active_event == data.event_id:
                    lease.active_event, lease.lease_until = None, None
        else:
            if not run or run.status != "active" or not self.contexts._locked(lease) or lease.active_event != data.event_id:
                raise LifecycleProblem("revision_conflict")
            brief = self.brief(subject, plan_id)
            if run.brief_digest != data.brief_digest or brief["digest"] != data.brief_digest:
                raise LifecycleProblem("revision_conflict")
            if not data.assistant_text.strip():
                raise LifecycleProblem("invalid_request")
            state = self._state(plan_id, topic)
            if data.comparison:
                proof = issue_comparison_proof(subject, plan_id, topic, data.event_id, data.brief_digest, data.comparison.model_dump())
                if not proof or not hmac.compare_digest(proof, data.comparison_proof):
                    raise LifecycleProblem("canvas_evidence_invalid")
                options = []
                for option in data.comparison.options:
                    options.append({**option.model_dump(), "id": str(uuid4())})
                state["comparison"] = {"options": options}
                state["comparison_digest"] = brief["facts_digest"]
            if data.notes:
                plan = self._active(subject, plan_id)
                rows = self.session.scalars(select(ConversationMessage).where(ConversationMessage.conversation_id == plan.conversation.id,
                    ConversationMessage.topic == topic, ConversationMessage.status.in_(["complete", "pending"]))).all()
                sources = {str(m.id): m for m in rows}
                cutoff = max((m.sequence for m in rows), default=0)
                if data.notes.covered_through_sequence > cutoff:
                    raise LifecycleProblem("invalid_request")
                for note in data.notes.items:
                    if any(i not in sources or (note.kind != "assistant_inference" and sources[i].role != "user")
                           or sources[i].sequence > data.notes.covered_through_sequence for i in note.source_message_ids):
                        raise LifecycleProblem("invalid_request")
                state["notes"] = data.notes.model_dump()
            self.plans.append_conversation_message(subject, plan_id, data.event_id + ":assistant", "assistant", data.assistant_text,
                topic=topic, generation=data.generation, commit=False)
            self.session.get(ConversationMessage, run.message_id).status = "complete"
            self._save(plan_id, topic, state)
            run.status = "complete"
            lease.active_event, lease.lease_until = None, None
            self.session.add(self.plans._success_receipt(subject, data.event_id, "research_run",
                {"plan_id": str(plan_id), "event_id": data.event_id, "topic": topic, "input_digest": input_digest}, plan_id, now))
        self.session.commit()
        result = self.snapshot(subject, plan_id, topic)
        if data.action == "begin":
            canvas = self.session.get(PlanningCanvas, plan_id)
            result["saved_canvas"] = canvas.payload if canvas else None
        return result

    def _choice(self, subject, plan_id, topic, mutation):
        state = self._state(plan_id, topic)
        brief = self.brief(subject, plan_id)
        options = (state.get("comparison") or {}).get("options", [])
        stored = state.get("shortlist", [])
        option = next((x for x in options if x["id"] == mutation.evidence_id), None)
        saved = next((x for x in stored if x["id"] == mutation.evidence_id), None)
        if mutation.action == "remove":
            if not saved:
                raise LifecycleProblem("not_found")
            return state, saved, brief
        if not option and not saved:
            raise LifecycleProblem("not_found")
        facts_digest = state.get("comparison_digest") if option else saved["facts_digest"]
        if facts_digest != brief["facts_digest"]:
            raise LifecycleProblem("revision_conflict")
        criteria = (option or saved)["criteria"]
        for key, expected in (("check_in", brief["dates"]["start"]), ("departure_date", brief["dates"]["start"]),
                              ("check_out", brief["dates"]["end"]), ("return_date", brief["dates"]["end"]),
                              ("travelers", brief["travelers"])):
            if expected and criteria.get(key) is not None and criteria[key] != expected:
                raise LifecycleProblem("revision_conflict")
        if not saved and len(stored) >= 5:
            raise LifecycleProblem("invalid_request")
        return state, option or saved, brief

    def challenge(self, subject, plan_id, topic, request_id, revision, mutation):
        validate_request_id(request_id, self.plans.clock())
        self._active(subject, plan_id)
        self._choice(subject, plan_id, topic, mutation)
        if self.contexts.snapshot(subject, plan_id).locked:
            raise LifecycleProblem("context_locked")
        token = self.plans.issue_challenge(subject, plan_id, "travel_choice", revision, {"topic": topic, **mutation.model_dump()})
        return {"challenge": token, "revision": revision, "expires_in": 300}

    def choose(self, subject, plan_id, topic, request_id, revision, mutation, challenge):
        now = self.plans.clock()
        plan = self._active(subject, plan_id)
        payload = {"plan_id": str(plan_id), "revision": revision, "topic": topic, **mutation.model_dump()}
        receipt = self.plans._receipt(subject, request_id, "travel_choice", payload)
        if receipt:
            return receipt.result_json
        validate_request_id(request_id, now)
        if plan.revision != revision:
            raise LifecycleProblem("revision_conflict")
        if self.contexts.snapshot(subject, plan_id).locked:
            raise LifecycleProblem("context_locked")
        state, option, brief = self._choice(subject, plan_id, topic, mutation)
        if not challenge:
            raise LifecycleProblem("challenge_invalid")
        self.plans._consume_challenge(subject, plan_id, "travel_choice", revision, {"topic": topic, **mutation.model_dump()}, challenge)
        shortlist = list(state.get("shortlist", []))
        if mutation.action == "remove":
            shortlist = [x for x in shortlist if x["id"] != mutation.evidence_id]
            if state.get("preferred_id") == mutation.evidence_id:
                state["preferred_id"] = None
        else:
            if not any(x["id"] == option["id"] for x in shortlist):
                shortlist.append({**option, "evidence_id": option["id"], "facts_digest": brief["facts_digest"],
                                  "selected_at": now.isoformat(), "unbooked": True})
            if mutation.action == "prefer":
                state["preferred_id"] = option["id"]
        state["shortlist"] = shortlist
        self._save(plan_id, topic, state)
        plan.revision += 1
        plan.updated_at = plan.last_activity_at = now
        self.session.flush()
        result = self.snapshot(subject, plan_id, topic)
        receipt = self.plans._success_receipt(subject, request_id, "travel_choice", payload, plan_id, now)
        receipt.result_json = result
        self.session.add(receipt)
        self.session.commit()
        return result
