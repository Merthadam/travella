---
status: passed
threats_open: 0
code_findings_open: 0
scope: branch source delta against origin/main, including merge resolution and nullable-city fix
base_commit: 0bff96fbc11120f0a31eb8fb9065dbf9ec86637a
reviewed_merge: e634d29
reviewed_fix: fbb6c14
---

# Scoped shipping security and code review

No unresolved security or code blockers found in the reviewed delta. One availability regression was identified, reproduced, and fixed before this report. This review does not certify all of Phase 18 or unrelated application behavior.

## Scope and method

Reviewed `git diff origin/main -- frontend services` against the base above, including merged working-tree changes. Read the changed source, accompanying tests, and adjacent authorization, transport, snapshot, recovery, and checkout code. No source files were modified by this reviewer; this report is the sole authored artifact.

Reviewed frontend source: `AccountApp.jsx`, `PlansApp.jsx`, `features/plans/components/PlanningCanvas.jsx`, and travel files `TravelWorkspace.jsx`, `TravelSearch.jsx`, `useTravelWorkspace.js`, `travelDefaults.js`, `StaySearchFilters.jsx`, `FlightTravelers.jsx`, `travel-search.css`. Reviewed their changed tests: `TravelSearch.test.jsx`, `travelDefaults.test.jsx`, `StaySearchFilters.test.jsx`, `FlightTravelers.test.jsx`.

Reviewed backend source: `services/shared/airport_groups.py`, `services/mcps/liteapi.py`, `services/agent/travel_contracts.py`, `services/agent/travel_registry.py`, `services/agent/claude/canvas_travel.py`; changed tests in `services/mcps/tests/test_liteapi.py` and `services/agent/tests/test_travel_registry.py`.

## Boundary findings

- Profile defaults only seed editable, scoped search drafts. They do not write a Plan or traveler profile. Touched-field, instance, recovery, active-state, and abort guards prevent late lookups from overriding manual choices or crossing Plan boundaries.
- Airport-group metadata originates in the private connector, not browser criteria. The manual route validates bounded IATA groups before registry use. Static individual-airport codes retain exact matching; inferred city memberships require the supplier's matching All Airports entry and same-country city/name evidence. Connector and agent retain actual segment endpoints, dates, and connection checks.
- Existing authenticated Plan ownership checks, scoped private MCP transport, and subject/Plan-bound registry remain intact. No new endpoint, credential handling, arbitrary URL fetch, HTML injection sink, or durable-data bypass was introduced.
- External airport and catalog labels are rendered as React text. Profile propagation uses the existing authenticated profile; the default lookup sends city information, not the full profile. No added logging exposes credentials, email addresses, or provider payloads. Destination-country lookup uses the existing Google Maps loader.
- Public snapshots still exclude checkout tokens; private handles stay outside reducer/recovery state. Merged `onStayCheckout` propagation from PlanningCanvas through TravelWorkspace and TravelSearch remains present, including receipt recovery, saved confirmation, detail handoff, and StayCheckout rendering.
- Filter selections retain explicit user action, bounded counts, safe missing-catalog removal, and existing server ID validation. Traveler controls preserve explicit search, passenger bounds, exact age requirements, and scoped recovery. The submit guard rejects blank/zero recovered adult counts independently of native input validation.

## Resolved finding and evidence

**P2: nullable airport city crashed grouped flight lookup.** `flight_city_airports` called `.casefold()` on a nullable supplier city. An isolated MockTransport response containing LON plus a London-branded SEN row with `city: null` reproduced `AttributeError` before the fix. The final code checks country first and normalizes absent city to an empty string. The new regression test accepts same-country, London-branded SEN while excluding unrelated LDY and foreign YXU with null cities.

The reviewer repeated the isolated reproduction after the fix: result was exactly `{'LON': {'SEN'}}`. Inspected the completed `uv run --locked pytest services/mcps/tests/test_liteapi.py -q` output: **49 passed**, one existing LangGraph deprecation warning. Root's final merge-wide checks remain the shipping verification authority; this review did not rerun them.

Existing journey evidence was inspected in `artifacts/testing/2026-10-29-flight-travelers/verification.md` and `artifacts/testing/2026-10-29-traveler-density/verification.md`. Earlier focused integration execution by this reviewer passed **32 TravelSearch tests**, including exact passenger requests, hidden missing-age validation, recovery, and invalid recovered adult counts. No additional browser run was performed for this source review.

## Limits

Supplier airport membership remains dependent on the provider's bounded lookup data and city labels. This review validates the implementation's checks, not worldwide airport-catalog completeness. No live-provider penetration test or independent full application audit was performed.
