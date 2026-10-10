---
status: complete
date: 2026-10-08
---
# LiteAPI capability exploration

Researched current official documentation and tested the user-provided sandbox credential from AWS Secrets Manager without printing or persisting it.

- Hotel discovery, rich content, and date/occupancy rate search succeeded. Five Rome hotels returned; comparison fields include meal plans, cancellation deadlines and excluded city taxes.
- Flight return search succeeded on one bounded retry with 218 journeys; first request timed out after 55 seconds.
- Experiences search returned HTTP 403 / error 40301; access enablement remains needed.
- Documented exact hotel-offer white-label checkout is a promising fit for Travella's existing external-handoff boundary. Hosted domain/account compatibility and production booking behavior remain unverified.
- No documented rental-car/transfer inventory API was established.
- No prebook, payment, booking, cancellation, account mutations or application implementation performed.
- Identified local follow-up: the current shared-secret helper rejects the newly added LITE_API_KEY until its allowlist/routing is updated.

Research and sanitized endpoint evidence: `docs/research/liteapi-capabilities-2026-10-08.md`.

Verification: official sources checked, authenticated remote sandbox responses inspected through selected public fields/aggregate counts, no credentials or raw provider payloads saved, `git diff --check` passed. No source-code tests needed for this documentation-only task.
