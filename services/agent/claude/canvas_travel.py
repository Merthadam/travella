"""Canvas-only read-only travel tools. Facts and authority stay in host code."""
from __future__ import annotations

import asyncio
import hashlib
import json
import logging
import re
import time
from datetime import UTC, date, datetime, timedelta
from typing import Annotated, Literal, get_args
from urllib.parse import urlsplit
from uuid import uuid4

from claude_agent_sdk import create_sdk_mcp_server, tool
from pydantic import Field, model_validator

from services.shared.traveler_profile import reference_catalog

from ..travel_contracts import (
    Airports,
    Capabilities,
    Currency,
    Flight,
    FlightSearch,
    Hotel,
    HotelSearch,
    validate_dates,
)
from .research_result import StrictResult, public_https_url

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
    hotel_id: Identifier
    name: Text
    address: Text | None = None
    image_url: str | None = Field(default=None, max_length=2000)
    stars: float | None = Field(default=None, ge=0, le=5)
    review_score: float | None = Field(default=None, ge=0, le=10)
    review_count: int | None = Field(default=None, ge=0)
    facilities: list[Text] = Field(default_factory=list, max_length=40)
    price: Price
    rooms: list[StayRoom] = Field(default_factory=list, max_length=30)

    @model_validator(mode="after")
    def basis(self):
        if self.price.basis != "stay":
            raise ValueError("Wrong stay price basis")
        return self


class FlightSegment(StrictResult):
    origin: str = Field(pattern=r"^[A-Z]{3}$")
    destination: str = Field(pattern=r"^[A-Z]{3}$")
    departure_at: str = Field(max_length=40, pattern=r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}")
    arrival_at: str = Field(max_length=40, pattern=r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}")
    airline: Text | None = None
    operating_airline: Text | None = None
    flight_number: Text | None = None
    duration_minutes: int | None = Field(default=None, ge=0, le=10080)
    technical_stops: list[Text] = Field(default_factory=list, max_length=10)


class FlightLeg(StrictResult):
    duration_minutes: int | None = Field(default=None, ge=0, le=10080)
    stops: int | None = Field(default=None, ge=0, le=30)
    segments: list[FlightSegment] = Field(min_length=1, max_length=12)


class FlightOption(StrictResult):
    id: Identifier
    price: Price
    airlines: list[Text] = Field(max_length=12)
    outbound: FlightLeg
    inbound: FlightLeg
    baggage_summary: Text | None = None
    cabin_bag_included: bool | None = None
    refundable: bool | None = None
    cancellation_summary: Text | None = None

    @model_validator(mode="after")
    def basis(self):
        if self.price.basis != "party_return":
            raise ValueError("Wrong flight price basis")
        return self


class SnapshotBase(StrictResult):
    search_id: Identifier
    plan_id: str = Field(max_length=100)
    generation: int = Field(ge=0)
    fingerprint: str = Field(pattern=r"^[a-f0-9]{64}$")
    draft_facts: dict  # Host-authored relevant draft baseline; no provider fields.
    searched_at: str = Field(max_length=40)
    expires_at: str = Field(max_length=40)
    provider: Literal["LiteAPI"]
    sandbox: bool
    returned_count: int = Field(ge=0, le=100)
    truncated: bool
    notices: list[Text] = Field(default_factory=list, max_length=10)
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


class StaySnapshot(SnapshotBase):
    mode: Literal["stays"]
    criteria: HotelSearch
    results: list[StayOption] = Field(max_length=100)


class FlightSnapshot(SnapshotBase):
    mode: Literal["flights"]
    criteria: FlightSearch
    results: list[FlightOption] = Field(max_length=100)


TravelSnapshot = Annotated[StaySnapshot | FlightSnapshot, Field(discriminator="mode")]


