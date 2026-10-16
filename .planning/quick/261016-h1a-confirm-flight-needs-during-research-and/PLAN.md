---
type: quick
status: complete
---

# Confirm flight needs before generation

User request: establish flight needs with traveler confirmation during research; generate the flight component only when needed. Scope is flights only.

## Acceptance

- Research asks about flight needs without inferring a decision. Explicit chat answers and direct controls are authoritative.
- Generation review requires a Yes/No flight choice, persists explicit confirmation through the existing revision-checked context edit, then generates using that returned revision. Cancellation does not generate; failures retain the review.
- The agent rejects unconfirmed flight context before model generation. A confirmed No omits the flight component; Yes includes it. Partial regeneration cannot bypass confirmation.
- Frontend supports absent flights through rendering, editing, generation, save/reload and travel navigation. Regeneration removes a previous flight card after a confirmed No.
- Existing saved snapshots remain readable. No database migration or unrelated accommodation behavior change.

## Tasks

1. Trace context provenance, generation and snapshot contracts. Capture current state and a reviewable UI sketch. Prototype alternatives offered; user chose the existing design.
2. Add flight confirmation to research/review and server generation; support optional flight components end to end. Add focused behavioral coverage, including HTTP context persistence and generation rejection.
3. Run relevant Python/frontend tests and build. Rebuild the local stack and verify as the example account with Chrome DevTools: undecided, Yes, No, failed confirmation, save/reload and mobile review. Record screenshots and verification under artifacts/testing/2026-10-16-flight-confirmation/.

## Threat model

Do not trust inferred values as traveler confirmation. Keep canonical context revision checks, authorization, idempotency and explicit save boundaries. Browser-provided selections must pass the existing context edit API. Do not expose credentials in verification artifacts.

## Execution

GSD quick initialized; executing inline per the skill's spawn restriction. The existing Chrome DevTools MCP profile is occupied; use an isolated Chrome DevTools MCP process, preserving the user's existing browser.
