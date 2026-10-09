# Accommodation search repair — 2026-10-09

## Scope and acceptance criteria

Keep the user's selected classic layout A. Resolve localized city names through LiteAPI, require the traveler to select the destination, and display genuine empty availability without a generic failure. Search must remain read-only, scoped to an owned active Plan, with credentials and supplier handles kept out of browser responses.

The prior [approved design](../2026-10-09-liteapi-search/plan/a-stays-desktop.png) remains applicable. [Before: reproduced Wien error](plan/before-wien-error.png).

## Root cause and correction

Exact reproduction: Wien, Austria; 2027-02-03 to 2027-02-07; one room, two adults; Hungary nationality; EUR.

Read-only live probes found that literal `cityName: Wien` returned HTTP 200 with `error.code: 2001`. Literal Vienna returned 28 hotels. The previous adapter interpreted the former as malformed provider data. LiteAPI's places lookup resolved Wien to a locality, and rates using that place ID returned 28 hotels.

- Added authenticated, Plan-scoped `GET travel/places`, using LiteAPI `/data/places` with locality filtering and a country-qualified query. Only bounded place IDs, names and addresses are projected.
- The destination field debounces suggestions, cancels obsolete lookups, requires explicit selection, and clears selection when city or country changes. Lookup failures can be retried.
- Searches use the selected `placeId`. Existing API clients can still use city/country criteria.
- Only the documented hotel-rates error 2001 becomes empty availability. Other provider failures remain failures.

Provider references: [Places lookup](https://docs.liteapi.travel/reference/get_data-places), [rates location methods](https://docs.liteapi.travel/reference/post_hotels-rates), [documented error 2001](https://docs.liteapi.travel/reference/api-errors-for-hotel-booking-workflow).

## Executed checks

| Check | Observed outcome |
| --- | --- |
| Regression tests before implementation | Both new root-cause tests failed as expected: unknown places action; 2001 raised provider failure. |
| `uv run --locked pytest -q services/mcps/tests/test_liteapi.py services/agent/tests/test_travel_api.py services/auth/tests/test_travel_proxy.py` | 29 passed. Includes localized place selection, exact request translation, empty vs malformed/error responses, authentication, ownership, input validation and public response projection. |
| `npm --prefix frontend run test -- --run src/features/plans/travel` | 6 passed. Includes explicit selection, clearing a selection on edits, obsolete lookup responses, and preserving existing results on search failure. |
| `npm --prefix frontend run build` | Passed; existing bundle size advisory remains. |
| Chrome DevTools: example account, Plan canvas → accommodation → Wien suggestion → search | HTTP 200; ready; 28 stays. Full request passes through BFF, Agent and private Connector to the configured LiteAPI sandbox. |
| Open Wien hotel details | Hotel content HTTP 200 and room-rate search HTTP 200; one hotel with room offers and totals. |
| Saalbach-Hinterglemm search at 390px | Provider-backed suggestion; HTTP 200; 13 stays for the same dates/party. Document width equals viewport width (390px). |
| Genuine no-availability through running BFF | Legacy literal Wien request returned HTTP 200, status empty, count 0, confirming live provider error 2001 was normalized correctly. |
| Empty UI | Replayed that actual normalized empty response for one browser search, using a temporary fetch hook. UI displayed “No availability for this search.” This is controlled UI-state verification, not an assertion that selected-place Wien has no rooms. |
| Destination lookup failure and retry | Injected one browser-only 503; retry affordance appeared. Clicking Retry destinations made a real request and returned the Vienna suggestion. |
| Console/network | No application console errors after reload; existing Lit development-mode warning. Successful real places, rates and detail requests were HTTP 200. Browser response inspection found no API key or supplier offer/rate handles. |
| Startup | Read-only Cognito pool/client precheck passed. Rebuilt `travella-liteapi-preview` with `scripts/start-local-ready.sh`; health and example-account sign-in/session/sign-out check passed at http://localhost:5374. |
| Source identity | SHA-256 matches for the destination component, search component, stylesheet, shared contracts and private adapter in the running app/Connector containers. |

Browser testing used Chrome DevTools and the supplied example account. Only search state changed; no Plan was saved or booking action invoked. Authorization handler tests use isolated fixtures. No durable CRUD behavior changed, so persistence mutation checks are not applicable.

The browser's existing session expired during the extended verification run and correctly redirected to sign-in. Reauthenticated using the example account before the final real search. No authentication implementation changed.

## Screenshots inspected

- [Destination suggestions](implementation/wien-suggestions-desktop.png)
- [Wien: 28 stays](implementation/wien-results-desktop.png)
- [Hotel details and room offers](implementation/wien-hotel-details.png)
- [Mobile search form](implementation/wien-search-mobile.png)
- [Mobile destination suggestions](implementation/saalbach-suggestions-mobile.png)
- [Saalbach: mobile results](implementation/saalbach-results-mobile.png)
- [Empty response UI](implementation/verified-empty-response-ui.png)
- [Lookup failure and retry](implementation/destination-retry-state.png)

Inspected for clipping, overlap, readability and correct state. Suggestion menus intentionally overlay the fields below. Mobile layout has no horizontal overflow.

## Limits

The configured key is a LiteAPI sandbox key: results remain visibly labeled as test inventory. No production booking validation was performed. This fix does not change flights. Full application suites were not rerun; their previously documented unrelated baseline failures remain recorded in the [prior verification](../2026-10-09-liteapi-search/verification.md). All focused checks above passed.
