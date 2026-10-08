---
status: resolved
trigger: Summary and useful links finish empty after canvas generation.
created: 2026-10-08
updated: 2026-10-08
---

## Symptoms

- Expected: generation populates themes/preferences and useful websites when trip context supports them.
- Actual: user reports both finish empty.
- Timeline: current connected canvas; exact onset unknown.
- Reproduction: generate the Plan canvas.
- Scope: repair existing generation; canvas chat sidebar is a later step.

## Current Focus

root_cause: The destination research prompt permitted skipped research and review accepted empty results; UI also hid group failures in empty ready cards.
resolution: Require useful sourced destination research, reject empty output through the existing bounded repair, and show honest retry states while preserving completed content.

## Evidence

- Both generated groups catch exceptions and set group_status=error without exposing diagnostics; the UI preserves empty ready cards and shows a separate retry status.
- Chat was exercised previously, but paid canvas generation was explicitly unverified.

## Verification approach

Inspect the real browser and make bounded live requests for this bug. Preserve existing Plans. No automated tests unless requested. Record sanitized stage/failure metadata; never prompts, tokens, profile data or raw provider payloads.

- Live synthetic SDK reproduction: themes generated three items (two calls, $0.0126055). Research returned zero findings/links with zero searches/reads (two calls, $0.0103789). Review accepted the empty research output. Existing time/cost limits were not exhausted.
- Real browser reproduction with an isolated Salzburg Plan: themes rendered five items from chat/profile; research notes and websites both finished empty under a false "Draft ready" banner. Asked whether the reported summary means research notes or themes.
- Changes: explicit evidence acquisition when destination resources are missing; bounded validation/repair rejects empty research; empty failed cards display existing Retry UI and partial generation no longer claims the full draft is ready.
- Rebuilt local stack with Cognito/auth readiness passing; all four modified runtime files match the running image by SHA-256.
- User clarified "summary" means Good to know research notes. Both reported empty components belong to this worker.
- Repaired worker live SDK diagnostic: two findings and one website from one successful page read; generate + review cost $0.0781134, no budget increase. Existing suitable destination URL was read directly (zero searches).
- First repaired browser run was interrupted by Chrome net::ERR_NETWORK_IO_SUSPENDED. Error cards rendered with Retry. A fresh isolated Plan is being used to finish browser save/resume checks.

## Resolution evidence

- Full browser generation produced three findings and one useful website; themes remained populated independently.
- Save plan and GET readback returned the same three findings, one website and five themes. Reload, sign-in after rebuild, and mobile rendering retained those counts.
- Offline regeneration preserved existing content and exposed an enabled Retry with a connection error, without a false ready notice. Restoring connectivity and reloading recovered the saved canvas.
- Final local rebuild/auth readiness succeeded; source hashes match the running container. Chrome console has only the existing Lit development warning. Relevant online reads returned 200.
- Both isolated diagnostic Plans were soft-deleted; active reads return 404. Existing traveler Plans/profile were not altered.
- No automated tests were added or run. Manual verification and screenshots: artifacts/testing/2026-10-08-canvas-empty-cards/verification.md.
