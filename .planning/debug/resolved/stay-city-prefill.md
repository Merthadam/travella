---
status: resolved
trigger: "Saved stay destination is Lisbon, Portugal; user expects city only so search suggestions work."
created: 2026-10-31
updated: 2026-10-31
---

## Symptoms
- Expected: saved destination seeds Lisbon with Portugal in the separate country picker.
- Actual: full label goes to the provider places query, which returns no destinations.
- Reproduction: open accommodation search for a Plan whose destination is Lisbon, Portugal.
- Timeline: reported on origin/main 3ca6c95.

## Current Focus
hypothesis: confirmed; initialWorkspace copied the display destination without extracting the city.
next_action: complete; fix running locally at http://localhost:5174.

## Evidence
- initialWorkspace seeds city directly from initialData.map.destination.
- StayDestination sends query verbatim with a separate country_code.
- Destination country default guards compare the city field with the original label and must follow the normalized default.
- Connected Chrome DevTools MCP has a profile lock; use an isolated instance of the same MCP for verification.

## Acceptance
- Qualified saved destinations seed city-only queries with the correct country.
- Manual edits and applied/recovered search criteria remain authoritative.
- Choosing a real suggestion and submitting reaches stay search with its place ID.
- Preserve the existing layout (user choice).

## Resolution
- Extract the city portion of saved stay destinations; resolve the country using the original full label.
- Repair untouched recovered legacy defaults while preserving manual edits, selected places, and applied searches.
- Regression run: 131 passed, one pre-existing conditional Python SSE fixture test skipped; production build passed.
- Isolated Chrome DevTools MCP: example-account login, legacy form reload, city-only provider lookup, explicit destination selection, 28 sandbox stay results, and recovery after reload passed.
- Evidence: artifacts/testing/2026-10-31-stay-city-prefill/verification.md.
