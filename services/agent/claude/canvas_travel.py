"""Canvas-only read-only travel tools. Facts and authority stay in host code."""
from __future__ import annotations

import asyncio
import hashlib
import json
import re
import time
from datetime import UTC, date, datetime, timedelta
from typing import Annotated, Literal
from uuid import uuid4

from claude_agent_sdk import create_sdk_mcp_server, tool
from pydantic import Field, model_validator

from services.shared.traveler_profile import reference_catalog
from ..travel_contracts import HotelSearch, Hotel, Capabilities, validate_dates
from .research_result import StrictResult


Text = Annotated[str, Field(max_length=240)]
Identifier = Annotated[str, Field(min_length=1, max_length=100)]


class Money(StrictResult):
    amount: str | None = Field(default=None, max_length=40, pattern=r"^\d+(?:\.\d+)?$")
    currency: str | None = Field(default=None, max_length=3, pattern=r"^[A-Z]{3}$")


class Tax(Money):
    name: Text


class Price(Money):
    basis: Literal["stay", "party_return"]
    estimated: bool = False
    excluded_taxes: list[Tax] = Field(default_factory=list, max_length=50)


class StayRoom(StrictResult):
    id: Identifier
    name: Text
    board_name: Text | None = None
    refundable: bool | None = None
    cancellation_summary: Text | None = None
    cancellation_deadline: Text | None = None
    total: Money
    excluded_taxes: list[Tax] = Field(default_factory=list, max_length=50)
    occupancy_summary: Text | None = None


class StayOption(StrictResult):
    id: Identifier
    name: Text
    address: Text | None = None
    price: Price
    rooms: list[StayRoom] = Field(default_factory=list, max_length=30)

    @model_validator(mode="after")
    def basis(self):
        if self.price.basis != "stay":
            raise ValueError("Wrong stay price basis")
        return self


class TravelSnapshot(StrictResult):
    search_id: Identifier
    plan_id: str = Field(max_length=100)
    generation: int = Field(ge=0)
    mode: Literal["stays"]
    criteria: HotelSearch
    fingerprint: str = Field(pattern=r"^[a-f0-9]{64}$")
    draft_facts: dict  # Host-authored relevant draft baseline; no provider fields.
    searched_at: str = Field(max_length=40)
    expires_at: str = Field(max_length=40)
    provider: Literal["LiteAPI"]
    sandbox: bool
    returned_count: int = Field(ge=0, le=100)
    truncated: bool
    notices: list[Text] = Field(default_factory=list, max_length=10)
    results: list[StayOption] = Field(max_length=100)
    preview_ids: list[Identifier] = Field(default_factory=list, max_length=3)
    search_only_dates: bool = False

    @model_validator(mode="after")
    def valid_collection(self):
        ids = [item.id for item in self.results]
        if len(set(ids)) != len(ids) or len(set(self.preview_ids)) != len(self.preview_ids):
            raise ValueError("Duplicate travel options")
        if not set(self.preview_ids).issubset(ids) or self.returned_count != len(ids):
            raise ValueError("Invalid travel collection")
        if datetime.fromisoformat(self.expires_at) <= datetime.fromisoformat(self.searched_at):
            raise ValueError("Invalid lifetime")
        return self


class TravelSelection(StrictResult):
    search_id: Identifier
    mode: Literal["stays"]
    option_ids: list[Identifier] = Field(max_length=3)


class Clarification(ValueError):
    """A fixed user-facing missing-fact question, never a raw provider error."""


def draft_facts(draft):
    essentials = draft.components.get("essentials", {})
    dates = essentials.get("dates", {})
    return {"start": dates.get("start", ""), "end": dates.get("end", ""),
            "flexible": bool(dates.get("flexible")), "travelers": essentials.get("travelers"),
            "destination": draft.components.get("map", {}).get("destination", "")}