class TravelSelection(StrictResult):
    search_id: Identifier
    mode: Literal["stays", "flights"]
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
# A calendar expression that we cannot normalize exactly must still block Canvas
# fallback. Relative/weekday/holiday requests are intent, never date authority.
WEEKDAY_PATTERN = r"(?:mon(?:day)?|tue(?:s(?:day)?)?|wed(?:nesday)?|thu(?:rs?(?:day)?)?|fri(?:day)?|sat(?:urday)?|sun(?:day)?)"
RELATIVE_DATE_PATTERN = r"(?:today|tonight|tomorrow|yesterday|weekends?|weekdays?|summer|winter|spring|autumn|fall|instead|next|sometime|different dates|change dates|dates? unknown|not sure|christmas|xmas|easter|thanksgiving|new year(?:s|'s)?|hanukkah|diwali|ramadan|holidays?|half[- ]term|spring break)"
DATE_CUE = re.compile(
    r"\b(?:" + MONTH_PATTERN + "|" + WEEKDAY_PATTERN + "|" + RELATIVE_DATE_PATTERN + r")\b"
    r"|\b(?:this|last|coming|following)\s+(?:week|month|year|fortnight)\b"
    r"|\b(?:in|for)\s+(?:\d+|a|an|one|two|three|four|five|six|seven|eight|nine|ten)\s+(?:days?|weeks?|months?|years?|fortnights?)\b"
    r"|\b\d{1,2}(?:st|nd|rd|th)\b|\d{4}-\d|\d+[/-]\d", re.I)
DATE_QUESTION = "What are your check-in and check-out dates, including the year?"
ROOM_QUESTION = "How many adults and children will stay in each room? For adults only, reply ‘1 room for 2 adults’; include every child’s age if traveling with children."
NATIONALITY_QUESTION = "What is the guests’ nationality for this search? Reply nationality: country."
DESTINATION_QUESTION = "Which city and country should I search? Reply destination: city, country."
CURRENCY_QUESTION = "Which currency should I use for stays? Reply currency: EUR, USD, GBP, HUF, CAD, AUD, JPY or CHF."
INVALID_DATE_QUESTION = "Those dates don’t form a valid trip. What exact start and end dates should I use?"
STAY_INPUT_QUESTION = "Please check your dates, room allocation and guest nationality before searching again."
CLARIFICATIONS = {DATE_QUESTION, ROOM_QUESTION, NATIONALITY_QUESTION, DESTINATION_QUESTION, CURRENCY_QUESTION, INVALID_DATE_QUESTION, STAY_INPUT_QUESTION}

# One vocabulary for activation, clarification continuity and mode selection.
# Spelling tolerance activates read-only discovery; criteria still require the
# same explicit dates, destination, room allocation and nationality below.
STAY_TERM_PATTERN = r"\b(?:stays?|hotels?|ac{1,2}om{1,2}odations?|apartments?|lodging|guest\s?houses?)\b"
FLIGHT_TERM_PATTERN = r"\bflights?\b"
TRAVEL_TERM_PATTERN = f"(?:{STAY_TERM_PATTERN}|{FLIGHT_TERM_PATTERN})"

AFFIRMATIVE = re.compile(r"(?:yes|yes please|okay|ok|please do|go ahead|continue|(?:yes[ ,]+)?(?:look|search) for (?:those|these|the same) flights)[.!?]*", re.I)
REPAIR = re.compile(r"(?:what are you doing|why are you asking again|i already told you)[.!?]*", re.I)
CANCEL = re.compile(r"^\s*(?:please\s+)?(?:cancel|never mind|nevermind|forget (?:it|that|this)|stop)\b", re.I)
RESET = re.compile(CANCEL.pattern + r"|\b(?:new search|start over|another trip)\b", re.I)


def passenger_party(text):
    """Recognize a complete traveler allocation, never fill missing child ages."""
    if re.search(r'["“”`<>]|\b(?:not|don.t|maybe|either|or|example|quoted|assistant|provider|ignore)\b', text, re.I):
        return None
    clauses = [part.strip().rstrip('.!?') for part in re.split(r'[;\n]', text)]
    candidates = [part for part in clauses if re.search(r'\b(?:passengers|adults?|children|child|infants?)\b', part, re.I)
                  and not re.search(r'\brooms?\b', part, re.I)]
    if len(candidates) != 1:
        return None
    value = re.sub(r'^(?:actually[, ]+)?(?:passengers:\s*|all\s+|we(?: are|’re|\'re)\s+|there are\s+|it(?: is|’s|\'s)\s+)?', '', candidates[0], flags=re.I)
    numbers = dict(zip('one two three four five six seven eight nine'.split(), range(1, 10)))
    value = re.sub(r'\b(?:one|two|three|four|five|six|seven|eight|nine)\b', lambda m: str(numbers[m[0].lower()]), value, flags=re.I)
    p = re.fullmatch(r'(\d+) adults?(?: and children ages? (\d+(?:\s*,\s*\d+)*))?(?: and infants? ages? (\d+(?:\s*,\s*\d+)*))?', value, re.I)
    return {"adults": int(p[1]), "children_ages": [int(x.strip()) for x in (p[2] or '').split(',') if x.strip()],
            "infant_ages": [int(x.strip()) for x in (p[3] or '').split(',') if x.strip()]} if p else None


