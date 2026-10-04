---
quick_id: 261004-i7e
status: complete
description: Configure Cognito automatically in the Travella local startup skill
files_modified:
  - .agents/skills/travella-local/SKILL.md
---

# Default local Cognito startup summary

Updated the local startup instructions to discover and validate Travella's existing Cognito pool and public client before starting Docker, then write the derived settings to the ignored root `.env` without displaying AWS identity or configuration values.

## Accomplishments

- Documented unique discovery of the expected `User pool - travela-local` pool and `travella-local-phase2` client in `eu-north-1` using the AWS `default` profile.
- Added validation for password authentication and absence of a client secret before composing the issuer and JWKS URL into `.env`.
- Kept the existing one-attempt example-account smoke check and documented missing migration revisions as an independent startup failure that requires preserving the PostgreSQL volume.

## Verification

- Reviewed the updated skill to confirm Cognito discovery and validation precede `scripts/start-local-ready.sh`.
- Confirmed the app-client JSON is captured privately and checked with `python3` for an absent `ClientSecret` field plus `ALLOW_USER_PASSWORD_AUTH`; AWS responses and generated values are not echoed.
- Confirmed the `.env` ignore rule is checked and the example-account check still makes one attempt.
- `git diff --check -- .agents/skills/travella-local/SKILL.md` passed.
- No application or browser run was needed for this documentation-only task.