MONTHS = "January February March April May June July August September October November December".split()
MONTH_NUMBER = {name.lower(): index for index, name in enumerate(MONTHS, 1)}
MONTH_NUMBER.update({name[:3].lower(): index for index, name in enumerate(MONTHS, 1)})
MONTH_PATTERN = "(?:" + "|".join(sorted(MONTH_NUMBER, key=len, reverse=True)) + ")"
DATE_CUE = re.compile(r"\b" + MONTH_PATTERN + r"\b|\b(?:tomorrow|weekend|summer|winter|spring|autumn|instead|next|sometime|different dates|change dates|dates? unknown|not sure)\b|\d{4}-\d|\d+[/-]\d", re.I)
DATE_QUESTION = "What are your check-in and check-out dates, including the year?"
ROOM_QUESTION = "How many adults and children will stay in each room? For adults only, reply ‘1 room for 2 adults’; include every child’s age if traveling with children."
NATIONALITY_QUESTION = "What is the guests’ nationality for this search? Reply nationality: country."
DESTINATION_QUESTION = "Which city and country should I search? Reply destination: city, country."
CLARIFICATIONS = {DATE_QUESTION, ROOM_QUESTION, NATIONALITY_QUESTION, DESTINATION_QUESTION}


def clarification_history(context):
    """Reuse evidence only while answering our most recent focused clarification."""
    history = context.recent_messages[-12:]
    if not history or history[-1].get("role") != "assistant" or history[-1].get("content") not in CLARIFICATIONS:
        return []
    output = []
    for index, item in reversed(list(enumerate(history))):
        if item.get("role") == "assistant":
            if item.get("content") not in CLARIFICATIONS:
                break
        elif item.get("role") == "user":
            output.append((index, item.get("content", "")))
        else:
            break
    return list(reversed(output))


def explicit_dates(text):
    """Small exact grammar; source text, never model normalization, is authoritative."""
    if not DATE_CUE.search(text):
        return None
    if len(text) > 2000 or re.search(r'["“”`<>]|\b(?:assistant|provider|quoted|example|ignore|not|don.t|maybe|either|or)\b', text, re.I):
        raise Clarification(DATE_QUESTION)
    pattern = re.compile(r"\b(?:\d{4}-\d{2}-\d{2}|\d{1,2}\s+" + MONTH_PATTERN + r"\s+\d{4}|" + MONTH_PATTERN + r"\s+\d{1,2},?\s+\d{4})\b", re.I)
    matches = list(pattern.finditer(text))
    spans = [(m.start(), m.end()) for m in matches]
    values = []
    try:
        for match in matches:
            value = match.group()
            if re.fullmatch(r"\d{4}-\d{2}-\d{2}", value):
                values.append(date.fromisoformat(value))
            else:
                parts = value.replace(",", "").split()
                day, month, year = parts if parts[0].isdigit() else (parts[1], parts[0], parts[2])
                values.append(date(int(year), MONTH_NUMBER[month.lower()], int(day)))
        if len(matches) < 2:
            compact = re.search(r"\b(\d{1,2})\s*(?:–|-|to)\s*(\d{1,2})\s+(" + MONTH_PATTERN + r")\s+(\d{4})\b", text, re.I)
            if compact:
                values = [date(int(compact[4]), MONTH_NUMBER[compact[3].lower()], int(compact[i])) for i in (1, 2)]
                spans = [(compact.start(), compact.end())]
        # Remove exactly recognized spans and permitted correction words; any remaining
        # date cue means an unresolved second range or yearless correction.
        remainder = text
        for start, end in reversed(spans):
            remainder = remainder[:start] + " " * (end-start) + remainder[end:]
        remainder = re.sub(r"\binstead\b", "", remainder, flags=re.I)
        if len(values) != 2 or DATE_CUE.search(remainder):
            raise ValueError()
        validate_dates(values[0], values[1], 30)
    except (ValueError, KeyError):
        raise Clarification(DATE_QUESTION) from None
    return [v.isoformat() for v in values], [{"start": start, "end": end, "text": text[start:end]} for start, end in spans]


