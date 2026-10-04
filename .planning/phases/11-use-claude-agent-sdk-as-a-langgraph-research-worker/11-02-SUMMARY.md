---
phase: 11-use-claude-agent-sdk-as-a-langgraph-research-worker
plan: "02"
subsystem: agent
tags: [claude-agent-sdk, langgraph, agentcore]
status: validation_pending
requirements-completed: []
completed: null
---

# 11-02: LangGraph and chat integration

Implementation is committed; validation gates remain open.

## Accomplishments

- Added SdkResearchNode and production composition default claude-agent-sdk. LangGraph SDK research node has one invocation and a direct END edge.
- Preserved configured conversation/onboarding provider, AgentCore advisory-memory input, verified candidate/map tools and source projection.
- Source/answer result validation occurs again at the graph boundary. SDK transcripts and credentials never enter graph state.
- Retained explicit legacy backend rollback. Existing adapter fixtures now request that backend explicitly.
- Stream failures preserve partial replies as interrupted; optional map failures do not discard a completed answer.

## Commit

`afa843a` — implementation commit on codex/trip-brief-context-ui.

## Validation

Ruff and Python compilation passed. Graph/API integration suite and browser/live chat paths were not run during this implementation. Existing HTTP composition does not persist/reload compact research_state across restarts; this pre-existing limitation remains and is documented.

## Decisions and deviations

- D-15 supersedes earlier plan wording that placed refinement in LangGraph. SDK alone owns research iterations; LangGraph owns the surrounding workflow.
- Packaged skill lives under services/agent/research_assets/.claude so container COPY includes it and each worker can load an isolated copy.
- Production application defaults to SDK; legacy routing is retained only as explicit rollback/injected existing test configuration.
- Buildx was unavailable; native ARM64 Docker build was used.
- No frontend or CRUD schema redesign, cloud deployment, or push occurred.

## Remaining verification

See 11-VERIFICATION.md. Do not mark the phase fully verified based on implementation or image build alone.
