# AgentCore research integration verification

## Local authenticated browser flow

- Started the repository's local stack with `bash scripts/start-local-ready.sh`; the example account sign-in, session check, and sign-out check passed.
- Signed in through Chrome DevTools at `http://localhost:5174` using the supplied example account in a fresh isolated browser context.
- Verified first-login onboarding questions, profile review, skip-and-continue, the authenticated Plans list, and the existing Plan conversation/history.
- The initial `/auth/session` request returned 401 before sign-in, as expected. Sign-in and subsequent session/profile/onboarding/Plans/Plan requests returned 200.
- No application console errors appeared. Console also reported the expected initial 401, React's development notice, and a form-field id/name accessibility warning.
- Screenshots: [Plans list](implementation/plans-list.png), [Plan chat](implementation/plan-chat.png).

## Automated checks

- `uv run --locked pytest -q services/agent/tests services/mcps/tests` — 133 passed.
- `uv run --locked pytest -q services/auth/tests services/crud/tests scripts/tests` — 128 passed, 4 skipped.
- `npm test --prefix frontend -- --run` — 26 passed.
- `npm run build --prefix frontend` — passed.
- Focused Ruff checks for changed agent/auth/CRUD modules — passed.
- `docker-compose config >/dev/null` — passed.
- `bash scripts/check.sh` — stopped at Ruff on 17 pre-existing style violations in `services/crud/repository.py` (`I001`, `E701`, `E702`); that file is unchanged by this integration.

## Integration notes

- The AgentCore Runtime route hosts the existing LangGraph agent service; it does not replace LangGraph with Claude Agent SDK.
- Runtime deployment resources still need to be provisioned in AWS. Local startup continues to refresh shared credentials and keys from Secrets Manager.
- Existing Trip Brief WIP was kept in a local stash and is not part of this integration.