def resolve_dates(message, context, draft):
    """Current exact correction > active clarification evidence > exact Canvas pair."""
    facts = draft_facts(draft)
    current = explicit_dates(message)
    if current:
        pair, spans = current
        return *pair, {"source": "current", "role": "user", "spans": spans, "normalized": pair}
    for index, text in reversed(clarification_history(context)):
        previous = explicit_dates(text)  # A newer ambiguous correction blocks older dates.
        if previous:
            pair, spans = previous
            return *pair, {"source": f"recent_messages:{index}", "role": "user", "spans": spans, "normalized": pair}
    if not facts["start"] or not facts["end"] or facts["flexible"]:
        raise Clarification(DATE_QUESTION)
    try:
        validate_dates(date.fromisoformat(facts["start"]), date.fromisoformat(facts["end"]), 30)
    except ValueError:
        raise Clarification("Those dates don’t form a valid trip. What exact start and end dates should I use?") from None
    return facts["start"], facts["end"], {"source": "canvas", "fields": ["essentials.dates.start", "essentials.dates.end"], "normalized": [facts["start"], facts["end"]]}


def explicit_rooms(text):
    """Accept an explicit one-room allocation or numbered room allocations."""
    if re.search(r'["“”`<>]|\b(?:not|don.t|example|quoted|assistant|provider)\b', text, re.I):
        return None
    allocations = list(re.finditer(r"\b(?:1 room(?: for)?|room\s+\d+\s*:)\s*(\d+)\s+adults?([^;\n]*)", text, re.I))
    if not allocations:
        return None
    rooms = []
    for allocation in allocations:
        tail = allocation[2].strip()
        ages = []
        if re.search(r"\b(?:child|children|kids?)\b", tail, re.I):
            found = re.fullmatch(r"(?:and\s+|\+\s*)?(?:children|kids?)\s+ages?\s+(\d+(?:\s*,\s*\d+)*)", tail, re.I)
            if not found:
                return None
            ages = [int(age.strip()) for age in found[1].split(",")]
        elif tail:
            return None
        rooms.append({"adults": int(allocation[1]), "children_ages": ages})
    # Every allocation must be explicit, including every mentioned child.
    remainder = text
    for allocation in reversed(allocations):
        remainder = remainder[:allocation.start()] + " " + remainder[allocation.end():]
    if re.search(r"\b(?:adults?|child|children|kids?)\b", remainder, re.I):
        return None
    return rooms


def country_code(value):
    matches = [item["code"] for item in reference_catalog("countries")
               if value.strip().casefold() in {item["code"].casefold(), str(item.get("name", "")).casefold()}]
    return matches[0] if len(matches) == 1 else None


def stay_criteria(message, context, draft):
    start, end, evidence = resolve_dates(message, context, draft)
    # Only authenticated traveler turns are eligible. Current values take precedence.
    texts = [text for _, text in clarification_history(context) if len(text) <= 2000] + [message]
    destination = draft.components.get("map", {}).get("destination", "")
    for text in texts:
        match = re.search(r"\bdestination:\s*([^;\n]+)", text, re.I)
        if match:
            destination = match[1].strip()
    parts = destination.rsplit(",", 1)
    code = country_code(parts[-1]) if len(parts) == 2 else None
    if not code:
        raise Clarification(DESTINATION_QUESTION)
    rooms = None
    for text in texts:
        if re.search(r"\b(?:rooms?|adults?|children|child|kids?)\b", text, re.I):
            rooms = explicit_rooms(text)
    if rooms is None:
        raise Clarification(ROOM_QUESTION)
    nationality = None
    citizenships = context.traveler_profile.get("citizenships", [])
    if len(citizenships) == 1:
        nationality = country_code(str(citizenships[0]))
    for text in texts:
        match = re.search(r"\b(?:nationality|citizenship):\s*([^;\n.]+)", text, re.I)
        if match:
            nationality = country_code(match[1])
    if not nationality:
        raise Clarification(NATIONALITY_QUESTION)
    try:
        criteria = HotelSearch(destination={"city": parts[0].strip(), "country_code": code},
                               check_in=start, check_out=end, rooms=rooms, guest_nationality=nationality)
    except ValueError:
        raise Clarification("Please check your dates, room allocation and guest nationality before searching again.") from None
    return criteria, evidence


