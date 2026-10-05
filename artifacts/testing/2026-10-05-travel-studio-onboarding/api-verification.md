# Phase12 manual CRUD verification

Executed 2026-10-05 against real FastAPI CRUD handlers over HTTP at `127.0.0.1:8124`, with an isolated SQLite database and two synthetic traveler identities. No paid model calls, AWS memory writes, automated test suites, or test files were used. Fixture authorization values are omitted.

Launch: `PYTHONPATH="$PWD" uv run --locked python /tmp/travella-phase12-api-server.py`. Requests issued directly with `httpx.request` / `httpx.patch`; payload and stored-response assertions executed inline.

| Check | Method/path | Observed |
|---|---|---|
| Missing profile has pending v2 and revision zero | `GET /v1/traveler-profile` | PASS (200) |
| Missing auth rejected | `GET /v1/traveler-profile` | PASS (401) |
| Unknown fixture identity rejected | `GET /v1/traveler-profile` | PASS (401) |
| Create explicit home and airport | `PATCH /v1/traveler-profile/onboarding` | PASS (200) |
| Read saved home | `GET /v1/traveler-profile` | PASS (200) |
| Save needs without erasing home | `PATCH /v1/traveler-profile/onboarding` | PASS (200) |
| Read saved needs and prior home | `GET /v1/traveler-profile` | PASS (200) |
| Duplicate original event replays original snapshot | `PATCH /v1/traveler-profile/onboarding` | PASS (200) |
| Replay did not roll back canonical data | `GET /v1/traveler-profile` | PASS (200) |
| Reused event with changed body rejected | `PATCH /v1/traveler-profile/onboarding` | PASS (409) |
| Stale independent mutation rejected | `PATCH /v1/traveler-profile/onboarding` | PASS (409) |
| Home skip rejected | `PATCH /v1/traveler-profile/onboarding` | PASS (422) |
| Invalid city rejected | `PATCH /v1/traveler-profile/onboarding` | PASS (422) |
| Unknown country rejected | `PATCH /v1/traveler-profile/onboarding` | PASS (422) |
| Unknown airport rejected | `PATCH /v1/traveler-profile/onboarding` | PASS (422) |
| Provider coordinates excluded | `PATCH /v1/traveler-profile/onboarding` | PASS (422) |
| Wrong step fields rejected | `PATCH /v1/traveler-profile/onboarding` | PASS (422) |
| Oversized needs rejected | `PATCH /v1/traveler-profile/onboarding` | PASS (422) |
| Four interests rejected | `PATCH /v1/traveler-profile/onboarding` | PASS (422) |
| Unknown interest rejected | `PATCH /v1/traveler-profile/onboarding` | PASS (422) |
| Duplicate custom cannot count as fifth | `PATCH /v1/traveler-profile/onboarding` | PASS (422) |
| Four catalog plus one custom saved | `PATCH /v1/traveler-profile/onboarding` | PASS (200) |
| Read exact interest arrays and compatibility text | `GET /v1/traveler-profile` | PASS (200) |
| Citizenship country list saved | `PATCH /v1/traveler-profile/onboarding` | PASS (200) |
| All steps now complete version2 | `GET /v1/traveler-profile` | PASS (200) |
| Clear both needs explicitly | `PATCH /v1/traveler-profile/onboarding` | PASS (200) |
| Clear optional default airport | `PATCH /v1/traveler-profile/onboarding` | PASS (200) |
| Clears persist with city retained | `GET /v1/traveler-profile` | PASS (200) |
| Clear citizenship list | `PATCH /v1/traveler-profile/onboarding` | PASS (200) |
| Cleared citizenship list persists | `GET /v1/traveler-profile` | PASS (200) |
| Legacy PUT preserves omitted fields and completion | `PUT /v1/traveler-profile` | PASS (200) |
| Legacy PUT readback preserved structured profile | `GET /v1/traveler-profile` | PASS (200) |
| Legacy PUT preserves omission on empty payload | `PUT /v1/traveler-profile` | PASS (200) |
| Skip interests preserves saved selections | `PATCH /v1/traveler-profile/onboarding` | PASS (200) |
| Skip preserves confirmed arrays and legacy text | `GET /v1/traveler-profile` | PASS (200) |
| Skip with unsaved changes rejected | `PATCH /v1/traveler-profile/onboarding` | PASS (422) |
| Browser subject field rejected | `PATCH /v1/traveler-profile/onboarding` | PASS (422) |
| Second identity cannot see alpha | `GET /v1/traveler-profile` | PASS (200) |
| Concurrent first saves serialize: one200 and one409 | `PATCH /v1/traveler-profile/onboarding` | PASS (200 + 409) |
| Concurrent first save readback revision one | `GET /v1/traveler-profile` | PASS (200) |
| Resolve optional needs without home | `PATCH /v1/traveler-profile/onboarding` | PASS (200) |
| Resolve optional interests without home | `PATCH /v1/traveler-profile/onboarding` | PASS (200) |
| Optional steps cannot complete without required home | `GET /v1/traveler-profile` | PASS (200) |
| Seed legacy free text on isolated fixture | `PUT /v1/traveler-profile` | PASS (200) |
| Legacy profile remains v2 pending | `GET /v1/traveler-profile` | PASS (200) |
| Skip legacy needs preserves both texts | `PATCH /v1/traveler-profile/onboarding` | PASS (200) |
| Skip legacy interests preserves prose | `PATCH /v1/traveler-profile/onboarding` | PASS (200) |
| Retain existing legacy citizenship with catalog addition | `PATCH /v1/traveler-profile/onboarding` | PASS (200) |
| New arbitrary citizenship rejected | `PATCH /v1/traveler-profile/onboarding` | PASS (422) |
| Explicit home replacement completes migrated profile | `PATCH /v1/traveler-profile/onboarding` | PASS (200) |
| Alpha data unchanged by beta operations | `GET /v1/traveler-profile` | PASS (200) |
| Canonical profile for context boundary | `GET /v1/traveler-profile` | PASS (200) |
| Deterministic context and memory schema retain structured fields/clears, exclude progress | `local projection /v1/traveler-profile` | PASS (PASS) |

