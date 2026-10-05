# Map onboarding verification — 2026-10-05

## Implemented and observed

- Selected B Travel studio now has one Google address search, a real Google map, home marker, optional selectable airport markers/cards, and explicit manual fallback. The duplicate city input is removed from the Google path.
- Nearby airport search runs automatically after an address resolves. It uses Google Places within 50 km, matches against the known airport catalog by country, coordinates and name/code, then sorts matched airports by straight-line distance. No airport is selected automatically. Catalog fallback is labeled; manual airport search runs on Search/Enter.
- Full address is an additive canonical profile field. Coordinates/provider objects remain transient. Shared agent and AgentCore memory projections omit address; city/airport legacy fields retain their existing meaning.

## Executed checks

| Check | Observed result |
| --- | --- |
| Frontend production build | Passed (`npm --prefix frontend run build`, UI worker) |
| Source whitespace check | `git diff --check` passed |
| Local Cognito precheck | Existing pool/public client validated, no cloud resource mutations |
| `bash scripts/start-local-ready.sh` | Rebuilt stack; health and one-shot sign-in/session/sign-out passed |
| Final `bash scripts/start-local.sh -d` | Rebuilt final city-resolution and legacy-retry adjustments; container healthy |
| Container source freshness | Six representative source hashes matched on initial rebuild; final places/HomeStep/map/profile repository hashes matched after final rebuild |
| Real authenticated Chrome, localhost:5174 | Existing example account session loaded onboarding after rebuild |
| Address selection | Public fixture Andrássy út 22, Budapest resolved to full formatted address; city Budapest; no duplicate city input |
| Automatic airport search | BUD appeared without typing an airport query; approx. 17 km straight-line distance; airport remained unselected |
| Real map interaction | Home and BUD markers rendered; clicking BUD marker updated the preferred-airport selection and card aria-pressed=true |
| Live Google adapter search | Budapest nearby returned BUD; explicit VIE query returned VIE |
| Loading/empty | Address loading and initial map placeholder observed; Continue disabled before confirmed full address |
| Console before screenshot stall | No errors; Google dependency emitted Lit development-mode warning |
| Persistence/validation/ownership/replay | Direct actual FastAPI HTTP checks passed; see [API evidence](api-verification.md) |
| Privacy projections | Actual shared projection and memory adapter boundary checked without AWS memory writes; address omitted |

Initial provider checks found and fixed two issues: distance-ranked broad airport queries saturated the result limit with heliports; use primary airport types and popularity before local distance sorting. Text search used an invalid property; corrected to `useStrictTypeFiltering` per [Google documentation](https://developers.google.com/maps/documentation/javascript/place-search).

## Evidence and incomplete checks

- Before: [user screenshot](plan/before-user-screenshot.png).
- Intended layout: [map layout sketch](plan/map-layout-sketch.jpg), rendered and inspected before implementation.
- Chrome DevTools full-page implementation screenshot stalled after successful real map/marker interaction. A subsequent evaluation also stalled. No implementation screenshot was returned, so final screenshot inspection, mobile viewport, error/retry paths and final network audit remain incomplete. Do not treat this record as full UI acceptance.
- Browser Continue/reload was deliberately not performed on the existing account: fixture address selection remained an unsaved form edit. Direct real FastAPI persistence/readback was verified against an isolated fixture, not the example account. The account was not reset or restored from a stale backup.
- Keyboard selection attempt resulted in a page reload and was not conclusively diagnosed before the browser stalled; mouse selection worked. Keyboard acceptance remains open.
- Final source changes after the successful browser interaction were limited to restricting address city extraction to locality/postal town and preserving legacy idempotency receipts. They are in the healthy container but were not re-exercised in Chrome after the stall.
- Google-derived address retention and regional Google Maps terms require a deployment policy review; this work records the user-confirmed full address and does not claim legal/policy clearance.
- No automated tests were added or run. No account data, volumes or cloud resources were deleted. No merge/push performed.

Canonical manual review URL: http://localhost:5174.
