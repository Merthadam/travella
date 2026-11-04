# Accommodation location preferences: manual and agent search

Status: specification and prototypes only; production implementation awaits traveler selection of the design.

## Confirmed scope

The traveler can choose any combination of saved places and categories, or use a named city-center point, landmark, neighborhood or map point. These criteria apply to accommodations only. Both the focused Accommodation agent and manual search must share the same normalized criteria and evidence. The user explicitly selected three prototypes; no layout has been selected yet.

## Search behavior

- Default for multiple selected places: prefer hotels with the lowest mean straight-line distance to the selected, located places. Also display the farthest selected place and per-place distances. Describe the result as best among the returned/checked options, never the globally optimal hotel.
- A category selection expands to unique selected place IDs. Individual selections and exclusions remain editable; a place present in multiple categories counts once. Any subset of the Plan's available saved places is selectable. The existing Plan pin limit is the natural upper bound; do not introduce an arbitrary three-place limit.
- Optional hard distance: require the hotel to be within the specified radius of EVERY selected place. Never confuse distance to the average point with distance to each activity. Unknown hotel coordinates cannot satisfy a hard condition. A selected place without coordinates needs resolution/removal or explicit flexible matching.
- Missing coordinates under flexible matching remain visible and are excluded from the denominator. If no selected place has coordinates, ask the traveler to choose/resolve a location before searching. Hotel results without coordinates are unranked and labeled, not assigned zero distance.
- City center uses a resolved, explicitly named point shown to the traveler. A provider city centroid is not inherently a meaningful city center. A neighborhood Place ID region and a radius around a neighborhood landmark are distinct queries; label them accurately.
- Straight-line kilometers only for the initial implementation. Walking/driving/transit time requires actual routing evidence. Never convert a radius into a promised walking time.
- Results with no match offer explicit widening, flexible ranking, or removal of selected anchors. Hard requirements cannot be silently relaxed.
- Location controls are temporary search preferences. Persisting a Plan requirement or saving a hotel still requires the existing explicit confirmation flow.

## Shared contract and server ownership

Extend HotelSearch, browser Zod criteria, workspace recovery, canonical criteria hashing, and tool schemas together. Suggested location preference model:

- kind: selected_places | city_center | landmark | neighborhood | map_point
- selection: canonical saved-place IDs, optional category provenance and explicit exclusions
- anchor: server-resolved place reference (or traveler-chosen map coordinate), human-readable label, coordinate source and observation/version metadata
- matching: prefer_nearby | within_each
- radius_m: bounded positive integer for hard limits; no implicit hard radius for prefer_nearby
- distance_metric: straight_line; reject unsupported time-based modes

Resolve saved place IDs against the authenticated Plan snapshot, not browser-supplied ownership or model-generated coordinates. Validate finite/ranged coordinates, destination consistency and coordinate provenance. Deduplicate by canonical place identity. Preserve current dates, party, amenities, cancellation, currency and nationality criteria. Current manual changes outrank pending agent work.

A selected-place geometry digest belongs in request identity and research evidence. Changes to an anchor, category membership, destination or Plan revision invalidate prior matching evidence. Stale requests cannot replace newer manual selections; use the existing workspace revision, generation and authority checks.

## LiteAPI adapter

Verified 2026-11-04:
- https://docs.liteapi.travel/reference/post_hotels-rates — rates accepts latitude, longitude and radius in meters, or Place ID. Includes hotel coordinates when hotel data is returned.
- https://docs.liteapi.travel/reference/get_data-places — lookup for cities/areas/points of interest.
- https://docs.liteapi.travel/reference/get_data-places-placeid — resolved coordinates and viewport.

Current code sends hotelIds, placeId, or cityName/countryCode; no coordinate/radius request path exists. Search result cap is 30 properties and must remain visible in coverage explanations.

