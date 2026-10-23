---
status: resolved
trigger: Natural Obertauern clarification disables stay tools after keyword patch
---

# Semantic travel tools

The user supplied the complete reproduction and explicitly rejected keyword-driven conversations. The previous fix only expanded a vocabulary; a bare city answer still fails focused_followup, and stay_criteria requires a literal destination label and comma-country.

## Current Focus

- Root cause: tool availability, argument extraction and clarification text all sit behind a deterministic natural-language parser. The LLM receives empty readiness and cannot recover.
- Work: replace the Canvas gate with always-available read-only tools accepting structured model arguments. LLM interprets the bounded conversation and asks natural clarifications; server validates contracts, dates/source evidence, budgets, permissions and observed results.
- Preserve: no Plan mutation, no booking tools, exact-date requirement, private credentials, cancellation and bounded calls, A2UI provider results and preloaded manual navigation.
- Verification: scripted SDK tests for ordinary city replies/no keyword, invalid/missing tool inputs and actual SSE projection; real SDK/browser Obertauern journey on5175, own test Plan only. Existing Research flight path remains separate.
- Inline GSD debug per Codex spawn restriction. No frontend design changes.

## Implementation / automated evidence
- Canvas now uses CanvasTravelTools with typed MCP arguments; language parsing bypassed entirely. Removed readiness payload, conditional tool denial and host-authored travel replies. Model receives bounded history and current draft, selects tools and writes answers.
- Shared provider budgets, safe projections, observed-ID selection, private auth, cancellation/checkpoint protections retained. Dates validate concrete ISO range and match Canvas or require exact traveler quotes; semantic interpretation is explicitly the model's role.
- 25 independent semantic-tool tests pass. Legacy provider/projection fixtures now generate explicit model calls using their old synthetic vocabulary; these are explicitly NOT language understanding tests. Combined Canvas/Research/checkpoint suite245 passed. Adjacent worker/turn/state/evals49 passed.
- Created isolated test Plan462550e0-ce14-4d6d-8c78-09098d406172 on5175 with bare Obertauern, unconfirmed destination, exact datesFeb1–7 2027, two travelers. User Plan untouched. Old code reproduced mandatory destination label; model freeform then requested labeled room/nationality. Will continue same conversation after rebuild using ordinary wording.

## Resolution
Source c66dff4 deployed on5175; all five runtime source/prompt/skill hashes match. Actual model resumed the previously broken test conversation from bare “obertauern”, reused natural room/nationality reply and returned one real-provider sandbox stay with photo. Manual-page navigation preloaded exact criteria/result. Vague next-month request asked for exact dates; natural “March first to March seventh in 2027” produced March1–7 search-only previews (3 of4), retaining February Canvas dates and unconfirmed destination. No saved Plan mutation. 245 focused plus49 adjacent tests pass. Browser console clean except existing Lit warning, relevant HTTP200.

Evidence: artifacts/testing/2026-10-16-travel-semantic-tools/verification.md. Separate Research flight dispatch is explicitly outside this Canvas fix; semantic extraction is model-owned and server validation does not claim deterministic natural-language interpretation.
