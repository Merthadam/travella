---
status: verifying
trigger: "found a bug very weird searching doesnt work now"
created: 2026-10-16
updated: 2026-10-16
---

# Travel follow-up loop

## Symptoms

- Expected: understand explicit conversational passenger answers, retain the active search request, and search when required criteria are available.
- Actual: host asks for passengers; traveler says "all 3 adults"; host repeats the same question. A later model apology acknowledges the answer but requests destination confirmation and promises a Budapest–Milan flight/apartment search; "yes look for those flights" does not reliably continue.
- Errors: no visible transport error; repeated clarification and unsupported promise to search.
- Timeline: reported after Phase16 implementation and local restart on eaf08b4.
- Reproduction: user-supplied screenshots; dates shown23–26Oct, year not visible. Do not assume a year or airport that is not confirmed in available evidence.

## Current Focus

hypothesis: rigid passenger grammar rejects natural replies; exact assistant-copy matching also drops active search context after a freeform explanation.
test: replay screenshot turns against production criteria/editor/service boundaries with isolated fixtures.
expecting: "all 3 adults" currently repeats passenger question; no checkout or durable Plan mutation should be enabled by fix.
next_action: root rebuilds e498b8a and checks the existing broken conversation in Chrome; independent review pending.

reasoning_checkpoint:
  hypothesis: "The mandatory passengers: grammar rejects all 3 adults; a later non-fixed assistant apology terminates the clarification chain, so pronoun follow-ups lose even explicit traveler facts."
  confirming_evidence:
    - "Two new real HTTP/graph/editor regressions fail before changes: all 3 adults repeats FLIGHT_PARTY_QUESTION; the screenshot repair/yes chain fails to advance to flight pricing country."
    - "The parser reads passenger facts only after passengers:, and clarification_history requires the last assistant turn to exactly equal fixed host copy."
  falsification_test: "If ordinary adult answers still repeat the question after parsing, or a correct party cannot reach SDK tool invocation with all other fields explicit, these are not sufficient causes."
  fix_rationale: "Parse unambiguous traveler clauses and retain only a bounded host-anchored chain of recognized replies/repair requests; never extract facts from assistant prose."
  blind_spots: "Live model behavior remains for root Chrome verification; unknown phrasing must clarify rather than guess."
  candidate_causes:
    - "code: rigid grammar and overly fragile clarification continuity"
    - "data/config: incomplete Canvas location/flight pricing country, or stale container source"
  and_gate: "yes: the grammar causes the first loop; the later repair/apology breaks context, compounding it. Missing airports/country are legitimate separate questions."

## Evidence

- Initial inspection: flight_criteria only matches `passengers:` followed by a rigid fullmatch; clarification_history stops at any non-host assistant text. travel_intent does not recognize simple affirmative follow-ups alone.
- Latest restart: current source hashes matched running container; startup/authentication checks passed. This is a behavioral problem, not demonstrated service downtime.
- Pre-fix `uv run --locked pytest services/agent/tests/test_canvas_travel.py -k 'natural_adults_followup or screenshot_repair' -q`: 2 failed. First failure returns the identical passenger question, no provider invocation. The screenshot-shaped fixture includes exact Canvas dates, no authoritative airports/country, and an assistant-only BUD/MXP/HU claim that must not become search evidence.
- Root independently reproduced the loop through authenticated Chrome on an isolated test Plan, including a freeform apology followed by a repeated date question despite exact dates in the original traveler request. The user's existing Plan was read only, not mutated by testing.
- Source fix e498b8a accepts complete natural adult allocations (numeric or spelled counts, including all 3 adults) and explicit child/infant ages; ambiguous or malformed current allocations cannot reuse an old party. A bounded 12-message host-anchored chain can cross freeform assistant prose only through recognized traveler answers/repair requests. Assistant prose never supplies fields. Cancel, unrelated topic, and explicit new search terminate reuse. Pricing-country plain replies are normalized only in response to that exact host question.
- Existing broken-history regression now includes: explicit original dates with empty Canvas dates, all 3 adults, repeated party question, what are you doing, freeform apology, yes, erroneous date question, yes again. Actual SDK tool handler and HTTP/SSE search complete with the original traveler dates and three adults, without a confirmed Plan destination. Separate test requires missing pricing country then airports, ignoring assistant-only BUD/MXP/HU.
- Model input now includes host-computed travel_search_readiness. Canvas prompt distinguishes read-only search destination from durable Plan confirmation and forbids promises while search tools are inactive. It does not grant new tools or infer dates, airports, pricing country or ages.
- `uv run --locked pytest services/agent/tests/test_canvas_travel.py services/agent/tests/test_agent_checkpoint.py -q`: 191 passed in 16.19s, including the eight HTTP→SSE→React journeys. Final focused run after narrowing cancellation to avoid matching non-stop flights: 16 passed, 170 deselected in 0.69s.
- Guardrail temporary source-only revert (bounded subprocesses, all modified source restored in finally): original natural-adult and exact-date repair regressions both failed on baseline; both passed after reapply. No unowned files or browser state were altered.

## Resolution

root_cause: "Rigid passengers: grammar rejected ordinary answers; exact assistant-copy continuity lost active traveler criteria after a repair/apology. Model prompt did not clearly separate read-only search readiness from Plan destination confirmation."
fix: "Bounded natural passenger parsing and host-anchored traveler-only continuity, focused country reply normalization, explicit reset boundaries, and authoritative tool readiness in model context/prompt."
oracle_type: specified
verification:
  target_test: {result: pass}
  mutation_check: {result: skipped, reason: "No Stryker configuration exists; Python regression sites covered by source revert/reapply instead."}
  no_op_deletion: {result: pass, deletion_justified_by_rca: true}
  adjacent_tests: {result: pass, suites_run: [test_canvas_travel, test_agent_checkpoint]}
  revert_and_reconfirm: {result: pass, bug_returned_on_revert: true, fixed_on_reapply: true}
  guardrail_verdict: accepted
  chrome: pending root verification after rebuild
  independent_review: pending
commit: e498b8a
files_changed:
  - services/agent/claude/canvas_travel.py
  - services/agent/claude/canvas_editor.py
  - services/agent/prompts/canvas-editing-v1.md
  - services/agent/tests/test_canvas_travel.py
