# Compact traveler picker revision

Completed 2026-10-29 on `maple-cake`; implementation `456034f`. Available at http://localhost:5174. User clarified the concern was visual design, not broken buttons. Existing-form choice retained.

## Result

Three compact rows use grouped rectangular counters. Repeated panel heading and default instruction paragraph removed. Done is a small action aligned right. Exact-age and limit hints appear only when relevant. The trigger uses an external label and42px control matching neighboring fields. Measured desktop popup304×241px; desktop counter cells32px, mobile/coarse-pointer cells44px.

[Design](plan/compact.png) · [Previous version](../2026-10-29-flight-travelers/implementation/desktop-light.png) · [Revised light picker](implementation/picker-light.png) · [Desktop context](implementation/desktop-light.png) · [Dark picker](implementation/picker-dark.png) · [Mobile with child age](implementation/mobile-ages.png)

## Checks performed

- GSD quick261029-vlr plan recorded before edits; Chrome DevTools captured and visually inspected design before source changes.
- `npm --prefix frontend test -- src/features/plans/travel/FlightTravelers.test.jsx src/features/plans/travel/TravelSearch.test.jsx`: **38 passed**. Existing bounds, age validation, dismissal/focus, payload and recovery tests remain passing. No tests added for this visual-only revision.
- `npm --prefix frontend run build`: passed, including final CSS alignment correction. Existing bundle-size advisory remains.
- `git diff --check`: passed.
- Cognito read-only precheck and `bash scripts/start-local-ready.sh`: healthy rebuild plus temporary authentication/session/sign-out passed. Both changed sources match running container copies: [hash checks](source-hashes.json).
- Authenticated Chrome DevTools verification with configured example account. Reauthenticated after session expiry during rebuild; credentials were kept private.
- Restored only the session-created Milan test fixture `9e78f907-47ed-4dc8-afcd-ec5e5f998fbd`. Opened Flights from its canvas, added an adult, added a child, checked missing-age Done behavior, selected7 years, and closed with Done. Trigger summary updated and focus returned.
- Verified desktop1440×1000 and mobile390×844. Desktop trigger and adjacent residence input both measured42px high with identical top566.296875px. Mobile document width390px equals viewport; no horizontal overflow; count buttons44px. Inspected saved screenshots for alignment, text, overlap and correct states.
- Ordinary page reload preserved two adults and child7; reopened picker confirmed exact values. A separate app rebuild/session transition reset an earlier unsent fixture draft; ordinary reload was repeated successfully after the final build. This revision does not alter workspace persistence.
- Light/dark screenshots used temporary document theme state; restored dark and returned to Plans without changing saved account appearance.
- Final console contained only existing Lit development warning, no errors. Relevant local API requests returned200: [console](console.txt), [network](network.txt). Count edits/Done did not issue a search. Provider search was not rerun for this visual revision; prior passenger request/result verification remains in the preceding traveler-picker report.
- Cleanup: soft-deleted the isolated fixture through the existing confirmation API. Active read404 and deleted lifecycle confirmed. No existing user Plan changed.

No backend changes, no deployment/main merge. Browser visual and interaction gates passed; final appearance remains available for traveler review.