## Representative request shapes

Home Continue: `{"step":"home","action":"continue","expected_revision":0,"event_id":"<UUID>","values":{"home_city":{"name":"Prague","country_code":"CZ","source":"manual"},"default_airport":"PRG"}}`. GET returned revision1, same city/airport, home completed, completed_version0.

Needs clear: `{"step":"needs","action":"continue","expected_revision":4,"event_id":"<UUID>","values":{"food_needs":"","accessibility_needs":""}}`. Subsequent GET returned both empty strings and retained home/interests.

Interests Continue used four catalog IDs (`hiking`, `skiing`, `beaches`, `local-food`) plus custom `Rail journeys`. Four alone and a duplicate `HIKING` custom entry returned422; five distinct values saved and read back.

The concurrent first-save check dispatched two PATCH requests for the same new subject at expected_revision0. Exactly one returned200 and one409; GET returned revision1.

Duplicate replay returned the complete original revision1 snapshot after canonical state had reached revision2; a following GET still returned revision2 and its saved needs. Changed event content returned409.

The legacy fixture retained original arbitrary departure/interests/citizenship text until explicit replacement; skip did not erase legacy fields. Old PUT omitted structured keys and completion survived both explicit false and empty payload.

## Deterministic memory/context boundary

`profile_context`, `TurnContext.bounded`, and `TravelerProfileMemoryRequest` preserved all structured fields and explicit null/empty values. Progress, revision, existence, receipts and timestamps were absent from the model-facing projection. The memory request retained updated_at for mirror freshness. No live model or memory provider invocation was made.

## Remaining verification

Auth proxy, actual Cognito session, PostgreSQL advisory locks, browser journey and provider-memory outage behavior require the parent integration exercise. This fixture verifies SQLite concurrency and the real CRUD API. Long-run receipt eviction was source-inspected but not exercised here.

## Cleanup

Stopped the fixture server with SIGTERM, confirmed port8124 no longer accepts connections, and deleted only its isolated temporary SQLite database directory. Existing application/account data was untouched.
