---
status: verifying
trigger: "for some reason researching now does not work"
created: 2026-10-04
updated: 2026-10-04
---

## Symptoms
- Expected: factual and destination research completes through Claude Agent SDK and streams its answer.
- Actual: user reports no response on research requests; normal chat still replies.
- Error/reproduction: replayed the relevant research request without modifying its Plan or conversation.

## Current Focus
- Root cause: destination discovery aborts on empty legacy candidate results before the SDK worker runs. Separately, streamed model answers over 2,000 characters throw instead of returning a bounded reply.
- Next action: manual browser acceptance of research, shared sidebar updates, and Retry.
- Workflow: GSD debug, inline execution. No automated tests requested or run.

## Evidence
- Local app container is healthy; stdout has no request failure details because errors are caught and projected.
- Isolated browser session is signed out; no failed research request available there.
- Database metadata shows failed user turns without assistant replies, alongside a successful ordinary conversation. No active lease or blocked database transaction remains.
- Search service returned HTTP 200; direct connector replay returned uncertain with zero candidates. The research node explicitly raised on that result.
- SDK replay independently routed to destination_discovery, then failed at the answer-length guard with research_output_invalid.
- Frontend terminal handling initially marked an error interrupted, then overwrote it with error; the component only renders Retry for interrupted.

## Resolution
- Legacy candidates are optional; SDK research proceeds when the connector is empty/unavailable. Source projection and shared candidate state remain available without legacy cards.
- Streamed prose is bounded at a complete token with an explicit shortening notice; text no longer throws merely for exceeding the character limit.
- Terminal errors retain the safe failure message and interrupted/retry presentation.
- Frontend build, Python compilation, diff check, rebuilt local health, example authentication, and all six changed container source hashes passed.
- Rebuilt worker replay completed in 38 seconds with 1,686 answer characters, 120 matching stream chunks, two read sources, and five candidate names.
- No automated tests added or run. Screenshot capture denied by Chrome DevTools configured workspace roots; full example-account browser acceptance remains incomplete.
