# Phase 02 Pattern Map

## Existing analogs

| Planned concern | Closest existing pattern | Reuse / boundary |
|---|---|---|
| CRUD FastAPI app | `services/auth/app.py`, `services/auth/api.py` | Use `create_app` factory, dependency injection, typed JSON errors, and test client fixtures. Keep Plan ownership in a new CRUD service. |
| Token-derived ownership | `services/auth/authorization.py` (`traveler_key`, `require_owner`) | Extract/reuse the subject-first rule; CRUD must independently verify the token before calling it. |
| Session boundary | `services/auth/session_store.py`, `services/auth/api.py`, `frontend/src/api.js` | Browser keeps same-origin HttpOnly cookie; do not expose Cognito tokens. Extend the internal boundary through an allow-listed CRUD client. |
| React async generations | `frontend/src/AccountApp.jsx` (`generation.current`) | Apply request-generation guards so late list/open/rename/delete responses cannot replace current private state. |
| Browser request errors | `frontend/src/api.js` (`ApiError`, `readSession`) | Preserve safe error shape, same-origin credentials, no-store cache policy, and deduplicated refresh. Add explicit PATCH/DELETE only with idempotency/revision headers. |
| Local verification | `scripts/check.sh`, `services/auth/tests`, `frontend/AccountApp.test.jsx` | Add CRUD pytest modules and lifecycle Vitest coverage; run existing full suite and build. |

## Greenfield files expected

`services/crud/app.py`, `services/crud/api.py`, `services/crud/config.py`, `services/crud/auth.py`, `services/crud/models.py`, `services/crud/repository.py`, `services/crud/contracts.py`, `services/crud/migrations/`, `services/crud/tests/`, and frontend lifecycle components/tests are new. Do not treat `services/auth/session_store.py` as a Plan repository.

## Important existing mismatch

The repository's current `pyproject.toml` and `scripts/check.sh` are the source of truth: Python tests run through `uv run pytest -q`, frontend tests through `npm test --prefix frontend`, and build through `npm run build --prefix frontend`. Phase 1 planning artifacts contain stale `npm test -- --runInBand tests/auth/*.test.ts` examples; those paths do not exist here.
