# Phase 12 — Implementation research

Researched 2026-10-05 against current source and primary provider documentation. Existing phase plans are historical context, not product authority.

## Current code and integration map
| Concern | Existing source | Required change |
|---|---|---|
| Routing after login | frontend/src/AccountApp.jsx: routeAfterSignIn | Gate on current onboarding version; completed legacy accounts enter prefilled v2 once |
| Agentic intake UI | frontend/src/FirstLoginOnboarding.jsx | Replace mounted experience with deterministic B flow; remove sendOnboardingTurn usage from frontend journey |
| Profile API | frontend/src/api.js; services/auth/api.py; services/auth/crud_client.py; services/crud/api.py | Extend strict request/response contracts and step mutation transport together |
| Durable profile | services/crud/profile.py; profile_schemas.py; models.py TravelerProfile | Existing per-subject JSON payload and completion flag support additive fields; add revision/atomic step update contract |
| Memory projection | services/auth/agent_client.py sync_profile; services/agent/http_contracts.py; memory.py PROFILE_FIELDS | Extend every allowlist, schema, and consumer; profile save must not depend on mirror availability |
| Agent read | services/agent/crud_client.py; request_context.py; graph/builder.py | Preserve canonical-read precedence and traveler identity boundaries; no onboarding progress metadata in prompts |
| Google browser loading | frontend/src/PlansApp.jsx | Extract reusable loader with failure/retry behavior; avoid duplicate loader and new legacy Autocomplete usage |
| Private map connector | services/mcps/map_server.py | Currently geocodes temporary Plan candidates; not an onboarding city/airport API |
| Chosen design | frontend/src/prototypes/OnboardingPrototype.jsx VariantB | Visual reference only; rewrite production components with Tailwind theme and authenticated profile API |

## Data contract
Retain old departure_base/travel_interests as compatibility projections. Add home_city (user text, country identifier when independently valid, optional Google place_id; explicit source), default_airport (stable reference ID/IATA), interest_ids plus custom_interests, and onboarding {version, steps:{home,citizenship,needs,interests}, completed_version}. Step values: pending/completed/skipped; home cannot be skipped. Add revision to reject stale writes. Missing optional data and visited/skipped state are separate.

Use a bounded step mutation (PATCH /v1/traveler-profile/onboarding) containing step, action (continue/skip), expected_revision, event_id, and only that step's editable values. Persist step data and progress atomically, with duplicate event replay handled before stale revision rejection. Completion requires valid home and all steps resolved; interests require >=5 unique selected values unless skipped. Clearing is explicit. Old PUT remains compatible but cannot remove new keys or lower current completion/version by omission. New clients send step-scoped mutations; server derives legacy projections.

NoSQL migration is unnecessary. The existing JSON profile avoids introducing a second store. Static versioned catalogs provide countries/interests and airports; backend and frontend validate against the same canonical catalog source.

## Places and airport approach
Google Places Autocomplete Data API supports custom suggestion UI and fetchFields after selection. Use city-only predictions, debounce, stale-response suppression, fresh session tokens, narrow fields and visible required attribution. Refactor existing loader instead of copying it. Validate actual key/API enablement at execution; no cloud/key changes implied by this plan.

A bundled subset of OurAirports (open public-domain data) can supply scheduled-service airports with IATA codes and coordinates. Rank by straight-line distance to the selected city's temporary coordinates, show a bounded nearby list plus airport name/IATA search, permit cross-border airports, label any shown distance as approximate straight-line distance. Never imply available flights. Catalog avoids Google airport lookup costs and guessed IATA codes. Record dataset source, version/date, filtering, and license; no runtime downloads. Country list and 20+ starter interests are separate static versioned catalogs. Custom interests need no LLM classification.

Google place IDs are exempt from caching restrictions; other provider fields are not blanket-permitted persistent profile content. Keep suggestions/details transient and persist independent user text and approved identifiers. If retained provider display data is needed, establish its allowed retention/refresh mechanism before implementation; do not infer that selecting a suggestion removes restrictions. Airport catalog data can be persisted as stable IDs and reconstructed locally.

## Legacy conversion and memory
Never geocode silently at sign-in or invent known airports/countries from ambiguous text. Deterministic exact catalog matches may prefill structured values; preserve unmatched original text visibly for review. Old interests remain available as legacy prose until explicitly replaced; do not treat arbitrary sentences as five chosen bubbles. A v2 draft must not wipe unrelated profile fields.

Keep memory sync bounded and best-effort. Current auth proxy synchronously calls sync_profile on every PUT, so extend carefully: draft saves should not wait for a full provider-memory roundtrip; final completion may trigger existing bounded mirror, and canonical profile remains immediately available. Avoid a new background queue subsystem solely for onboarding. Confirm all nullable/clear semantics so stale memory cannot refill deleted preferences.

## Sources
- Google custom autocomplete, session tokens and place details: https://developers.google.com/maps/documentation/javascript/place-autocomplete-data
- City-only filtering: https://developers.google.com/maps/documentation/places/web-service/reference/rest/v1/places/autocomplete
- Places storage and attribution: https://developers.google.com/maps/documentation/places/web-service/policies
- OurAirports public-domain reference data: https://ourairports.com/data/

## Validation Architecture
Use build checks and direct browser/API exercise, per project skill. Do not add/run automated tests unless user requests them. Cover step save/readback, reload/resume, legacy prefill, ownership, stale revisions, duplicate retry, invalid completion, optional skip, custom-interest minimum, Maps failure, reduced motion, 390px mobile, and canonical memory precedence. All implementation verification is pending. Prototype evidence already exists; true 390px was not verified by the prototype run.