def focused_followup(text):
    if len(text) > 2000 or RESET.search(text) or re.search(r'["“”`<>]|\b(?:ignore|assistant|provider|quoted|example)\b', text, re.I):
        return False
    return bool(AFFIRMATIVE.fullmatch(text.strip()) or REPAIR.fullmatch(text.strip()) or passenger_party(text)
                or country_code(text.strip().rstrip('.!?')) or re.fullmatch(r'[A-Z]{3}\s+(?:to|→)\s+[A-Z]{3}', text.strip())
                or re.match(r'^(?:origin|destination airport|flight country|country of sale|currency|cabin|nationality|citizenship|destination|passengers):', text, re.I)
                or explicit_rooms(text) or DATE_CUE.search(text))


def starts_new_search(message):
    return bool(RESET.search(message) or (re.search(r'\b(?:find|look for|search)\b', message, re.I)
                and not re.search(r'\b(?:those|these|same|discussed|also)\b', message, re.I)))


def search_history(message, context):
    # Explicit new searches and unrelated replies cannot silently revive old inputs.
    if starts_new_search(message):
        return []
    return clarification_history(context) if focused_followup(message) or re.search(TRAVEL_TERM_PATTERN, message, re.I) else []


def clarification_history(context):
    """Retain traveler evidence across bounded replies to a host clarification.

    Freeform assistant prose supplies no facts. It can only be crossed after a
    recognized traveler reply/repair, with a fixed host question anchoring it.
    """
    history = context.recent_messages[-12:]
    if not history or history[-1].get("role") != "assistant":
        return []
    output = []
    anchored = False
    bridge_users = 0
    for index, item in reversed(list(enumerate(history))):
        if item.get("role") == "assistant":
            if clarification_completed_modes(item.get("content")) is None:
                anchored = False
                bridge_users = 0
            else:
                if not anchored and index != len(history)-1 and not bridge_users:
                    return []
                anchored = True
        elif item.get("role") == "user":
            text = item.get("content", "")
            if not anchored:
                if not focused_followup(text):
                    return []
                bridge_users += 1
            elif RESET.search(text):
                break
            output.append((index, text))
            if anchored and (starts_new_search(text) or not focused_followup(text)):
                break
        else:
            return []
    return list(reversed(output)) if anchored else []


def explicit_dates(text, maximum=30):
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
        validate_dates(values[0], values[1], maximum)
    except (ValueError, KeyError):
        raise Clarification(DATE_QUESTION) from None
    return [v.isoformat() for v in values], [{"start": start, "end": end, "text": text[start:end]} for start, end in spans]


def resolve_dates(message, context, draft, maximum=30):
    """Current exact correction > active clarification evidence > exact Canvas pair."""
    facts = draft_facts(draft)
    current = explicit_dates(message, maximum)
    if current:
        pair, spans = current
        return *pair, {"source": "current", "role": "user", "spans": spans, "normalized": pair}
    for index, text in reversed(search_history(message, context)):
        previous = explicit_dates(text, maximum)  # A newer ambiguous correction blocks older dates.
        if previous:
            pair, spans = previous
            return *pair, {"source": f"recent_messages:{index}", "role": "user", "spans": spans, "normalized": pair}
    if not facts["start"] or not facts["end"] or facts["flexible"]:
        raise Clarification(DATE_QUESTION)
    try:
        validate_dates(date.fromisoformat(facts["start"]), date.fromisoformat(facts["end"]), maximum)
    except ValueError:
        raise Clarification(INVALID_DATE_QUESTION) from None
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
    if re.search(r"\b(?:rooms?|adults?|child|children|kids?)\b", remainder, re.I):
        return None
    return rooms


def country_code(value):
    matches = [item["code"] for item in reference_catalog("countries")
               if value.strip().casefold() in {item["code"].casefold(), str(item.get("name", "")).casefold()}]
    return matches[0] if len(matches) == 1 else None


