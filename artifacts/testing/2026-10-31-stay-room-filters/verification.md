# Hotel room filters

User approved compact meal-plan/cancellation filters, sorting, matching counts and reset within the already approved A layout. GSD quick 261031-l14. No provider/API or durable Plan changes.

Plan: [filter-bar sketch](plan/filter-bar.png), [HTML sketch](plan/filter-bar.html).

## Behavior

- Meal plan: All / Room only / Breakfast included. Match recognized provider labels, ignoring casing and repeated whitespace. Every supplied board label in a bundled offer must match. Unknown/other boards remain in All.
- Cancellation: All / Refundable. Only explicit refundable=true matches; no claim of free cancellation. Fee/deadline reminder and original policy remain.
- Sort: Lowest total price (default) / Provider order. Sort comparable room total plus supplied excluded taxes in the search currency. Missing, invalid or incomparable totals stay last; original arrays/tokens are unchanged.
- Count is an accessible live status; Clear filters resets both filters and default sort. No-match state differs from provider-empty state.

## Executed checks

`npm test --prefix frontend -- src/features/plans/travel/TravelDetails.test.jsx src/features/plans/travel/stayRoomFilters.test.js src/features/plans/travel/TravelWorkspace.test.jsx src/features/plans/travel/StayCheckout.test.jsx --maxWorkers=1`: 100 passed, no skips. Covers combinations, reset, zero matches, unknown terms/prices, extra taxes, provider order and exact checkout token after sorting/filtering. No extra search request on filter changes.

`npm run build --prefix frontend`: passed, existing chunk-size advisory only.

## Browser and runtime

Chrome DevTools isolated instance, example account, canonical http://localhost:5174. Desktop 1440×1050 and responsive viewport 390×844. Actual Lisbon hotel Meliá Lisboa Aeroporto, 12–17 May 2027, 2 adults/1 room.

- Actual availability: 20 offers. Breakfast → 16; breakfast + refundable → 1 (MELIA ROOM, EUR 1,060.59). Clear → 20. Provider-order selection worked. Filter/sort/reset generated zero extra hotel requests, measured with resource entries before and after.
- Mobile: both filters readable side by side, sort full width, no horizontal overflow; room price, policy and checkout remain accessible. Dark palette inspected as well.
- No-match browser fixture: temporarily restricted the returned availability to one real non-refundable offer. Refundable filter displayed 0 of 1 offers, the specific no-match message and no checkout action. Clear restored 1 of 1 and checkout; browser fetch override removed. This subset was browser-only and never saved.
- Checkout from the filtered offer opened Review your stay with Room 1 · MELIA ROOM. Sandbox prebook HTTP 200. No booking submitted or guest/payment details entered.
- Actual hotel search/detail and authenticated Plan requests HTTP 200. Console had only existing Lit development and Google Maps event warnings; no errors.
- Local launcher passed health and example sign-in/session/sign-out. Container SHA-256 matches StayDetails.jsx, stayRoomFilters.js and travel-search.css.

Evidence: [all offers](implementation/all-offers-desktop.png), [combined filters](implementation/filtered-desktop.png), [mobile](implementation/filtered-mobile.png), [filtered checkout](implementation/filtered-checkout-mobile.png), [no matches, dark mobile](implementation/no-matches-dark-mobile.png). Screenshots inspected for clipping/overlap.

Source: 06b6e4f. No backend CRUD change, merge, deployment or real booking.

 A temporary alternate-port preview was rejected by the existing origin check; it was stopped and verification moved to canonical localhost:5174 without changing origin protections.
