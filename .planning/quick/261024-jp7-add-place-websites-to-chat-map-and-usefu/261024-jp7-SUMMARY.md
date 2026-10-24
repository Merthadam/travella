---
status: complete
---
# Place websites

Implemented optional Google Places websites across connector, signed chat suggestions, map previews, saved map/list details, and JSONB snapshots. Explicit additions append deduplicated useful links atomically; research regeneration retains those links. Existing snapshots remain supported. No finalization changes.

Validation: 58 provider/CRUD tests + 39 focused frontend tests pass; build passes. Authenticated desktop live-provider chat → preview → Add → API read → reload → saved map and Useful websites verified. Screenshots inspected. Full frontend and broader agent failures match unchanged baseline (6 and 9 respectively).

Cognito connectivity recovered after a transient outage. Authenticated mobile place details and chat websites checked without horizontal overflow; mobile map screenshot inspected. Extra mobile chat capture timed out (desktop chat evidence available); external destination-page load not verified. Test Plan deleted through authenticated HTTP, subsequent canvas read 404, cleanup session signed out. See artifacts/testing/2026-10-24-place-websites/verification.md for all evidence and baseline failures.

Implementation commit: 4a5db39. Runtime is http://localhost:5174; no push/merge.
