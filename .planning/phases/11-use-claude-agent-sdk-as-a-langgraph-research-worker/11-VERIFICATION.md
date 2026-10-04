---
phase: 11-use-claude-agent-sdk-as-a-langgraph-research-worker
status: verification_pending
verified: null
---

# Phase 11 execution evidence

## Delivered implementation

- SDK owns bounded search/read/refine iteration and a separate tool-free streamed synthesis step.
- LangGraph selects the research stage and invokes its SDK worker exactly once.
- Existing AgentCore hosting, advisory memory, candidate/map tools and AG-UI contracts remain in place.
- Secret resolution and both local container paths are configured; no production resource or traffic was changed.

## Completed checks

| Check | Result |
| --- | --- |
| Ruff services/agent and local secret helper | Passed |
| Python compilation services/agent and local secret helper | Passed |
| Dependency lock / SDK schema imports | Passed, worker executor |
| Research configuration tests | 21 passed, runtime executor |
| Existing local secret helper tests | 14 passed, runtime executor |
| Shell syntax / both Compose configurations | Passed, runtime executor |
| Linux/ARM64 runtime image | Built successfully on native ARM64 Docker |
| Bundled CLI startup | Claude Code 2.1.286; nonroot execution confirmed by runtime executor |
| Diff whitespace check | Passed |

The worker executor added deterministic mocked coverage; it has not been run. No full graph/API suite, end-to-end evaluation, browser check or live provider call is claimed. Further automated test runs were not undertaken under the active instruction to run tests only when requested.

## Open validation gates

1. Run SDK worker and graph/API regressions, adding SDK-specific graph coverage if needed. Existing graph fixture tests explicitly exercise legacy behavior.
2. Exercise a real factual research turn: native WebSearch/WebFetch hooks must yield successfully read source records, grounded prose and incremental final text.
3. Exercise discovery: provider candidate IDs/selection must remain intact alongside an explanatory answer.
4. Exercise Stop, disconnect, deadline and provider failure; ensure the child is reaped, partial text is marked interrupted/stopped, and late output is suppressed.
5. Run the existing research corpus against the new worker and review source conflicts, unavailable pages and injection cases before rollout.
6. Deploy only through the documented explicit canary/rollback procedure.

## Existing limitation discovered

The HTTP composition currently constructs AgentGraph without a durable checkpointer and does not persist/reload research_state through CRUD. This phase preserves the graph/checkpointer interface, compact evidence contracts and AgentCore profile context; it does not establish cross-restart evidence reuse. Do not claim SDK sessions provide that persistence. This is separate from the existing persisted chat and traveler profile memory.

## Runtime caveats

Native WebFetch response normalization is based on the pinned tool contract and requires live validation. DNS/public-URL checks plus SDK tool permissions do not replace a deployment-level outbound network boundary. SDK subprocess cancellation uses a pinned private transport class; upgrades require lifecycle validation.