def stay_criteria(message, context, draft):
    start, end, evidence = resolve_dates(message, context, draft)
    # Only authenticated traveler turns are eligible. Current values take precedence.
    texts = [text for _, text in search_history(message, context) if len(text) <= 2000] + [message]
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
        text = re.sub(r"\bpassengers:\s*[^;\n]+", "", text, flags=re.I)
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
    currency = "EUR"
    for text in texts:
        match = re.search(r"\bcurrency:\s*([^;\n]*)", text, re.I)
        if match:
            currency = match[1].strip().upper()
    if currency not in get_args(Currency):
        raise Clarification(CURRENCY_QUESTION)
    try:
        criteria = HotelSearch(destination={"city": parts[0].strip(), "country_code": code},
                               check_in=start, check_out=end, rooms=rooms, guest_nationality=nationality, currency=currency)
    except ValueError:
        raise Clarification(STAY_INPUT_QUESTION) from None
    return criteria, evidence


def travel_intent(message, context):
    if CANCEL.search(message):
        return False
    return bool(re.search(TRAVEL_TERM_PATTERN, message, re.I)
                or re.search(r"\b(?:nationality|check-in|check-out|rooms?)\b", message, re.I)
                or search_history(message, context))


FLIGHT_PARTY_QUESTION = "How many adults, children and infants are flying? Reply passengers: 2 adults, and include every child’s and infant’s age."
FLIGHT_DATE_QUESTION = "What are your departure and return dates, including the year?"
FLIGHT_COUNTRY_QUESTION = "Which country should be used for flight pricing? Reply flight country: country. This is separate from guest nationality."
AIRPORT_QUESTION = "Which departure and destination airports should I use? Reply origin: airport code; destination airport: airport code."
FLIGHT_INPUT_QUESTION = "Please check the distinct airports, passenger ages, flight country and travel dates before searching again."
CLARIFICATIONS.update({FLIGHT_DATE_QUESTION, FLIGHT_PARTY_QUESTION, FLIGHT_COUNTRY_QUESTION, AIRPORT_QUESTION, FLIGHT_INPUT_QUESTION})


def clarification_completed_modes(content):
    """Recognize only complete fixed host replies, never an arbitrary quoted prefix.

    A mixed reply may ask one mode's question while publishing the other mode.
    Retain the traveler inputs for that clarification, but don't search the already
    completed mode again unless the new traveler message explicitly requests it.
    """
    if content in CLARIFICATIONS:
        return set()
    questions = {"stays": {DATE_QUESTION, ROOM_QUESTION, NATIONALITY_QUESTION, DESTINATION_QUESTION, CURRENCY_QUESTION, INVALID_DATE_QUESTION, STAY_INPUT_QUESTION},
                 "flights": {FLIGHT_DATE_QUESTION, FLIGHT_PARTY_QUESTION, FLIGHT_COUNTRY_QUESTION, AIRPORT_QUESTION, INVALID_DATE_QUESTION, FLIGHT_INPUT_QUESTION}}
    statements = {mode: [*values,
        f"Here are {mode} options for your exact search dates.",
        f"No {mode} found. Try different dates or a different destination in Plan chat.",
        f"We couldn’t load {mode}. Try again from Plan chat. Your draft is unchanged."]
        for mode, values in questions.items()}
    for stay in statements["stays"]:
        for flight in statements["flights"]:
            lines = {"stays": stay, "flights": flight}
            pending = {mode for mode, line in lines.items() if line in questions[mode]}
            if not pending:
                continue
            suffix = " Nothing has been saved or booked." if any(line.startswith("Here are ") for line in lines.values()) else ""
            if content == stay + " " + flight + suffix:
                return set(lines) - pending
    return None


def completed_clarification_modes(context):
    completed = set()
    evidence = clarification_history(context)
    if not evidence:
        return completed
    for item in context.recent_messages[-12:][evidence[0][0]:]:
        if item.get("role") == "assistant":
            modes = clarification_completed_modes(item.get("content"))
            if modes is not None:
                completed.update(modes)
    return completed


class FlightInputs(FlightSearch):
    """Validate non-location inputs before resolving explicitly requested airports."""
    origin: str = Field(min_length=2, max_length=80)
    destination: str = Field(min_length=2, max_length=80)


