# Single SDK chat loop

## Delivered

- Two-node graph: chat and canvas_generation. Removed model routing, separate chat research node and second answer writer.
- One structured chat result contains answer, state changes, question flag and observed citation IDs. Answer-only partial JSON projection preserves real streaming; validation precedes context commit.
- Retired obsolete agentic onboarding endpoints/prompts, Gateway/local-MCP adapters, legacy shortlist dispatch/snapshots and old refinement contracts. Independent connector services remain intact.
- Shared isolated SDK runtime retained for chat and canvas; canvas generate/review/optional-revise policy is unchanged.
- Preserved AgentCore Runtime envelopes, canonical profile/memory context, CRUD run leases, cancellation and explicit canvas save.
- Shared successful-read cache between chat and canvas, scoped by traveler and Plan; 30-minute process lifetime.
- Current code map: docs/agent/llm-flow.md. Updated AgentCore runtime runbook.

## Evidence

artifacts/testing/2026-10-08-single-sdk-chat/verification.md

Lint, compile, imports, source hashes and local auth passed. Live chat emitted 49 text chunks and persisted travelers=2; explicit research emitted 81 chunks with an observed official Salzburg citation and saved matching text. Temporary Plans cleaned up. No automated tests added/run. Live cancellation and canvas model generation were not exercised; savings unmeasured.

## Deviations

None in feature scope. Static removal exposed one stale package import, fixed before final rebuild. Old tests for removed features were retired; retained test helpers follow the new interfaces.
