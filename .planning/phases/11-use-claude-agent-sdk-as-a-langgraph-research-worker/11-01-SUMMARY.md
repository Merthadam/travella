---
phase: 11-use-claude-agent-sdk-as-a-langgraph-research-worker
plan: "01"
subsystem: agent
tags: [claude-agent-sdk, langgraph, agentcore]
status: validation_pending
requirements-completed: []
completed: null
---

# 11-01: Isolated Claude SDK worker

Implementation is committed; validation gates remain open.

## Accomplishments

- Locked claude-agent-sdk 0.2.163; bundled native Claude CLI 2.1.286.
- Added observed WebFetch evidence validation, named packaged travel-research skill, disposable session/config directories and a child environment allowlist.
- One SDK research loop selects evidence. A tool-free SDK synthesis call within the same worker streams actual text; citation URLs are checked before emission.
- Bounded searches, page reads, turns, aggregate cost, wall-clock time and output. Cancellation closes/reaps the SDK transport before removing the run directory.
- Worker receives bounded Plan/history/advisory memory context and cannot mutate Plans.

## Commit

`25b82ec` — implementation commit on codex/trip-brief-context-ui.

## Validation

Ruff, dependency lock, imports/schema and native CLI inspection passed. Mock worker coverage was authored by the executor but not run. Live provider behavior, native WebFetch hook payloads and process cleanup during live Stop remain unverified.

## Decisions and deviations

- D-15 supersedes earlier plan wording that placed refinement in LangGraph. SDK alone owns research iterations; LangGraph owns the surrounding workflow.
- Packaged skill lives under services/agent/research_assets/.claude so container COPY includes it and each worker can load an isolated copy.
- Production application defaults to SDK; legacy routing is retained only as explicit rollback/injected existing test configuration.
- Buildx was unavailable; native ARM64 Docker build was used.
- No frontend or CRUD schema redesign, cloud deployment, or push occurred.

## Remaining verification

See 11-VERIFICATION.md. Do not mark the phase fully verified based on implementation or image build alone.
