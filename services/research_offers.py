"""Bounded advisory intent and public, server-owned Research offer contracts."""
from __future__ import annotations

import re
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field


class StrictOfferModel(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)


class DraftOfferProposal(StrictOfferModel):
    intent: Literal["offer", "defer", "request_review"] = "offer"
    reason: Literal["useful_context", "traveler_request", "traveler_deferred"] = "useful_context"
    priority_message_ids: list[Annotated[str, Field(min_length=1, max_length=36)]] = Field(default_factory=list, max_length=12)
    source_quote: str = Field(default="", max_length=500)


class ResearchReadiness(StrictOfferModel):
    eligible: bool
    reasons: list[Literal["destination_required", "timing_required", "travelers_required", "priorities_required", "context_locked"]]


class ResearchOffer(StrictOfferModel):
    id: str
    status: Literal["available", "review", "deferred", "consumed", "superseded"]
    revision: int
    message_id: str | None = None


class ResearchOfferAction(StrictOfferModel):
    action: Literal["request_review", "defer", "confirm"]
    offer_id: str | None = Field(default=None, max_length=36)


class ResearchEntryConsume(StrictOfferModel):
    receipt: str = Field(min_length=1, max_length=100)
    request_id: str = Field(min_length=1, max_length=100)
    revision: int = Field(ge=1)


_PRIORITY_TERMS = r"\b(food|temples?|museums?|art|architecture|hiking|beach(?:es)?|nature|history|culture|nightlife|relax(?:ed|ing|ation)?|shopping|skiing|wildlife|photography|local cuisine|walking|sightseeing)\b"
_NEGATION = r"\b(not|don't|dont|no|dislike|hate|avoid|instead|unsure|undecided)\b"


def priority_conflict(text: str) -> bool:
    value = text.casefold()
    return bool(re.search(_NEGATION, value) and (
        re.search(_PRIORITY_TERMS, value) or re.search(r"\b(priorities|interests|preferences)\b", value)))


def normalized_priorities(text: str, *, stated_field: bool = False) -> set[str]:
    """Extract bounded interests from explicit assertions, never generic questions.

    A directly edited interests field is already an explicit traveler assertion.
    Conversation text additionally needs personal preference language. References
    validate provenance separately; semantic identity deliberately excludes IDs.
    """
    value = text.casefold().replace("’", "'")
    if priority_conflict(value):
        return set()
    preferences = set()
    for sentence in re.findall(r"[^.!?;\n]+[.!?;\n]?", value):
        sentence = sentence.strip()
        if not stated_field and re.search(
                r"\b(?:want to know|want to find out|would like to know|wonder|according to|"
                r"website|article|says|said|told)\b", sentence):
            continue
        personal = re.match(
            r"(?:for (?:this|our|my) (?:trip|holiday),?\s+)?(?:"
            r"(?:i|we)\s+(?:(?:really|especially|both|mostly)\s+)?"
            r"(?:want|prefer|love|like|enjoy|value|prioriti[sz]e|(?:am|are) interested in)\b|"
            r"(?:my|our)\s+(?:priorities|interests|preferences)\s+(?:are|include)\b)", sentence)
        endorsement = re.fullmatch(r"[a-z ,'-]+\b(?:sounds?|seems?) (?:great|ideal|perfect|good)[.!]?", sentence)
        if not stated_field and (sentence.endswith("?") or not (personal or endorsement)):
            continue
        for term in re.findall(_PRIORITY_TERMS, sentence):
            preferences.add({"museums": "museum", "temples": "temple", "beaches": "beach",
                "local cuisine": "food", "relax": "relaxation", "relaxed": "relaxation",
                "relaxing": "relaxation"}.get(term, term))
    return preferences


def priority_evidence(text: str) -> bool:
    return bool(normalized_priorities(text))


def explicit_draft_request(text: str) -> bool:
    """Whole-message traveler intent wins over a model-selected positive substring."""
    value = text.casefold().replace("’", "'")
    if re.search(r"\b(not|don't|dont|no|never|later|keep researching|continue researching|keep looking)\b", value):
        return False
    return bool(re.search(
        r"(?:^|[.!;]\s*)(?:please\s+|let's\s+|lets\s+|(?:can|could|would) you\s+|"
        r"(?:i|we) (?:want to|would like to|am ready to|are ready to)\s+)?"
        r"(?:create|make|generate|review)\b[^.!?;]*\b(?:draft|itinerary)\b", value.strip()))


def assess_research_readiness(context, *, has_priorities: bool = False, locked: bool = False) -> ResearchReadiness:
    def explicit(field):
        provenance = context.provenance.get(field)
        return provenance is not None and provenance.source in {"user_edit", "user_explicit"}

    reasons = []
    if not context.finalDestination or not explicit("finalDestination"):
        reasons.append("destination_required")
    if not ((context.flexibleDates and explicit("flexibleDates")) or
            (context.dateStart and context.dateEnd and explicit("dateStart") and explicit("dateEnd"))):
        reasons.append("timing_required")
    if not context.travelers or not explicit("travelers"):
        reasons.append("travelers_required")
    if not has_priorities:
        reasons.append("priorities_required")
    if locked:
        reasons.append("context_locked")
    return ResearchReadiness(eligible=not reasons, reasons=reasons)