Add an explicit geographic query path. A single resolved anchor maps directly to latitude/longitude/radius. A hard multi-anchor intersection can be retrieved via one selected anchor's radius then checked against ALL anchors locally. Do not assert exhaustive coverage when the provider candidate cap truncates results. Flexible multi-place search should derive a bounded candidate region from all selected locations and rank actual returned coordinates; an average point is only a retrieval aid. Do not run one provider call per activity. Any expanded candidate search must stay within the existing three-search/ten-provider-call budget and preserve hard constraints. If coverage is insufficient, report it or ask about a bounded follow-up.

Resolve place coordinates through an allowlisted connector operation; existing destination lookup filters out many point-of-interest types and will require a scoped extension. Keep exact-hotel rate inspection as hotelIds and retain parent location provenance; do not send mutually exclusive query modes together. Detail/rate refresh cannot drop location preferences in the returned criteria.

## Agent behavior

Extend the accommodation topic skill/tool contract and focused specialist prompt only once server support exists. An unsupported prompt instruction alone would produce fictitious capability.

1. Interpret requests such as “near my museums and these two restaurants” into selected Plan place IDs/categories.
2. Resolve ambiguity only when it changes the search materially (which center, which place, strict radius versus flexible preference). Current selected workspace places are the first context for “these.”
3. Use the same validated proximity calculation service as manual search. Keep private model reasoning internal; expose a short evidence-backed explanation, average/farthest distances, missing data and tradeoffs.
4. Explicit “search within 2 km of X” authorizes that temporary search. An inferred suggestion does not become a hard requirement; show a proposal or ask before narrowing. Durable Plan edits still use exact confirmation.
5. Reflect delivered search criteria back into manual controls using existing committed workspace updates and undo behavior. Do not overwrite unapplied drafts or revive obsolete research.
6. Use saved activities as context without silently selecting all categories or giving one category hidden extra weight.

## Affected implementation surfaces

- services/agent/travel_contracts.py and corresponding private MCP validation, hotel normalization and LiteAPI adapter.
- services/agent/travel_workspace.py, travel_registry.py, specialist service/tools and accommodation topic instructions; graph projections must remain allowlisted.
- frontend/src/features/plans/travel/TravelSearch.jsx, StaySearchFilters.jsx, useTravelWorkspace.js, travelWorkspaceSchema.js, CanvasTravel schemas and recovery validation.
- Coordinate/Plan retrieval boundary and shared calculation helper; extend durable CRUD only if a confirmed saved requirement is included in final scope.

## Required verification for production

- Identical agent/manual criteria produce identical canonical location selection and distance results.
- Property with missing coordinates, selected activity without location, overlapping category membership, empty selection, distant activity outlier and zero-match intersection.
- Correct meters sent to LiteAPI; legal query mode precedence; exact-hotel rate inspection preserves location provenance and other filters.
- Provider truncation, failure and location lookup errors are labeled; no invented time estimates; no hidden hard-requirement relaxation.
- Agent proposals, explicit search requests, draft conflicts, undo, cancellation, late events, Plan edits and cross-owner/stale anchor rejection.
- Authenticated example-account Chrome DevTools journey: select categories and exceptions, search, inspect per-place distances/map, agent refine, manual adjust, reload/recover, desktop/mobile, console/network review.
- If durable CRUD changes are needed, verify all affected handlers with a real test database and HTTP integration checks, including ownership and read-back persistence.

## Prototype decisions still open

1. Choose A (sidebar), B (map), C (place comparison), or combine them.
2. Should choosing a category take a snapshot of its current places, as the prototype does, or automatically include future places added to that category? Dynamic membership must trigger an explicit stale-results indicator and refreshed search.
3. Do all selected places have equal importance, or should travelers be able to mark a few as must-be-near? Current prototypes use equal weights and one optional hard radius for every selected place.

## Capture and cleanup

The prototype is an authenticated, development-only rendering alternative on the existing /plans/:id route via ?prototype=stay-location&variant=A|B|C. Its fixture data is explicitly separate from the opened Plan. Browser reload resets demo criteria; variant survives in the URL. Capture on local branch prototype/stay-location-20261104, with this quick-task directory as the context pointer. After a traveler selects a design, record the selection here, implement with production validation and remove the development variants/switcher from the integration branch. Keep the prototype branch as the primary source.
