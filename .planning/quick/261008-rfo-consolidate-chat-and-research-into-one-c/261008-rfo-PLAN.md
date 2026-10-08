# Simplify the active LLM flow

Approved: remove obsolete agentic onboarding and legacy shortlist paths; consolidate conversation and research into one Claude Agent SDK invocation per chat turn. Keep canvas generation as a separate LangGraph node and retain its approved review policy.

## Implementation

1. Remove obsolete route/writer prompts, separate chat research graph node and unused onboarding HTTP/Runtime handlers. Simplify active service dispatch while preserving authorization, idempotency, context leases, cancellation and saved state ownership.
2. Implement a single SDK chat loop with optional web tools and one structured result containing answer, state changes and observed citation IDs. Stream only the answer field from StructuredOutput input deltas; never stream JSON, reasoning, tool commentary or state changes. Validate all changes before committing.
3. Share short-lived, traveler/Plan-scoped evidence reuse between chat and canvas. Keep memory/profile and AgentCore transport intact. Update current architecture docs.

## Verification

Static lint/compile/build and manual bounded SDK/HTTP/browser checks as appropriate. Do not add or run automated tests. Use only isolated verification Plans and sanitized outputs. Confirm normal chat does not use web tools, explicit research can read/cite sources, state edits persist only after validated completion, cancellation preserves partial text and releases the lease, and canvas remains a separate branch. Record any unexercised cases honestly.
