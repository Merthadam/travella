---
status: resolved
trigger: could you check on why searching for flights does not work
created: 2026-10-27
updated: 2026-10-27
---

## Symptoms
Expected: manual flight search returns options or an actionable explanation.
Actual: the running main UI shows a generic search failure for BUD–MIL, 2026-10-28 through 2026-10-30, two travelers, Hungary, EUR, economy.
Timeline: reported after starting main at 7a2862d; earlier working status unknown.
Reproduction: manual Explore flights search in the existing local Plan.

## Current Focus
hypothesis: confirmed mismatch between autocomplete accepting metropolitan codes and normalization requiring exact airport-code equality.
test: authenticated read-only HTTP searches with identical criteria for MIL and MXP; isolate normalization using the same provider response.
next_action: complete; fix is running locally on port 5174.

## Evidence
- Running main source commit is 7a2862d in the isolated startup checkout. Both app and travel connector are running, with no OOM kill.
- Browser shows Milan (MIL) selected and “We couldn’t finish this search. Please try again.”
- LiteAPI airport lookup accepts every returned three-letter code; manual FlightSearch validates code syntax only.
- Agent chat has a separate airport-selection guard; the manual search path does not use it.
- travelApi.js replaces server failures other than its selected status codes with the generic message.
- Chrome DevTools MCP is blocked by an already-running profile. Read-only observation used the existing Chrome tab through computer use; no browser verification of a fix is claimed.
- Authenticated airport lookup returned MIL (Milan - All Airports), MXP, LIN and BGY among its suggestions.
- Identical public HTTP searches: MIL returned HTTP 502 in 2.0 seconds; MXP returned HTTP 200, ready, 100 results in 10.1 seconds. Temporary test session signed out successfully.
- Private connector inspection confirmed the provider returns journeys for MIL. With the SAME provider response, normalization accepted 0 results for destination MIL, 40 for MXP, and 25 for LIN. No raw provider payload or offer handles were printed or saved.
- normalize_flights requires outbound destination and inbound origin to equal criteria.destination exactly (services/mcps/liteapi.py). Real airport codes cannot equal the metropolitan MIL code; all journeys are discarded, causing provider_response_invalid.
- services/auth/agent_client.py preserves HTTP 502 but discards its error code; frontend travelApi.js converts it into the generic displayed message.

## Eliminated
- Missing credentials, complete provider outage, and invalid dates/passenger criteria: identical MXP request succeeded.
- Provider rejecting MIL: disproven; it returned usable journeys that the local normalizer discarded.

## Resolution
root_cause: manual autocomplete accepts metropolitan MIL while the connector normalizer requires exact physical-airport codes, then error handling masks the mismatch.
fix: explicit MIL membership (MXP, LIN, BGY) at all four return-flight endpoints; preserve exact airport matching for individual selections and bind sandbox verification/prebook to selected actual endpoints.
verification: 55 regression tests passed; rebuilt runtime source hashes matched; authentication and app health passed. The original BUD–MIL request returned HTTP 200 with 100 results in 3.8 seconds, with endpoints and dates asserted for every result. See artifacts/testing/2026-10-27-manual-flight-search/verification.md for evidence and the separate local migration compatibility repair. Connector-only change; no frontend or durable CRUD changes. Chrome DevTools profile remained locked; no browser verification claimed.
