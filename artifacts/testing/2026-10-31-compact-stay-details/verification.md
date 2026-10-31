# Compact hotel details — approved A

User selected A (“A is great”) from the three interactive prototypes. Production is rewritten in wakeful-period; prototype source and decision are preserved on prototype/stay-details-20261031, decision commit ab1ec12. Existing city-only search prefill remains included in the running preview.

## Acceptance

- Compact hotel sidebar and room rows; one checkout action per eligible room, no room Discuss/Compare/Choose buttons.
- Actual provider price, currency, excluded taxes, meal plan, occupancy and cancellation text retained. No invented free-cancellation deadline.
- Property description and provenance in disclosures; historical/detached/expired/failed-refresh notices stay explicit.
- Accessible photo dialog, keyboard navigation, Escape and focus restoration; responsive 390 px layout and dark theme.
- Existing checkout opens with the exact room offer token. No booking or payment submitted during this verification.

## Evidence

Plan: [approved A desktop](plan/A-compact-desktop.png), [approved A mobile](plan/A-compact-mobile.png). Before: [rooms](plan/reported-rooms.png), [hotel](plan/reported-hotel.png).
Implementation: [desktop](implementation/desktop.png), [mobile](implementation/mobile.png), [cancellation](implementation/cancellation.png), [gallery](implementation/gallery.png), [checkout](implementation/checkout-mobile.png), [refresh failure](implementation/refresh-error-mobile.png), [empty offers](implementation/empty-mobile.png).

## Executed checks

Chrome DevTools isolated instance, authenticated example account, canonical localhost:5174, existing example-account Plan 81a99feb-80d7-4514-9326-b0a7ddc5643e. Lisbon city autocomplete selected, 12–17 May 2027, one room/two adults. Actual provider search returned 28 stays; hotel refresh returned 20 room offers and 16 photos for Meliá Lisboa Aeroporto. First Double Standard offer EUR 943.54 plus EUR 40.25 city tax. Cancellation disclosure retained both dated provider penalties. Photo 2 loaded after ArrowRight; Escape returned to room view. Desktop no horizontal overflow.

- Chrome DevTools mobile emulation 390×844: no horizontal overflow, normal 48 px checkout buttons; property and first room readable. Light and dark desktop palettes inspected.
- Actual Continue to checkout opened the existing stay review for Double Standard. HTTP sandbox/prebook returned 200. No guest details, consent, payment or booking submitted.
- Hotel detail and targeted room search returned 200; post-reload console had only existing Lit development and Google Maps event warnings. No feature errors. The final restart smoke additionally exercised normal session recovery (session 401 → refresh 200 → session 200) and expired-search recovery (old snapshot 409 → fresh search 200); hotel/detail and targeted search then both returned 200.
- Deliberately injected a browser-only hotel-detail request failure: original offers stayed visible with Retry details and the correct warning. An additional injected empty result displayed “No room offers are available for these dates” with zero checkout buttons. Browser fetch overrides were restored. Empty/retry, expiry, historical, booked, missing-token, abort and keyboard-gallery paths are also covered by component tests.
- `npm test --prefix frontend -- src/features/plans/travel --maxWorkers=1`: **242 passed, 12 existing fixture-dependent skips**, 18 files passed / 1 skipped. The first parallel run overlapped Docker rebuilding and timed out; subsequent runs exposed existing tests asserting effect callbacks before React completed them. Updated those assertions to await their observable outcome; final run passed without increasing timeouts.
- `npm run build --prefix frontend`: passed, existing large-chunk advisory only. `git diff --check`: passed.

## Runtime

Final `bash scripts/start-local-ready.sh` passed: healthy app, example sign-in/session/sign-out check. SHA-256 comparisons matched host and container for StayDetails, TravelDetailsDialog, travel-search.css, TravelSearch, travelDefaults and useTravelWorkspace. Canonical preview http://localhost:5174. Final authenticated mobile refresh rendered 20 actual offers, no horizontal overflow, correct 23 px heading; screenshots inspected for clipping/overlap.

An overlapping rebuild from another checkout (casual-address) briefly caused Docker's generated app-container name to collide. After Compose processes ended, removed only the never-started app container and reran the launcher. Preserved PostgreSQL and all volumes. No remaining startup blocker.

Source commits: city prefill 34f327d; approved A a777cc1. No backend CRUD change, merge, deployment, or real booking. Broader project acceptance remains unchanged.
