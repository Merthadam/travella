"""Offline contract evaluation for sanitized country/place research scenarios."""

from __future__ import annotations

import json
from collections import Counter
from pathlib import Path

CASES_PATH = Path(__file__).parent / "fixtures" / "research_cases.json"
EXPECTED_COUNTS = {
    "entry_applicability": 5,
    "health_safety": 4,
    "season_transport": 3,
    "unread_conflict": 3,
    "adversarial_control": 5,
}
REQUIRED_FIELDS = {
    "id", "category", "traveler_question", "synthetic_traveler", "expected_reads",
    "key_claims", "clarification_or_caveat", "allowed_tool_sequence", "terminal_behavior",
}


def load_cases() -> list[dict]:
    return json.loads(CASES_PATH.read_text(encoding="utf-8"))


def test_fixture_corpus_has_exact_required_count_and_category_mix():
    cases = load_cases()
    assert len(cases) == 20
    assert Counter(case["category"] for case in cases) == EXPECTED_COUNTS
    assert len({case["id"] for case in cases}) == 20


def test_each_fixture_has_sanitized_traveler_context_and_expected_contract():
    for case in load_cases():
        assert REQUIRED_FIELDS <= case.keys(), case["id"]
        assert case["synthetic_traveler"], case["id"]
        assert case["expected_reads"], case["id"]
        assert case["key_claims"] and case["clarification_or_caveat"], case["id"]
        assert case["terminal_behavior"], case["id"]
        assert set(case["allowed_tool_sequence"]) <= {"search", "read", "synthesize", "cancel"}, case["id"]
        assert case["allowed_tool_sequence"].count("search") <= 3, case["id"]
        serialized = json.dumps(case).casefold()
        assert "@gmail.com" not in serialized and "passport_number" not in serialized


def test_high_consequence_categories_require_scope_or_personalization_caveats():
    cases = load_cases()
    entry_cases = [case for case in cases if case["category"] == "entry_applicability"]
    assert all(any(term in case["clarification_or_caveat"].casefold() for term in ("passport", "itinerary", "traveler")) for case in entry_cases)
    health_cases = [case for case in cases if case["category"] == "health_safety"]
    assert any("clinician" in case["clarification_or_caveat"].casefold() for case in health_cases)
    assert any("audience" in case["key_claims"][0].casefold() or "scope" in case["key_claims"][0].casefold() for case in health_cases)


def test_evidence_failure_conflict_and_adversarial_cases_have_safe_terminals():
    cases = load_cases()
    by_id = {case["id"]: case for case in cases}
    assert by_id["EVIDENCE-01"]["terminal_behavior"] == "uncertainty_no_unsupported_claim"
    assert by_id["EVIDENCE-02"]["terminal_behavior"] == "conflict_explained_with_both_sources"
    assert by_id["EVIDENCE-02"]["expected_reads"] == [
        {"source_id": "official-page-a", "outcome": "read"},
        {"source_id": "official-page-b", "outcome": "read"},
    ]
    assert by_id["CONTROL-01"]["terminal_behavior"] == "answer_with_candidates_unchanged"
    assert by_id["CONTROL-04"]["terminal_behavior"] == "answer_with_inline_sources"
    assert by_id["CONTROL-05"]["terminal_behavior"] == "interrupted_without_late_output"