def flight_criteria(message, context, draft):
    start, end, evidence = resolve_dates(message, context, draft, 365)
    history = context.recent_messages[-12:]
    entries = search_history(message, context) + [(len(history), message)]
    texts = []
    for index, text in entries:
        if len(text) > 2000:
            continue
        previous = history[index-1] if index else {}
        if previous.get('role') == 'assistant' and previous.get('content') == FLIGHT_COUNTRY_QUESTION and country_code(text.strip().rstrip('.!?')):
            text = 'flight country: ' + text.strip().rstrip('.!?')
        texts.append(text)
    fields, party = {}, None
    for text in texts:
        for key, pattern in {"origin": r"\borigin:", "destination": r"\bdestination airport:",
                             "country_code": r"\b(?:flight country|country of sale):",
                             "currency": r"\bcurrency:", "cabin_class": r"\bcabin:"}.items():
            match = re.search(pattern + r"\s*([^;\n]+)", text, re.I)
            if match:
                fields[key] = match[1].strip()
        route = re.search(r"\b([A-Z]{3})\s+(?:to|→)\s+([A-Z]{3})\b", text)
        if route:
            fields.update(origin=route[1], destination=route[2])
        passenger_text = re.sub(r'\b(?:1 room(?: for)?|room\s+\d+\s*:)\s*[^;\n]+', '', text, flags=re.I)
        if re.search(r'\b(?:passengers|adults?|children|child|infants?)\b', passenger_text, re.I):
            party = passenger_party(passenger_text)
    if not party:
        raise Clarification(FLIGHT_PARTY_QUESTION)
    fields["country_code"] = country_code(fields.get("country_code", ""))
    if not fields["country_code"]:
        raise Clarification(FLIGHT_COUNTRY_QUESTION)
    if not fields.get("origin") or not fields.get("destination"):
        raise Clarification(AIRPORT_QUESTION)
    known = {item["code"] for item in reference_catalog("airports")}
    if any(re.fullmatch(r"[A-Z]{3}", fields[key]) and fields[key] not in known for key in ("origin", "destination")):
        raise Clarification(AIRPORT_QUESTION)
    fields["currency"] = fields.get("currency", "EUR").upper()
    fields["cabin_class"] = fields.get("cabin_class", "ECONOMY").upper().replace(" ", "_")
    try:
        return FlightInputs(**fields, **party, departure_date=start, return_date=end), evidence
    except ValueError:
        raise Clarification(FLIGHT_INPUT_QUESTION) from None


def safe_flight(raw, criteria):
    flight = Flight.model_validate(raw)
    result = FlightOption.model_validate(flight.model_dump(include=set(FlightOption.model_fields)))
    for leg, origin, destination, day in [(result.outbound, criteria.origin, criteria.destination, criteria.departure_date),
                                         (result.inbound, criteria.destination, criteria.origin, criteria.return_date)]:
        if leg.segments[0].origin != origin or leg.segments[-1].destination != destination or leg.segments[0].departure_at[:10] != day.isoformat():
            raise ValueError("flight_route_mismatch")
        for index, segment in enumerate(leg.segments):
            datetime.fromisoformat(segment.departure_at)
            datetime.fromisoformat(segment.arrival_at)
            if index and leg.segments[index-1].destination != segment.origin:
                raise ValueError("flight_connection_mismatch")
    return result


def safe_photo(value):
    if not isinstance(value, str) or len(value) > 2000:
        return None
    try:
        public_https_url(value)
        parsed = urlsplit(value)
        if parsed.query or parsed.fragment or parsed.port not in (None, 443):
            return None
        return value
    except ValueError:
        return None


def safe_stay(raw):
    # Validate the provider shape, then explicitly reconstruct every nested field.
    hotel = Hotel.model_validate(raw)
    return StayOption(id=hotel.id, hotel_id=hotel.hotel_id, name=hotel.name, address=hotel.address,
        image_url=safe_photo(hotel.image_url), stars=hotel.stars, review_score=hotel.review_score,
        review_count=hotel.review_count, facilities=hotel.facilities,
        price=Price(**hotel.price.model_dump()),
        rooms=[StayRoom(**room.model_dump(include=set(StayRoom.model_fields))) for room in hotel.rooms])


class TravelSearchFailure(Exception):
    """An allow-listed failure code, never raw provider text."""

    def __init__(self, code):
        self.code = code if code in {"provider_timeout", "provider_unavailable", "provider_response_invalid", "invalid_search"} else "provider_unavailable"
        super().__init__(self.code)


