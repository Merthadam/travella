"""Single-purpose Q&A node for first-login traveler intake."""

from __future__ import annotations

import re
from typing import Any, Literal, TypedDict

from ...turn import MAX_HISTORY, MAX_TEXT

TOPICS = frozenset(
    {"departure_base", "citizenship", "food_needs", "accessibility", "travel_interests"}
)
MAX_CANDIDATES_PER_TURN = 5
_STREET_ADDRESS = re.compile(
    r"\b\d{1,6}\s+[\w.'-]+(?:\s+[\w.'-]+){0,3}\s+"
    r"(?:street|st\.?|road|rd\.?|avenue|ave\.?|boulevard|blvd\.?|"
    r"lane|ln\.?|drive|dr\.?|way|court|ct\.?|place|pl\.?)\b",
    re.IGNORECASE,
)


class AnswerCandidate(TypedDict):
    topic: str
    value: str
    source_quote: str


class OnboardingIntakeState(TypedDict, total=False):
    messages: list[dict[str, str]]
    action: Literal["ask", "candidate", "finish"]
    assistant_text: str
    answer_candidates: list[AnswerCandidate]


class OnboardingIntakeNode:
    """Ask/clarify only; it has no profile, search, or persistence dependencies."""

    def __init__(self, model: Any) -> None:
        self.model = model

    async def __call__(self, state: OnboardingIntakeState) -> dict[str, Any]:
        messages = _bounded_messages(state.get("messages", []))
        collect = getattr(self.model, "collect_onboarding_answers", None)
        if collect is None:
            return _fallback("What travel detail would make planning easier for you?")
        try:
            result = await collect(messages=messages)
        except Exception:
            return _fallback("What travel detail would make planning easier for you?")
        if not isinstance(result, dict):
            return _fallback("What travel detail would make planning easier for you?")

        action = result.get("action")
        if action not in {"ask", "candidate", "finish"}:
            return _fallback("What travel detail would make planning easier for you?")
        assistant_text = result.get("assistant_text")
        if not isinstance(assistant_text, str) or not assistant_text.strip():
            return _fallback("What travel detail would make planning easier for you?")

        candidates = _validated_candidates(result.get("answer_candidates"), messages)
        if action == "candidate" and not candidates:
            action = "ask"
        if action == "finish":
            candidates = []
        return {
            "action": action,
            "assistant_text": assistant_text.strip()[:MAX_TEXT],
            "answer_candidates": candidates,
        }


def _bounded_messages(raw: list[dict[str, str]]) -> list[dict[str, str]]:
    if not isinstance(raw, list):
        return []
    messages: list[dict[str, str]] = []
    for item in raw[-MAX_HISTORY:]:
        if not isinstance(item, dict) or item.get("role") not in {"user", "assistant"}:
            continue
        content = item.get("content")
        if isinstance(content, str) and content.strip():
            messages.append({"role": item["role"], "content": content[:MAX_TEXT]})
    return messages


def _validated_candidates(raw: Any, messages: list[dict[str, str]]) -> list[AnswerCandidate]:
    if not isinstance(raw, list):
        return []
    user_messages = [message["content"] for message in messages if message["role"] == "user"]
    latest_user_message = user_messages[-1] if user_messages else ""
    accepted: list[AnswerCandidate] = []
    for candidate in raw[:MAX_CANDIDATES_PER_TURN]:
        if not isinstance(candidate, dict):
            continue
        topic = candidate.get("topic")
        value = candidate.get("value")
        quote = candidate.get("source_quote")
        if (
            topic not in TOPICS
            or not isinstance(value, str)
            or not value.strip()
            or not isinstance(quote, str)
            or not quote.strip()
            or not latest_user_message
            or quote not in latest_user_message
            or value not in quote
            or _STREET_ADDRESS.search(value)
        ):
            continue
        accepted.append(
            {"topic": topic, "value": value.strip(), "source_quote": quote.strip()}
        )
    return accepted


def _fallback(question: str) -> dict[str, Any]:
    return {"action": "ask", "assistant_text": question, "answer_candidates": []}
