# Google Maps Platform research for Phase 3A

**Date:** 2026-09-28  
**Scope:** Official Google documentation relevant to Travella's permanent map, place search, temporary results, map pins, and provider integration boundary.

## Recommendation

Use the Maps JavaScript API for the browser-rendered permanent map and load the `places` and `marker` libraries with `google.maps.importLibrary()`. Use Places API (New) place autocomplete for destination/place input and `Place.searchByText()` or `Place.searchNearby()` for map browsing/search. On selection, request only the Place fields the UI needs, then keep the durable Travella record to a provider `place_id` plus Travella-owned metadata and a safe, current projection. Treat provider content as transient unless Google explicitly permits retention. Use AdvancedMarkerElement for temporary and saved-pin visual layers, with a production map ID.

The browser can use a website-restricted Maps key because Maps JavaScript and Places Library are client-side website integrations. Any server-side web-service key must be separate, API-restricted, IP-restricted, and kept private. Google requires billing and an API key for Maps JavaScript API usage; budget controls and quota/usage monitoring should be part of the integration rollout.

## Source-grounded findings

### Map rendering

- Maps JavaScript API is a client-side web API for interactive, customizable maps, locations, markers, and custom data. Its optional libraries include Places, and the API is loaded with an API key; production setup is covered by Google's [Maps JavaScript API documentation](https://developers.google.com/maps/documentation/javascript) and [overview](https://developers.google.com/maps/documentation/javascript/overview).
- `google.maps.Map` renders into an HTML container and accepts `center`, `zoom`, `mapId`, and other interaction/display options. A map ID is immutable after map creation. See the [Map reference](https://developers.google.com/maps/documentation/javascript/reference/map).
- Maps JavaScript requests require a valid API key and billing must be enabled for the project. See [Maps JavaScript API usage and billing](https://developers.google.com/maps/documentation/javascript/usage-and-billing) and [troubleshooting](https://developers.google.com/maps/documentation/javascript/troubleshooting).

### Autocomplete and place search

- The current JS widget is `PlaceAutocompleteElement` from the `places` library. It emits `gmp-select`; convert the prediction with `toPlace()` and call `place.fetchFields({fields: [...]})`. Google documents constraints such as `includedPrimaryTypes`, region/location restrictions, and viewport bias in [Place Autocomplete Widget](https://developers.google.com/maps/documentation/javascript/place-autocomplete-new).
- The JS Places data API exposes `Place.searchByText()` and `Place.searchNearby()` for text and nearby place discovery. See the [Place class reference](https://developers.google.com/maps/documentation/javascript/reference/place).
- Autocomplete sessions group typing requests and the selected Place Details request for billing. The widget manages the session automatically; programmatic flows must pass a session token and end it with Place Details. See [Place Autocomplete Data API](https://developers.google.com/maps/documentation/javascript/place-autocomplete-data) and [Autocomplete and session pricing](https://developers.google.com/maps/documentation/javascript/session-pricing).
- If Travella only needs a selected place's latitude/longitude or address, Google's Autocomplete guidance says Geocoding can be less expensive than a Place Details call. This is a cost/design choice to revisit if the map destination flow needs no richer place data. See [Autocomplete (New)](https://developers.google.com/maps/documentation/places/web-service/place-autocomplete).

### Place Details and field masks

- Place Details (New) requires a non-empty field mask; omitting it is an error. Field masks control both response size and billing, and Google discourages `*` in production. See [Place Details (New)](https://developers.google.com/maps/documentation/places/web-service/place-details) and [Place Data Fields (New)](https://developers.google.com/maps/documentation/places/web-service/data-fields).
- Phase 3A should request a deliberately small allow-list, likely `id`/`name`, `displayName`, `formattedAddress`, `location`, `viewport`, `primaryType`/`types`, and only the UI-required attribution/photo fields. Do not request phone, opening hours, reviews, or photos until a defined surface needs them; those fields can move the request into higher-priced tiers.

### Markers and map pins

- `google.maps.Marker` has been deprecated since API v3.56 (2024-02-21). Google recommends `google.maps.marker.AdvancedMarkerElement`, which supports custom HTML/CSS, accessibility, click/keyboard interaction, and better customization. See [markers overview](https://developers.google.com/maps/documentation/javascript/advanced-markers/overview) and [migration](https://developers.google.com/maps/documentation/javascript/advanced-markers/migration).
- Advanced markers require loading the `marker` library and supplying a map ID (`DEMO_MAP_ID` is for testing; use a production map ID). See [Advanced Markers setup](https://developers.google.com/maps/documentation/javascript/advanced-markers/start) and [add a marker](https://developers.google.com/maps/documentation/javascript/advanced-markers/add-marker).
- Model Travella's temporary search results and durable saved Map Pins as separate application state/layers. A marker click can open an allow-listed detail projection; marker creation itself must not mutate CRUD Plan state.

### API-key security and service boundary

- Google recommends both an application restriction and API restrictions on every key. Websites restrictions are recommended for Maps JavaScript API and Places Library; server web-service keys should remain private and use IP restrictions where applicable. Use separate keys per application so rotation or compromise has a narrow blast radius. See [Google Maps Platform security guidance](https://developers.google.com/maps/api-security-best-practices).
- For Travella, expose only a browser website-restricted key to the frontend, restricted to the Maps JavaScript API and Places API/Library services actually used. Keep any server-side key in the private Connector/service environment; do not place it in browser bundles, URLs, logs, or Plan data.

### Billing, quotas, and monitoring

- Maps Platform uses pay-as-you-go SKUs. Dynamic map loads, Places autocomplete, Place Details, Text Search, and Nearby Search are separately metered. See [Maps JavaScript usage and billing](https://developers.google.com/maps/documentation/javascript/usage-and-billing), [Places usage and billing](https://developers.google.com/maps/documentation/places/web-service/usage-and-billing), and the [global pricing list](https://developers.google.com/maps/billing-and-pricing/pricing).
- The current global pricing page lists free monthly usage caps by SKU and tier; exact prices and product status can change, so treat the pricing page as the source of truth at deployment time. Avoid putting price numbers in product copy or contracts.
- Google provides reporting, quota views, billing reports, custom dashboards, and alerts. Set project quotas/budgets and monitor map loads, autocomplete requests, Details field tiers, Text Search, and Nearby Search separately. See [reporting and monitoring](https://developers.google.com/maps/documentation/javascript/report-monitor).

### Attribution, retention, and policy constraints

- Places API content must not be pre-fetched, cached, or stored beyond Google's documented exceptions. A `place_id` is explicitly exempt and may be stored indefinitely. See [Places API policies and attributions](https://developers.google.com/maps/documentation/places/web-service/policies).
- Place results displayed on a map must be shown on a Google Map with required attribution; place data shown outside a map requires the Google logo and applicable attribution. Place Details, photos, and reviews require their returned author/provider attributions where applicable. Do not hide or alter Google-provided attribution.
- Travella should persist only the `place_id` and its own user-generated category/note/relationship data as durable Map Pin identity. Re-fetch current Place details when rendering a detail view, honor returned attribution, and avoid treating a stored display name/address/rating as an indefinitely valid provider snapshot. This also keeps stale provider data from appearing as authoritative Plan data.
- Applications using Places API must provide public Terms of Use and a Privacy Policy incorporating Google's Terms and Privacy Policy. Review the EEA-specific terms when the billing address is in the EEA; the autocomplete page notes functionality/terms vary by region.

## Phase 3A implementation implications

1. Create a Google Cloud project with billing, enable Maps JavaScript API and Places API (New), create a production JavaScript map ID, and issue a website-restricted browser key with only required API restrictions.
2. Load `maps`/`places`/`marker` libraries lazily. Render the permanent map after a confirmed workspace exists; keep map viewport, query text, and temporary result pins ephemeral browser state.
3. Use `PlaceAutocompleteElement` for destination/place search. Bias or restrict predictions to the confirmed one-destination/city context where appropriate. On selection, fetch a minimal field mask and send only an opaque place reference plus the explicit user action to the Travella backend.
4. Use `searchByText` or `searchNearby` for stays, restaurants, and activities. Keep results transient until the traveler explicitly confirms a Custom Map Pin category and save operation. Flights and car rentals remain separate provider result flows.
5. Render temporary and saved pins with `AdvancedMarkerElement`; visually distinguish them and use stable application IDs for reconciliation. Never infer that displaying a provider result means a Plan mutation.
6. Make attribution part of the map/detail component contract. Add automated checks that no map/place view removes required attribution and that server logs/CRUD projections exclude raw provider payloads and credentials.
7. Instrument usage by SKU and configure quotas/budget alerts before production traffic. Reassess field masks and autocomplete session behavior with measured usage rather than broad wildcard details.

## References

- [Maps JavaScript API](https://developers.google.com/maps/documentation/javascript)
- [Maps JavaScript API overview](https://developers.google.com/maps/documentation/javascript/overview)
- [Place Autocomplete Widget](https://developers.google.com/maps/documentation/javascript/place-autocomplete-new)
- [Place Autocomplete Data API](https://developers.google.com/maps/documentation/javascript/place-autocomplete-data)
- [Place class reference](https://developers.google.com/maps/documentation/javascript/reference/place)
- [Place Details (New)](https://developers.google.com/maps/documentation/places/web-service/place-details)
- [Place Data Fields (New)](https://developers.google.com/maps/documentation/places/web-service/data-fields)
- [Markers overview](https://developers.google.com/maps/documentation/javascript/advanced-markers/overview)
- [Migrate to advanced markers](https://developers.google.com/maps/documentation/javascript/advanced-markers/migration)
- [API security guidance](https://developers.google.com/maps/api-security-best-practices)
- [Maps JavaScript usage and billing](https://developers.google.com/maps/documentation/javascript/usage-and-billing)
- [Places usage and billing](https://developers.google.com/maps/documentation/places/web-service/usage-and-billing)
- [Pricing list](https://developers.google.com/maps/billing-and-pricing/pricing)
- [Reporting and monitoring](https://developers.google.com/maps/documentation/javascript/report-monitor)
- [Places API policies and attributions](https://developers.google.com/maps/documentation/places/web-service/policies)

