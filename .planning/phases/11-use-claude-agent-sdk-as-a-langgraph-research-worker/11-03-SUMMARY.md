---
phase: 11-use-claude-agent-sdk-as-a-langgraph-research-worker
plan: "03"
subsystem: agent
tags: [claude-agent-sdk, langgraph, agentcore]
status: validation_pending
requirements-completed: []
completed: null
---

# 11-03: Runtime credentials and packaging

Implementation is committed; validation gates remain open.

## Accomplishments

- Added authoritative Secrets Manager ARN loading, validated numeric bounds and sanitized configuration failures.
- Wired both Compose layouts and agent-only local launcher credential injection.
- ARM64 production image includes the skill and native SDK CLI, and runs as nonroot.
- Documented model settings, scoped IAM, canary and explicit legacy rollback. Corrected the unsupported OpenAI secret-ARN claim.

## Commit

`93cd596` — implementation commit on codex/trip-brief-context-ui.

## Validation

Runtime executor reported 21 config tests and 14 existing secret-helper tests passing, plus shell syntax and quiet Compose checks. Native ARM64 build and nonroot CLI startup passed. Root rebuilt integrated image successfully. No SDK graph/API suite, evaluation run, authenticated canary or cloud deployment was performed.

## Decisions and deviations

- D-15 supersedes earlier plan wording that placed refinement in LangGraph. SDK alone owns research iterations; LangGraph owns the surrounding workflow.
- Packaged skill lives under services/agent/research_assets/.claude so container COPY includes it and each worker can load an isolated copy.
- Production application defaults to SDK; legacy routing is retained only as explicit rollback/injected existing test configuration.
- Buildx was unavailable; native ARM64 Docker build was used.
- No frontend or CRUD schema redesign, cloud deployment, or push occurred.

## Remaining verification

See 11-VERIFICATION.md. Do not mark the phase fully verified based on implementation or image build alone.
