---
phase: 17-research-phase-cleanup
plan: agent
subsystem: agent
status: complete
scope: delegated-agent-service-slice-only
completed: 2026-10-23
tags: [claude-agent-sdk, langgraph, research-offers, confirmation]
requires:
  - phase: 17-02
    provides: CRUD-owned research offer contracts, persistence and confirmation authority
provides:
  - Bounded research proposals in the existing single SDK conversation loop
  - Committed, message-bound public offer projection and fresh replay authority
  - Canonical first-draft confirmation receipt enforcement
affects: [17-03, 17-04, 17-05]
tech-stack:
  added: []
  patterns: [atomic-authority-projection, canonical-first-draft-gate]
key-files:
  created:
    - services/agent/tests/test_research_offers.py
    - services/agent/tests/test_research_offer_integration.py
  modified:
    - services/agent/claude/sdk_conversation.py
    - services/agent/prompts/chat-v1.md
    - services/agent/graph/nodes/conversation.py
    - services/agent/state/contracts.py
    - services/agent/turn.py
    - services/agent/service.py
    - services/agent/crud_client.py
    - services/agent/http_contracts.py
key-decisions:
  - CRUD is the authority for current readiness, persistent deferral, message associations and confirmation receipts.
  - Initial full generation requires confirmation according to canonical research_entry_required; existing saved or previously accepted drafts and group retries retain their controls.
  - Duplicate chat events refresh offer authority before replaying cached prose.
requirements-completed: []
commits: 1
plan_head_before: a321e9126a806191a2c521065dd6fcc3d595d799
---

# Phase 17 Agent Slice Summary

The existing Claude SDK turn now carries bounded Research invitations and explicit defer/request intents through LangGraph to CRUD; only committed server-owned actions appear in the transcript.

## Accomplishments

- Added optional typed `draft_offer` to the existing output schema, with the shared bounded reason/intent/reference contract. No extra model call, framework, tool or generation worker changes.
- Supplied canonical readiness/deferral policy and bounded authorized message IDs to the same SDK loop. Prompt now acknowledges destination progress, requires useful trip context, permits flight resolution during review, and respects persistent deferral and separate Save plan.
- Transferred proposals through graph state into successful context completion. Stripped graph-supplied public actions. Published `research_offer` and committed `assistant_message_id` only after CRUD completion, with matching message association. Older offers are not attached to unrelated replies.
- Added allowlisted terminal/snapshot projection, with canonical offer refresh on duplicate chat-event replay so deferred, consumed or superseded cards do not return as available.
- Added optional `research_entry_receipt` transport. Canonical first-draft gating rejects omission; valid receipts require full generation and reviewed revision. Durable receipt consumption prevents duplicate generation after process restart. Saved/accepted draft regeneration and group retries require canonical existing-draft authority.

## Commit

- `6846e43` — feat(17-03): carry grounded research offers through committed agent turns.

The one-commit count above was measured from the persisted per-slice ledger immediately after this implementation commit. Parent-owned and sibling commits are outside this slice.

## Verification

Executed after the final implementation changes:

```text
uv run --locked pytest services/agent/tests/test_research_offer_integration.py services/agent/tests/test_research_offers.py services/agent/tests/test_agent_turn.py services/agent/tests/test_flight_generation.py -q
60 passed
```

The integration tests use the actual authenticated CRUD FastAPI handlers through the production `CrudContextReader`/`CrudPlanReader`, signed test JWTs and isolated SQLite persistence. They read back offer/message linkage, exercise review and confirmation, consume the receipt, replay the request in the same and a fresh Agent service instance, and verify one generation invocation. They also prove natural-language deferral persists and a generic yes does not request review. Model/generation adapters are deterministic; no paid provider calls were made.

Focused unit cases cover strict malformed proposals, one SDK call, policy/message-ID transport, graph projection exclusion, successful/ineligible completion, duplicate events, cancelled/failed/stale completion, current offer-status refresh, initial-generation omission, receipt replay, existing regeneration and group retries, and prompt policy.

All nine changed Python files passed `ruff check`; `git diff --check -- services/agent` passed. No TODO/FIXME/placeholder implementations were introduced.

Earlier broad assessment:

```text
uv run --locked pytest services/agent/tests services/agent/evals -q
119 passed, 1 failed
```

That run preceded the three final stale-replay parameter cases; those cases pass in the final focused command above. The lone broad failure is the pre-existing `test_agent_api.py::test_profile_memory_sync_uses_verified_identity_and_safe_status`: its expected profile omits existing default `home_city`, `default_airport`, `interest_ids` and `custom_interests` fields. The unchanged HEAD implementation already includes those fields. No unrelated fixture change was made. Existing dependency deprecation warnings were also left unchanged.

## Deviations and Integration Decisions

- Parent authorized shared-branch commits on `feat/research-cleanup-17` for this explicit fan-out; files were individually staged with no branch switch or sibling edits.
- Added real cross-service HTTP persistence coverage beyond the planned mocked transport cases to catch message-ID and receipt-contract mismatches.
- Parent requested mandatory first-draft receipt enforcement using canonical canvas/accepted-receipt state; implemented through CRUD-owned `research_entry_required`, preserving existing generation paths.
- Shared contracts and canonical policy are owned by the CRUD worker. Full plan 17-03/04 acceptance and STATE/ROADMAP updates remain parent-owned.

## Limitations

This completes the delegated agent implementation slice, not Phase 17 acceptance. Chrome desktop verification, frontend evidence, PostgreSQL-specific lifecycle checks and combined phase sign-off remain with the parent/CRUD worker. Live model quality was not evaluated; deterministic tests do not prove how often the model recommends an appropriate invitation. Existing Phase 15 acceptance gaps remain unchanged.

## Self-Check: PASSED

Both added test files exist. Implementation commit `6846e43` exists and contains only the ten owned `services/agent/**` files. Agent working tree is clean after the commit; no deletion was included.

## Final review fix

370fcd2 enforces first-entry authority for all generation actions, fails closed when canonical authority is missing, and preserves retries after a previously accepted unsaved draft changes flights. Final focused suite72 passed; parent combined Agent/gateway89 passed. Canonical CRUD classification now uses any accepted entry, while receipt consumption remains exact-revision. No paid calls.