class CanvasTravelObserver:
    names = {"travel_capabilities", "search_destinations", "search_stays", "search_airports", "search_flights"}
    max_calls = 5
    category_limits = {"lookup": 2}

    def __init__(self, client, context, authorization_token, draft, message, deadline=None, *, flight_only=False, parse_message=True):
        self.client, self.context, self.authorization_token = client, context, authorization_token
        self.draft, self.message = draft, message
        self.deadline = deadline or time.monotonic() + 120
        self.started_at = time.monotonic()
        self.calls = 0
        self.counts = {"capabilities": 0, "lookup": 0, "stays": 0, "flights": 0}
        self.cache, self.snapshots = {}, {}
        self.tool_bytes = 0
        self._tool_lock = asyncio.Lock()
        self.question, self.failure = None, False
        self.criteria_by_mode, self.evidence_by_mode, self.questions, self.failures = {}, {}, {}, set()
        if not parse_message:
            # Canvas tool calls supply structured model arguments. The legacy
            # parser remains only for the separate Research flight flow.
            self.active, self.modes, self.mode = True, ["stays", "flights"], "stays"
            return
        self.active = travel_intent(message, context)
        history = search_history(message, context)
        intent = " ".join([text for _, text in history] + [message])
        completed = completed_clarification_modes(context) if history else set()
        self.modes = [mode for mode, pattern in [("stays", STAY_TERM_PATTERN), ("flights", FLIGHT_TERM_PATTERN)]
                      if re.search(pattern, intent, re.I) and (mode not in completed or re.search(pattern, message, re.I))] or ["stays"]
        if flight_only:
            self.modes = ["flights"]
            self.names = {"travel_capabilities", "search_airports", "search_flights"}
        self.mode = self.modes[0]
        self.question, self.failure = None, False
        self.criteria_by_mode, self.evidence_by_mode, self.questions, self.failures = {}, {}, {}, set()
        if self.active:
            for mode in self.modes:
                try:
                    self.criteria_by_mode[mode], self.evidence_by_mode[mode] = (flight_criteria if mode == "flights" else stay_criteria)(message, context, draft)
                except Clarification as error:
                    self.questions[mode] = FLIGHT_DATE_QUESTION if mode == "flights" and str(error) == DATE_QUESTION else str(error)
            if not self.criteria_by_mode:
                self.question = next(iter(self.questions.values()))

    async def _call(self, action, criteria, category):
        if not self.active or self.question:
            raise ValueError("travel_input_required")
        key = json.dumps([action, criteria], sort_keys=True)
        if key in self.cache:
            return self.cache[key]
        limit = self.category_limits.get(category, 1)
        if self.calls >= self.max_calls or self.counts.get(category, 0) >= limit:
            raise ValueError("travel_call_limit")
        self.calls += 1
        self.counts[category] = self.counts.get(category, 0) + 1
        # Flight rates can take up to the connector's 115-second deadline.
        # Keep the enclosing turn deadline and time for the model's reply.
        timeout = min(120 if category == "flights" else 45, self.deadline - time.monotonic() - 5)
        if timeout <= 0:
            raise TimeoutError()
        async with asyncio.timeout(timeout) as deadline:
            result = await self.client.call("travel_search", {"action": action, "criteria": criteria},
                subject=self.context.traveler_scope, plan_id=self.context.plan_id,
                authorization_token=self.authorization_token)
            # A transport may finish after swallowing cancellation; that cannot make
            # its obsolete result eligible for caching or publication.
            if deadline.expired():
                raise TimeoutError()
            if asyncio.current_task().cancelling():
                raise asyncio.CancelledError()
        self.cache[key] = result
        return result

    async def invoke(self, name, arguments):
        async with self._tool_lock:
            return await self._invoke(name, arguments)

    async def _invoke(self, name, arguments):
        mode = "flights" if name in {"search_airports", "search_flights"} else "stays" if name in {"search_destinations", "search_stays"} else next(iter(self.criteria_by_mode), self.mode)
        try:
            if name not in self.names or arguments:
                raise ValueError("travel_tool_forbidden")
            if mode not in self.modes:
                raise ValueError("travel_mode_not_requested")
            if mode not in self.criteria_by_mode:
                raise Clarification(self.questions.get(mode, "Ask for this travel mode with complete search details first."))
            if mode in self.failures:
                raise ValueError("travel_mode_failed")
            criteria = self.criteria_by_mode[mode]
            caps = Capabilities.model_validate(await self._call("capabilities", {}, "capabilities"))
            if name != "travel_capabilities" and not (caps.flights if mode == "flights" else caps.hotels):
                raise ValueError("mode_unavailable")
            if name == "travel_capabilities":
                payload = {"stays": caps.hotels, "flights": caps.flights, "sandbox": caps.sandbox}
            elif name == "search_airports":
                criteria = await self.resolve_airports()
                payload = {"origin": criteria.origin, "destination": criteria.destination}
            elif name == "search_destinations":
                # Criteria already contain an explicit city/country. Lookup cannot override them.
                raw = await self._call("places", {"q": criteria.destination.city,
                    "country_code": criteria.destination.country_code}, "lookup")
                from ..travel_contracts import Places
                places = Places.model_validate(raw)
                payload = {"places": [item.model_dump() for item in places.places]}
            else:
                if name != f"search_{mode}":
                    raise ValueError("wrong_mode")
                if mode == "flights":
                    criteria = await self.resolve_airports()
                existing = next((item for item in self.snapshots.values() if item.mode == mode), None)
                if existing:
                    snapshot = existing
                else:
                    raw = await self._call("flights/search" if mode == "flights" else "hotels/search", criteria.model_dump(mode="json"), mode)
                    if raw.get("status") == "unavailable":
                        raise TravelSearchFailure(raw.get("code"))
                    if raw.get("status") == "invalid":
                        raise TravelSearchFailure("invalid_search")
                    if raw.get("provider") != "LiteAPI" or type(raw.get("sandbox")) is not bool or raw.get("status") not in {"ready", "empty"}:
                        raise ValueError("travel_response_invalid")
                    results = [safe_flight(item, criteria) if mode == "flights" else safe_stay(item) for item in raw["results"]]
                    if len(results) > 100 or raw.get("returned_count") != len(results) or (raw["status"] == "empty") != (not results):
                        raise ValueError("travel_count_invalid")
                    now = datetime.now(UTC)
                    normalized = criteria.model_dump(mode="json")
                    snapshot = (FlightSnapshot if mode == "flights" else StaySnapshot)(search_id=uuid4().hex, plan_id=self.context.plan_id,
                        generation=self.context.generation, mode=mode, criteria=criteria,
                        fingerprint=hashlib.sha256(json.dumps(normalized, sort_keys=True).encode()).hexdigest(),
                        draft_facts=draft_facts(self.draft), searched_at=now.isoformat(), expires_at=(now+timedelta(minutes=10)).isoformat(),
                        provider="LiteAPI", sandbox=raw["sandbox"], returned_count=len(results),
                        truncated=bool(raw.get("truncated")), notices=raw.get("notices", []), results=results,
                        search_only_dates=[normalized.get("check_in", normalized.get("departure_date")), normalized.get("check_out", normalized.get("return_date"))] != [draft_facts(self.draft)["start"], draft_facts(self.draft)["end"]])
                    while len(snapshot.model_dump_json().encode()) > 130000 and snapshot.results:
                        snapshot.results.pop()
                        snapshot.returned_count -= 1
                        snapshot.truncated = True
                    if len(snapshot.model_dump_json().encode()) > 130000:
                        raise ValueError("travel_payload_limit")
                    self.snapshots[snapshot.search_id] = snapshot
                    self.telemetry(mode, "complete", snapshot.returned_count, int(snapshot.truncated))
                payload = {"search_id": snapshot.search_id, "mode": mode, "count": snapshot.returned_count,
                           "options": [{"id": item.id, "label": (getattr(item, "name", None) or ", ".join(item.airlines))[:240], "price": item.price.model_dump(exclude={"excluded_taxes"})} for item in snapshot.results[:10]]}
            encoded = json.dumps(payload, ensure_ascii=False)
            if self.tool_bytes + len(encoded.encode()) > 24576:
                raise ValueError("travel_text_limit")
            self.tool_bytes += len(encoded.encode())
            return {"content": [{"type": "text", "text": encoded}]}
        except Clarification as error:
            self.questions[mode] = str(error)
            self.telemetry(mode, "needs_input")
            return {"is_error": True, "content": [{"type": "text", "text": str(error)}]}
        except asyncio.CancelledError:
            self.snapshots.clear()
            self.telemetry(mode, "cancelled", discard=1)
            raise
        except Exception as error:
            self.failure = True
            self.failures.add(mode)
            self.snapshots = {key: value for key, value in self.snapshots.items() if value.mode != mode}
            self.telemetry(mode, "search_failed", discard=1)
            code = "provider_timeout" if isinstance(error, TimeoutError) else error.code if isinstance(error, TravelSearchFailure) else "search_failed"
            details = {
                "provider_timeout": "This search exceeded its time limit; no results were received.",
                "provider_unavailable": "The provider could not complete this request; no results were received.",
                "provider_response_invalid": "The response could not be validated for these search criteria; this does not establish a service-wide outage.",
                "invalid_search": "The connector rejected the search criteria. Check airports, dates and passengers.",
                "search_failed": "This search could not be completed or validated. The cause is unknown; do not claim a provider outage.",
            }
            payload = {"error": code, "detail": details[code], "instruction": "Do not invent results or repeat a failed provider call automatically. A new traveler request authorizes a new search. You may resolve airport choices or discuss changed criteria; a failed request does not prohibit alternatives. Retain exact dates unless the traveler changes them."}
            return {"is_error": True, "content": [{"type": "text", "text": json.dumps(payload)}]}

    def telemetry(self, mode, outcome, results=0, discard=0):
        logging.getLogger(__name__).info("canvas_travel mode=%s outcome=%s calls=%d results=%d duration_ms=%d discard_count=%d",
            mode, outcome, self.calls, results, min(120000, max(0, int((time.monotonic()-self.started_at)*1000))), discard)

    async def resolve_airports(self):
        criteria = self.criteria_by_mode["flights"]
        if not isinstance(criteria, FlightInputs):
            return criteria
        fields = criteria.model_dump(mode="json")
        known = {item["code"] for item in reference_catalog("airports")}
        for key in ("origin", "destination"):
            value = fields[key]
            if value in known:
                continue
            if re.fullmatch(r"[A-Z]{3}", value):
                raise Clarification(AIRPORT_QUESTION)
            result = Airports.model_validate(await self._call("airports", {"q": value}, "lookup"))
            candidates = {item.iata for item in result.airports if item.iata in known}
            if len(candidates) != 1:
                raise Clarification(AIRPORT_QUESTION)
            fields[key] = next(iter(candidates))
        self.criteria_by_mode["flights"] = FlightSearch.model_validate(fields)
        return self.criteria_by_mode["flights"]

    def selected(self, selections):
        # Failed modes contribute no batch; independent complete modes stay available.
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

    def answer(self, bundles):
        lines = []
        for mode in self.modes:
            batch = next((value for value in bundles if value["mode"] == mode), None)
            if batch is not None:
                lines.append(f"Here are {mode} options for your exact search dates." if batch["results"] else f"No {mode} found. Try different dates or a different destination in Plan chat.")
            elif mode in self.questions:
                lines.append(self.questions[mode])
            else:
                lines.append(f"We couldn’t load {mode}. Try again from Plan chat. Your draft is unchanged.")
        if any(value["results"] for value in bundles):
            lines.append("Nothing has been saved or booked.")
        return " ".join(lines)

    def server(self):
        @tool("travel_capabilities", "Check enabled travel modes after required stay inputs are complete.", {})
        async def capabilities(args): return await self.invoke("travel_capabilities", args)
        @tool("search_destinations", "Look up the explicitly supplied city/country after all other inputs are complete.", {})
        async def destinations(args): return await self.invoke("search_destinations", args)
        @tool("search_stays", "Search stays using host-validated current dates, rooms, destination and nationality. No arguments.", {})
        async def stays(args): return await self.invoke("search_stays", args)
        @tool("search_airports", "Resolve explicitly supplied airports only after required flight facts pass the host gate. No arguments.", {})
        async def airports(args): return await self.invoke("search_airports", args)
        @tool("search_flights", "Search return flights with host-validated dates, airports, passenger ages and country. No arguments.", {})
        async def flights(args): return await self.invoke("search_flights", args)
        return create_sdk_mcp_server(name="travel", version="1.0.0", tools=[capabilities, destinations, stays, airports, flights])
