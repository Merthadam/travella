# LiteAPI read-only inspection tools — 2026-10-25

Implemented on `locrian-peacock`, based on main `4e0780a`, with the research-note commits already present. The running main stack was not rebuilt or changed.

## Delivered behavior

- Private MCP and Claude SDK catalog expose `get_stay_details`, `get_stay_reviews`, `get_stay_rates`, and `verify_flight_offer`.
- Details and per-hotel rates reuse existing normalized LiteAPI operations; reviews and read-only flight verification add typed contracts and connector operations.
- Flight verification resolves a provider-account/traveler/Plan-scoped opaque search ID. References expire within ten minutes, are limited to 512 process-local entries, and fail closed after restart/eviction or scope mismatch. A multi-replica deployment requires shared state or affinity for reliable cross-request verification.
- Model evidence omits supplier offer identifiers, checkout handles and reviewer identity fields. Reviews redact email addresses and HTTP links; summaries are labeled AI-generated. Unknown fare terms remain unknown.
- Date provenance, provider capability checks, cancellation, caching and bounded calls/output remain enforced. Current-turn flight previews reflect verified fares. No new tool reserves, pays, books, or persists Plan changes.

## Executed checks

| Check | Observed result |
| --- | --- |
| Initial existing connector, checkout, semantic tool and travel API regression run | 67 passed |
| Broad connector, travel API, Canvas travel, flight research/generation and auth proxy regression run below | 387 passed; 8 pre-existing React fixture failures |
| Reproduce those UI fixtures on unchanged `4e0780a` in an isolated temporary archive using the same dependencies | Same 8 failures: fixtures request an absent `Edit details` button; see [baseline evidence](baseline-check.txt) |
| Final new connector/SDK integration tests plus auth proxy suite below | 29 passed, including all 23 new cases |
| Ruff check of changed connector/Agent modules and new test modules | Passed |
| Ruff format check of new and fully formatted modules | 6 files already formatted |
| `git diff --check` | Passed |

Broad regression command:

```sh
uv run --locked pytest -q services/mcps/tests services/agent/tests/test_travel_api.py services/agent/tests/test_travel_research_tools.py services/agent/tests/test_canvas_semantic_travel.py services/agent/tests/test_canvas_travel.py services/agent/tests/test_research_flights.py services/agent/tests/test_flight_generation.py services/auth/tests/test_travel_proxy.py
```

The final targeted command includes the subsequently added proxy expiry-message test:

```sh
uv run --locked pytest -q services/mcps/tests/test_travel_research.py services/agent/tests/test_travel_research_tools.py services/auth/tests/test_travel_proxy.py
```

The integration tests invoke actual registered Claude SDK tools, the private MCP dispatcher, connector normalization and authenticated FastAPI handlers, with HTTP responses supplied by deterministic LiteAPI fixtures. They cover details/reviews/room terms, price changes, empty/malformed/unavailable results, reference expiry/eviction/restart/account and Plan isolation, disabled flights, unauthorized access, invalid arguments, payload bounds, cancellation and unchanged Plan revision/content. The proxy test verifies POST-only offer transport and the safe expiry message. Unexpected provider endpoints fail the fixtures, preventing unnoticed booking calls.

## Verification limits

No live LiteAPI request or paid model call was executed. Account-specific availability, live supplier payloads and model tool-choice quality still need live acceptance. The integration results establish implementation behavior against documented provider response fixtures. No production deployment, gateway catalog synchronization or local main rebuild was performed.

This task changes no frontend files or CRUD persistence behavior. The mandatory planning/testing skill was read before implementation and before delivery; frontend browser/screenshot gates and CRUD write/readback gates are not applicable to this backend tool addition. Existing UI fixture failures were isolated on baseline rather than changing unrelated frontend behavior. Dependency deprecation warnings remain.
