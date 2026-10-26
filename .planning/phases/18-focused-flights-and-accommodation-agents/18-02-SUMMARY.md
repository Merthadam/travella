---
phase: 18-focused-flights-and-accommodation-agents
plan: "02"
status: implemented
---

# 18-02: Accommodation matching

A disposable Claude SDK specialist uses current provider catalogs, apartment/facility/refundable filters, bounded searches and property/review/room inspections. The host constructs comparisons from observed evidence. Live browser testing caught a loft-versus-kitchenette rate mismatch; structured room IDs now bind room, price and terms together.

Primary implementation: services/agent/claude/travel_specialist.py; services/agent/claude/canvas_travel_tools.py; services/mcps/liteapi.py.

Verification: 441 Agent/gateway/topic integration tests passed before the final room/budget corrections; final focused checks and real PostgreSQL migration/CRUD results are recorded in [execution evidence](../../../artifacts/testing/2026-10-25-focused-travel/verification.md). See that report for the exact commands, baseline failures, inspected screenshots and live sample limits. Source commit is the integrated Phase18 feature commit containing this summary; no merge or push was performed.

Plan adaptation: one additive migration 0012 covers topic messages/state/runs; separate proposed test files were consolidated into test_specialist_worker.py, test_specialist_tools.py, test_topic_conversations.py and TravelConversation.test.jsx. This preserves the behavioral checks rather than requiring speculative filenames. Planning visual evidence was resolved with isolated Chrome DevTools. User authorization superseded the earlier no-auto-execution planning note.