def travel_intent(message, context):
    return bool(re.search(r"\b(?:stays?|hotels?|accommodation|flights?|nationality|check-in|check-out|rooms?)\b", message, re.I)
                or clarification_history(context) and (DATE_CUE.search(message) or re.search(r"\b(?:adults?|children|nationality|citizenship|destination)\b", message, re.I)))


def safe_stay(raw):
    # Validate the provider shape, then explicitly reconstruct every nested field.
    hotel = Hotel.model_validate(raw)
    return StayOption(id=hotel.id, name=hotel.name, address=hotel.address,
        price=Price(**hotel.price.model_dump()),
        rooms=[StayRoom(**room.model_dump(include=set(StayRoom.model_fields))) for room in hotel.rooms])


class CanvasTravelObserver:
    names = {"travel_capabilities", "search_destinations", "search_stays"}

    def __init__(self, client, context, authorization_token, draft, message, deadline=None):
        self.client, self.context, self.authorization_token = client, context, authorization_token
        self.draft, self.message = draft, message
        self.deadline = deadline or time.monotonic() + 120
        self.calls = 0
        self.counts = {"capabilities": 0, "lookup": 0, "stays": 0}
        self.cache, self.snapshots = {}, {}
        self.tool_bytes = 0
        self.active = travel_intent(message, context)
        self.question, self.failure = None, False
        self.criteria, self.evidence = None, None
        if self.active:
            try:
                self.criteria, self.evidence = stay_criteria(message, context, draft)
            except Clarification as error:
                self.question = str(error)

    async def _call(self, action, criteria, category):
        if not self.active or self.question or self.criteria is None:
            raise ValueError("travel_input_required")
        key = json.dumps([action, criteria], sort_keys=True)
        if key in self.cache:
            return self.cache[key]
        limit = 2 if category == "lookup" else 1
        if self.calls >= 5 or self.counts[category] >= limit:
            raise ValueError("travel_call_limit")
        self.calls += 1
        self.counts[category] += 1
        timeout = min(45, self.deadline - time.monotonic() - 5)
        if timeout <= 0:
            raise TimeoutError()
        async with asyncio.timeout(timeout):
            result = await self.client.call("travel_search", {"action": action, "criteria": criteria},
                subject=self.context.traveler_scope, plan_id=self.context.plan_id,
                authorization_token=self.authorization_token)
        self.cache[key] = result
        return result

    async def invoke(self, name, arguments):
        try:
            if name not in self.names or arguments:
                raise ValueError("travel_tool_forbidden")
            caps = Capabilities.model_validate(await self._call("capabilities", {}, "capabilities"))
            if not caps.hotels:
                raise ValueError("stays_unavailable")
            if name == "travel_capabilities":
                payload = {"stays": caps.hotels, "flights": False, "sandbox": caps.sandbox}
            elif name == "search_destinations":
                # Criteria already contain an explicit city/country. Lookup cannot override them.
                raw = await self._call("places", {"q": self.criteria.destination.city,
                    "country_code": self.criteria.destination.country_code}, "lookup")
                from ..travel_contracts import Places
                places = Places.model_validate(raw)
                payload = {"places": [item.model_dump() for item in places.places]}
            else:
                if self.snapshots:
                    snapshot = next(iter(self.snapshots.values()))
                else:
                    raw = await self._call("hotels/search", self.criteria.model_dump(mode="json"), "stays")
                    if raw.get("provider") != "LiteAPI" or type(raw.get("sandbox")) is not bool or raw.get("status") not in {"ready", "empty"}:
                        raise ValueError("travel_response_invalid")
                    results = [safe_stay(item) for item in raw["results"]]
                    if len(results) > 100 or raw.get("returned_count") != len(results) or (raw["status"] == "empty") != (not results):
                        raise ValueError("travel_count_invalid")
                    now = datetime.now(UTC)
                    normalized = self.criteria.model_dump(mode="json")
                    snapshot = TravelSnapshot(search_id=uuid4().hex, plan_id=self.context.plan_id,
                        generation=self.context.generation, mode="stays", criteria=self.criteria,
                        fingerprint=hashlib.sha256(json.dumps(normalized, sort_keys=True).encode()).hexdigest(),
                        draft_facts=draft_facts(self.draft), searched_at=now.isoformat(), expires_at=(now+timedelta(minutes=10)).isoformat(),
                        provider="LiteAPI", sandbox=raw["sandbox"], returned_count=len(results),
                        truncated=bool(raw.get("truncated")), notices=raw.get("notices", []), results=results,
                        search_only_dates=[normalized["check_in"], normalized["check_out"]] != [draft_facts(self.draft)["start"], draft_facts(self.draft)["end"]])
                    while len(snapshot.model_dump_json().encode()) > 130000 and snapshot.results:
                        snapshot.results.pop(); snapshot.returned_count -= 1; snapshot.truncated = True
                    if len(snapshot.model_dump_json().encode()) > 130000:
                        raise ValueError("travel_payload_limit")
                    self.snapshots[snapshot.search_id] = snapshot
                payload = {"search_id": snapshot.search_id, "mode": "stays", "count": snapshot.returned_count,
                           "options": [{"id": item.id, "name": item.name, "price": item.price.model_dump()} for item in snapshot.results[:10]]}
            encoded = json.dumps(payload, ensure_ascii=False)
            if self.tool_bytes + len(encoded.encode()) > 24576:
                raise ValueError("travel_text_limit")
            self.tool_bytes += len(encoded.encode())
            return {"content": [{"type": "text", "text": encoded}]}
        except asyncio.CancelledError:
            self.snapshots.clear()
            raise
        except Exception:
            self.failure = True
            return {"is_error": True, "content": [{"type": "text", "text": self.question or "Travel search is unavailable. Ask the traveler to try again; do not invent options."}]}

    def selected(self, selections):
        if self.failure:
            return []
        if len(selections) != len(self.snapshots):
            raise ValueError("travel_selection_missing")
        output, seen = [], set()
        for selection in selections:
            snap = self.snapshots.get(selection.search_id)
            if not snap or selection.mode != snap.mode or snap.search_id in seen:
                raise ValueError("travel_selection_unknown")
            seen.add(snap.search_id)
            ids = selection.option_ids
            if len(set(ids)) != len(ids) or not set(ids).issubset({x.id for x in snap.results[:10]}) or len(ids) != min(3, len(snap.results)):
                raise ValueError("travel_option_unknown")
            snap = snap.model_copy(update={"preview_ids": [x.id for x in snap.results if x.id in ids]})
            output.append(snap.model_dump(mode="json"))
        return output

    def server(self):
        @tool("travel_capabilities", "Check enabled travel modes after required stay inputs are complete.", {})
        async def capabilities(args): return await self.invoke("travel_capabilities", args)
        @tool("search_destinations", "Look up the explicitly supplied city/country after all other inputs are complete.", {})
        async def destinations(args): return await self.invoke("search_destinations", args)
        @tool("search_stays", "Search stays using host-validated current dates, rooms, destination and nationality. No arguments.", {})
        async def stays(args): return await self.invoke("search_stays", args)
        return create_sdk_mcp_server(name="travel", version="1.0.0", tools=[capabilities, destinations, stays])
