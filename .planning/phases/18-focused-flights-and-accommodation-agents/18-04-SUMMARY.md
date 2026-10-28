---
phase: 18-focused-flights-and-accommodation-agents
plan: "04"
status: implemented
---

# 18-04: Research memory and explicit choices

CRUD owns bounded attributed notes, signed observed evidence, shortlist and preferred choices. Exact challenge/commit, revisions, idempotency and the shared Plan lease protect writes. Only confirmed safe facts reach shared context and Trip. Shortlist stays researching; preferred becomes ready/unbooked; removal reopens research; changed party marks the historical choice needs_review. These transitions were exercised in real HTTP tests and the browser.

Primary implementation: services/travel_topics.py; services/crud/topic_conversations.py; services/auth/crud_client.py.

Verification: 441 Agent/gateway/topic integration tests passed before the final room/budget corrections; final focused checks and real PostgreSQL migration/CRUD results are recorded in [execution evidence](../../../artifacts/testing/2026-10-25-focused-travel/verification.md). See that report for the exact commands, baseline failures, inspected screenshots and live sample limits. Source commit is the integrated Phase18 feature commit containing this summary; no merge or push was performed.

Plan adaptation: one additive migration 0012 covers topic messages/state/runs; separate proposed test files were consolidated into test_specialist_worker.py, test_specialist_tools.py, test_topic_conversations.py and TravelConversation.test.jsx. This preserves the behavioral checks rather than requiring speculative filenames. Planning visual evidence was resolved with isolated Chrome DevTools. User authorization superseded the earlier no-auto-execution planning note.
