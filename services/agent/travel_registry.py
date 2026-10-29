"""Bounded, ephemeral observations shared by manual browsing and topic workers.

Contains normalized public facts only, never checkout tokens or raw payloads.
Restart/eviction expires the reference; it must never authorize a durable choice.
"""
import hashlib
import json
from collections import OrderedDict
from datetime import UTC, datetime, timedelta
from uuid import uuid4

from fastapi import HTTPException

from .claude.canvas_travel import FlightSnapshot, StaySnapshot, safe_flight, safe_stay
from .travel_contracts import FlightSearch, HotelSearch


class TravelRegistry:
    def __init__(self, limit=256):
        self.entries = OrderedDict()
        self.limit = limit

    def put(self, subject, plan_id, snapshot):
        now = datetime.now(UTC)
        for key, (_, _, value) in list(self.entries.items()):
            if datetime.fromisoformat(value.expires_at) <= now:
                del self.entries[key]
        value = snapshot.model_copy(deep=True)
        value.preview_ids = [o.id for o in value.results[:3]]
        if len(value.model_dump_json().encode()) > 150000:
            raise ValueError("travel_payload_limit")
        self.entries[value.search_id] = (subject, str(plan_id), value)
        self.entries.move_to_end(value.search_id)
        while len(self.entries) > self.limit:
            self.entries.popitem(last=False)

    def get(self, subject, plan_id, search_id, topic=None):
        entry = self.entries.get(search_id)
        if not entry or entry[:2] != (subject, str(plan_id)):
            raise HTTPException(409, "These results expired. Search again to continue.")
        value = entry[2]
        if datetime.fromisoformat(value.expires_at) <= datetime.now(UTC) or (topic and value.mode != topic):
            raise HTTPException(409, "These results expired. Search again to continue.")
        return value.model_copy(deep=True)

    def resolve(self, subject, plan_id, topic, discussion):
        snapshots = {}
        for ref in discussion.options:
            snap = self.get(subject, plan_id, ref.search_id, topic)
            option = next((o for o in snap.results if o.id == ref.option_id), None)
            if option is None or (ref.room_id and (topic != "stays" or not any(r.id == ref.room_id for r in option.rooms))):
                raise HTTPException(409, "This option changed. Search again to continue.")
            if discussion.intent == "review" and topic == "stays" and not ref.room_id:
                raise HTTPException(422, "Select an exact room offer first.")
            snapshots[snap.search_id] = snap
        return list(snapshots.values())

    def manual(self, subject, plan_id, action, criteria, result):
        mode = "stays" if action == "hotels/search" else "flights"
        criteria = (HotelSearch if mode == "stays" else FlightSearch).model_validate(criteria)
        options = [safe_stay(o) if mode == "stays" else safe_flight(o, criteria, result.get("airport_groups")) for o in result["results"]]
        now = datetime.now(UTC)
        # Keep supplier observation age; registry insertion is not a new search.
        observed = datetime.fromisoformat(result.get('searched_at') or now.isoformat())
        if observed.tzinfo is None or observed > now + timedelta(seconds=5):
            raise ValueError('invalid_observation_time')
        normalized = criteria.model_dump(mode="json")
        value = (StaySnapshot if mode == "stays" else FlightSnapshot)(
            search_id=uuid4().hex, plan_id=str(plan_id), generation=0, mode=mode, criteria=criteria,
            fingerprint=hashlib.sha256(json.dumps(normalized, sort_keys=True).encode()).hexdigest(),
            draft_facts={}, searched_at=observed.isoformat(), expires_at=(observed + timedelta(minutes=10)).isoformat(),
            provider="LiteAPI", sandbox=result["sandbox"], returned_count=len(options),
            truncated=result["truncated"], notices=result["notices"], results=options)
        while len(value.model_dump_json().encode()) > 130000 and value.results:
            value.results.pop(); value.returned_count -= 1; value.truncated = True
        self.put(subject, plan_id, value)
        return value.search_id


travel_registry = TravelRegistry()
