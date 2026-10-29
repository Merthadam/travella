# Consistent Plan workspace header

Verified locally on 2026-10-29 at http://localhost:5196, branch feat/focused-travel-integration.

## Decision and correction

The user rejected the previous interpretation of one header with changing contents. They selected Back to canvas below the header. Canvas, Flights and Stays now share the same Plans/brand left side, colours, dimensions and Chat toggle on the right. The accessible toggle name still identifies the controlled conversation. Back to canvas is inside the travel options content, not in another full-width toolbar. Account remains in the Plans drawer. Existing canvas/map and mobile canvas-chat presentation remain intact.

GSD debug record: `.planning/debug/resolved/header-consistency.md`. This is a correction of the already selected design; the explicit placement answer supersedes the previous implementation plan. A browser-only DOM sketch was captured before application edits and discarded on reload.

## Automated checks

- `npm --prefix frontend test -- src/PlansResume.test.jsx src/PlansApp.test.jsx src/components/PlanHeaderContext.test.jsx src/features/plans/components/PlanningCanvas.test.jsx src/features/plans/travel/TravelWorkspace.test.jsx src/features/plans/travel/CanvasTravelJourney.test.jsx --reporter=dot`: 115 passed, 1 existing skipped.
- Added an integrated regression exercising the real PlansApp → PlanningCanvas → Flights/Stays journey. It asserts retained Plans/brand DOM controls, exactly one shell chat toggle, Back outside the header, Account drawer access from travel, and canvas return. Reran `PlanningCanvas.test.jsx`: all 22 passed, including the new test.
- `npm --prefix frontend run build`: passed; existing large-bundle advisory remains.
- `git diff --check`: passed.

## Running build and authentication

Validated the existing local Cognito configuration using the sanitized travella-local precheck. Rebuilt only the dedicated travella-focused-header app, preserving other worktrees and database volumes. Image: 6a036dcfc1ac. Eight changed production files matched container source hashes; see source-hashes.txt.

`TRAVELLA_LOCAL_ORIGIN=http://localhost:5196 uv run --locked python scripts/check-local-auth.py` passed sign-in/session/sign-out. Chrome's account identity was checked as a boolean match against the required example account; no credentials or identity payloads were saved.

## Chrome DevTools verification

Created isolated Plan ea1f2f5f-d2ba-43e5-ae74-80e2d62bec03 through application HTTP APIs with Milan dates 12–17 May 2027 and a saved canvas. Exercised the production application with that Plan.

- Desktop 1440×1000: Canvas → Flights → Canvas → Stays retained exactly the same 67px header. Plans button at (28,14), brand at (78,18), Chat button at (1324,11), size 88×44. Background rgb(20,34,53) in dark mode for every workspace. Back was absent from the header and present in travel content.
- Mobile 390×844: same 67px header, Plans at (16,14), brand at (62,21), Chat at (286,11), size 88×44. No document horizontal overflow. Light theme header rgb(255,255,255), with the same geometry.
- Collapsing flight chat expanded options to full width and returned focus to the top toggle. Reopening focused the composer.
- A flight composer draft survived Flights → Canvas → Stays → Canvas → Flights. No message was sent.
- Canvas top toggle opened/closed the existing mobile chat; old mobile toggle, sidebar close button and reopen rail were absent. Existing mobile canvas overlay presentation was preserved.
- Plans drawer opened directly from Stays and Flights; Account remained reachable at its bottom on desktop and mobile. Escape closed the drawer and restored focus.
- Canvas collapsed state and scroll position survived a full reload. Header remained stable.
- Empty research states and defaulted forms rendered correctly. No search, booking or model call was made in this UI correction.
- Inspected console: no errors; existing Lit development warning only. Relevant local session/profile/Plan/canvas/research/capability/airport/place/topic/drawer requests returned 200.
- Captured and visually inspected all screenshots below for clipping, overlap and control placement.

Deleted only the newly created test Plan through its challenge/commit API; subsequent active read returned 404. Browser left on /plans, local stack remains running.

## Evidence

- Plan: [before](plan/before-flights.jpg), [intended correction sketch](plan/consistent-header-sketch.jpg).
- Desktop: [canvas](implementation/canvas-desktop.jpg), [flights](implementation/flights-desktop.jpg), [stays](implementation/stays-desktop.jpg), [flights light](implementation/flights-desktop-light.jpg), [canvas light collapsed](implementation/canvas-desktop-light-collapsed.jpg).
- Mobile: [canvas](implementation/canvas-mobile.jpg), [canvas chat](implementation/canvas-mobile-chat.jpg), [stays](implementation/stays-mobile.jpg), [stay chat](implementation/stays-mobile-chat.jpg), [flight form light](implementation/flights-mobile-form-light.jpg), [flight chat light](implementation/flights-mobile-light.jpg), [Plans drawer](implementation/plans-drawer-mobile.jpg).

## Scope limits

Provider searches, live model replies and checkout were not rerun; their previously recorded limitations are unchanged. One existing skipped test remains. This delivery verifies the header/navigation correction, not those separate flows. The traveler-count popover was not redesigned in this correction.
