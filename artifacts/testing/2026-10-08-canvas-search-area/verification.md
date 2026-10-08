# Canvas destination search area — 2026-10-08

## Change and acceptance

The default Google destination area must be useful for nearby discovery when a
destination resolves to a point-of-interest pin. Preserve meaningful city bounds
and explicitly selected map rectangles. No frontend or CRUD operations changed.

Policy: if either automatic destination span is below 5 km, include a rectangle
roughly 25 km in each direction from its center. Report `destination_vicinity`
to the SDK so nearby results are not described as administrative or road-distance
matches. Existing larger bounds report `destination_bounds`; explicit user areas
report `selected_map` and bypass destination resolution.

## Live manual checks

All provider checks used the actual private MCP HTTP server, signed service
authentication and a dedicated verification scope. No durable Plan data changed.
The query was `fancy Italian restaurants`, category `activity`, matching the SDK
bridge's existing request. Provider data below contains only public venue names.

| Check | Observed result |
| --- | --- |
| Before: Google geocode Dolomiti Superski | POI/establishment, rooftop location, viewport about 300 × 200 m |
| Before: search original viewport | `empty`, zero results |
| After: resolve destination | `ready`, `destination_vicinity`, approximately 50 × 50 km rectangle |
| After: same restaurant query | `ready`, five results; all coordinates inside enforced bounds |
| Salzburg, Austria | Original Google city bounds preserved; `destination_bounds` |
| Explicit original tiny rectangle | Rectangle returned unchanged; still `empty`, zero results |
| Actual `_MapsObserver` bridge with real MapsClient | Five observed and projected places, `destination_vicinity`, one search call, no error |
| Bridge with explicit rectangle | `selected_map`; unchanged rectangle; provider resolution skipped |

Public results returned: Anna Stuben 1 Stella Michelin (Ortisei), Atelier
Moessmer Norbert Niederkofler (Brunico), Restaurant Haselburg (Bolzano), Ristorante
El Filò (San Giovanni di Fassa), Restaurant Thaler Arôme (Bolzano). These are
provider display names, not independently verified endorsements or suitability
claims.

Expanded bounds: south 46.3492275091, north 46.7988876909, west 11.3250448511,
east 11.9791755489. Salzburg retained south 47.7512173, north 47.8543944,
west 12.9856224, east 13.1275374.

## Runtime readiness

- Existing Cognito pool/client precheck succeeded.
- `TRAVELLA_SECRETS_MODE=local bash scripts/start-local-ready.sh` rebuilt services
  using existing local credentials. No shared secrets changed.
- Example-account sign-in → session → sign-out readiness succeeded.
- App: http://localhost:5174.
- SHA-256 comparisons matched all changed runtime files in app/map containers:
  map_server.py, maps_client.py, canvas_editor.py, canvas-editing-v1.md and
  canvas-activities/SKILL.md.
- Python AST syntax parsing and `git diff --check` passed.

## Scope of verification

No automated tests were added or run. No extra paid model call or browser chat
turn was performed; the provider and actual SDK tool bridge were exercised
directly. No visual changes, screenshots or CRUD checks apply to this backend-only
fix. No production deployment was performed. The rectangle is an approximate
nearby area, not a 25 km driving radius or the whole Dolomiti Superski network.
