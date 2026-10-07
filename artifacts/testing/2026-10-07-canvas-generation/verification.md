# Phase 15 implementation verification

Date: 2026-10-07. **Implemented; live generation acceptance remains pending.**

## Environment and scope

- Worktree branch: `prototype/planning-cards`. Local app: http://localhost:5174.
- Rebuilt `travella-local-single` using `bash scripts/start-local-ready.sh`; existing PostgreSQL volume preserved. Migration0010 applied. Existing Cognito pool/client validated without AWS resource changes.
- Startup sign-in, session and temporary sign-out checks passed. Browser checks used the required example account. No credentials, tokens, private keys or raw provider payloads are in this report.
- Six source hashes matched the final running container: canvas hook, view, API client, Agent service, deterministic mapping and CRUD canvas module.
- Production/shared deployments need the same persistent `CANVAS_EVIDENCE_SIGNING_KEY` on Agent and CRUD. Local startup now creates/preserves that key privately. No cloud deployment or AWS secret mutation performed.

## Inspected visual evidence

| View | Evidence |
|---|---|
| Approved design baseline | [Desktop](plan/approved-canvas-desktop.jpg), [mobile](plan/approved-canvas-mobile.jpg) |
| Saved canvas / map pin | [Desktop upper](implementation/saved-canvas-desktop.jpg), [desktop lower](implementation/saved-canvas-desktop-lower.jpg) |
| Responsive canvas | [Mobile upper](implementation/saved-canvas-mobile.jpg), [mobile map](implementation/saved-canvas-mobile-map.jpg) |
| Conflict preserves draft | [Mobile conflict](implementation/stale-save-retains-edits-mobile.jpg) |
| Earlier failed request preserved edits | [Failure state before request-ID fix](implementation/save-failure-retains-edits.jpg) |

Chrome DevTools screenshots were captured and visually inspected at 1440×1100 and 390×844. No horizontal overflow was observed (document/canvas widths matched viewport). Icons and Save colors now match the approved components after scoped CSS corrected collisions with global button styles. Desktop lower screenshot captures the separately scrolled canvas; it is not a composited image.

## Manual browser journey

Created one isolated Plan solely for verification (`682f4e50-6662-4d7a-94c4-6a2e1c52608d`). Existing Plans were not edited.

1. Added Vienna, Austria in the Trip Brief and selected the final destination without a model call.
2. Opened the connected canvas; seven approved live cards rendered. Google Maps resolved/framed Vienna.
3. Edited flexible dates, travelers, budget and a theme. While a card editor was open, Save/generation were disabled. Before Save, canvas GET remained null and canonical travelers/budget remained unchanged.
4. Actual Save button succeeded after correcting an invalid confirmation-request ID. Readback contained the edited fields, consistent travel subtitles and preserved theme. Reload/rebuild reopened the saved workspace directly.
5. Added Café Central from a live Google Places result, selected Food category and a note. The colored marker used provider coordinates and category color `#B75539`. Explicit Save persisted it; reload restored the pin. Unrelated card edits did not reframe the map; Show all places framed the pin on request.
6. Opened Flights browsing and returned. It explicitly showed unavailable search and no supplier offers/booking. No sample offer data was presented as live.
7. Advanced the saved Plan revision with a separate exact HTTP save, then edited budget locally. UI Save returned 409; local €1,800 remained visible while backend retained €1,500. Back displayed Leave without saving; Keep editing preserved the draft.
8. Reload restored the last saved version and pin. The disposable Plan was soft-deleted, restored to its exact snapshot, then soft-deleted again for cleanup.

## Actual HTTP persistence checks

All requests used real FastAPI handlers via the authenticated browser proxy unless noted. Write requests used fresh timestamp/UUID idempotency IDs, If-Match and exact server challenge. Only the isolated Plan was mutated.

| Operation / request | Observed result |
|---|---|
| GET canvas before first Save |200; snapshot null |
| POST canvas/challenge + PUT canvas |200 +200; exact reviewed snapshot stored |
| GET canvas and research-context after Save |200; traveler count/budget/dates synchronized atomically |
| Repeat identical PUT with same request ID and challenge |200; unchanged revision, no duplicate mutation |
| Update essentials / readback |200; changed travelers preserved other theme data |
| DELETE canvas with null snapshot / GET |200; snapshot null; context retained |
| Restore canvas via explicit PUT |200; theme and essentials preserved |
| Unknown component |422 |
| Contradictory flight subtitle vs essentials |422 `canvas_inconsistent`; no silent rewriting |
| Stale Plan/context revision |409; saved snapshot unchanged |
| Unauthenticated read |401 |
| Plan soft-delete / canvas read |200 /404 |
| Plan restore / canvas read |200 /200; exact snapshot equality |
| Final fixture cleanup / canvas read |200 /404; seven-day recovery retained by normal lifecycle |

Additional real HTTP ownership and generation-history checks are in [generation-context-http.md](generation-context-http.md): all canvas read/challenge/write/delete requests returned 401 unauthenticated and 404 for missing/other-owner Plans; no records changed. History pagination retained the original 55-message cutoff despite append, spans early messages, enforces revision/cursor/size boundaries, accepts 500 messages and flags 501 as incomplete with no message payload. Disposable fixtures and messages were physically removed, temporary sessions signed out.

## Static checks

- `npm --prefix frontend run build`: passed, final 522 modules; main bundle warning remains (~828kB minified).
- `npm --prefix frontend run build:components`: passed, 232 modules; studio bundle warning remains (~554kB).
- `uv run ruff check` scoped changed Agent/CRUD/auth Python modules: passed.
- `python -m compileall -q services/agent services/crud services/auth`: passed.
- `git diff --check`: passed.
- No automated tests added or run.

## Console/network review and fixes

- Fixed browser Save 400 caused by a suffixed idempotency ID; retried actual UI Save successfully.
- Fixed global button CSS leaking into approved canvas icons/Save hover.
- Rejected contradictory deterministic travel labels at save; aligned Agent mapping with frontend.
- Code review fixed retryable `context_locked`/`request_pending` errors being mistaken for stale revisions after Stop. Actual paid Stop race remains pending.
- Final source-matched reload successfully restored saved canvas. Console showed development Lit warning and Google Advanced Marker event API advisory. No canvas render exception observed. Expected404s were generated by deletion checks; expected409/422 by negative checks.
- Container restarts briefly caused auth/session 500 during service startup; health-gated readiness and subsequent authentication/reload passed. These were not reported as successful app requests.

## Remaining verification

**No paid Claude Agent SDK calls were run.** Actual generated theme correctness, source-grounded findings/conflicts, inaccessible pages, one-review/one-revision behavior, cancellation, group retry, cost and latency remain unmeasured. No deployed AgentCore execution was performed.

Normal chat regression, provider outage/ambiguity, country viewport, keyboard-only journey, reduced motion and cross-process evidence reuse remain pending. Evidence cache is process-local and expires after 30 minutes; saved canvas persists independently. Automated regression tests remain unrun.

The local implementation is available for manual use. Phase 15 remains `human_needed` with [UAT cases](../../../.planning/phases/15-bounded-agentic-canvas-generation/15-UAT.md); this report does not claim end-to-end model verification.
