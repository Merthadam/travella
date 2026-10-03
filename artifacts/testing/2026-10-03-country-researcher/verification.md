# Country Research Chat Planning Evidence

## Prototypes

Three interactive UI directions were explored and captured:

- [Clean Chat](plan/variant-a-clean-chat.png)
- [Research Replies](plan/variant-b-research-replies.png)
- [Research Thread](plan/variant-c-research-thread.png)

The user selected a pure full-screen chat direction and declined a context drawer. Prototype interactions were simulated; they did not call the real Agent, Tavily, CRUD, or user memory.

## Checks performed on the prototype

- Exercised each variant's in-chat interaction and citation affordance in Chrome DevTools.
- Checked a 390px viewport for horizontal overflow and confirmed no context/source side panels were present.
- Inspected console output after the prototype fixes; the final interaction pass was clean.

## Limits

The prototype screenshots document the design baseline only. The production page and end-to-end stream have now been implemented and automated, but this run could not reach an authenticated Plan in Chrome: the existing localhost app opened its signed-out account screen and no active browser session was present. Therefore real-user route behavior, desktop/mobile implementation screenshots, live stop/reload behavior, browser console/network inspection, and live-provider integration remain unverified. No credentials were printed or included in artifacts.

## Implementation checks

- `npm --prefix frontend test -- --run` — passed, 23 tests.
- `npm --prefix frontend run build` — passed.
- `uv run pytest -q services/agent/tests/test_model_provider.py services/agent/tests/test_agent_api.py services/agent/tests/test_agent_turn.py services/auth/tests/test_api.py services/crud/tests/test_api.py` — passed, 76 tests.
- `uv run ruff check` on all changed Agent/auth Python files and tests — passed.
- `git diff --check` — passed.
- `bash scripts/check.sh` — blocked by 19 lint findings in the pre-existing `services/crud/repository.py` (import ordering and compact one-line statements); this task did not modify that file.

Automated coverage now exercises the Plan-owned SSE endpoint, provider structured-text delta parsing, split SSE frames in the frontend reader, stop/interruption/retry UI behavior, source URL filtering, and existing Agent/auth/CRUD regressions. This is not a substitute for the authenticated Chrome gate above.
