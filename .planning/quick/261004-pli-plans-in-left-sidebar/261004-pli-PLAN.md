---
quick_id: 261004-pli
status: implemented_unverified
description: Put the authenticated conversation's existing Plans list in the openable left sidebar
---

# Put Plans in the left sidebar

## Goal

In an authenticated Plan Conversation, the left sidebar is the only Plans navigation control. It shows the existing Plans list, and travelers can still switch plans and create a new one.

## User direction

- Populate the existing left-openable sidebar with Plans.
- Remove the right-side current-plan button completely.
- Keep one drawer, opened by the menu button beside the Travella brand.

## Tasks

1. **Keep one Plans entry point.** In `frontend/src/PlansApp.jsx` and `frontend/src/features/plans/components/PlanDrawers.jsx`, render the existing Plans list inside the left sidebar, including loading and empty states, existing plan actions, plan switching, and New plan. Remove the right-side current-plan control so the menu button is the sole drawer trigger. Keep one backdrop, close control, Escape behavior, and focus handling. Preserve route-level My Plans, CRUD behavior, Account, Sign out, conversation, and auth/session flows.
2. **Match styling and verify the journey.** Update `frontend/src/styles.css` as needed so the populated drawer retains the established left-side motion, focus visibility, reduced-motion handling, and narrow-screen fit. Follow `docs/skills/travella-testing/SKILL.md`: use the local startup skill and example account; capture before and after evidence, then use Chrome DevTools on the authenticated conversation to open from both triggers, switch plans, exercise loading/empty states where available, create a plan, and check close/Escape, responsive layout, console, and network. Record actual outcomes and any blocked checks under `artifacts/testing/2026-10-04-plans-in-left-sidebar/`.

## Acceptance criteria

- The hamburger opens the left Plans drawer; no right-side plan button or second overlay appears.
- Existing active Plans, selected-plan actions, loading/empty feedback, switching, and New plan remain available and work.
- Drawer close button, backdrop, Escape, focus behavior, reduced motion, and narrow layout remain usable.
- Route-level My Plans, conversation, Account, Sign out, and authenticated session behavior remain intact.
- Browser evidence and sanitized verification outcomes are saved under `artifacts/testing/2026-10-04-plans-in-left-sidebar/`; any unavailable required inspection is marked incomplete.

## Verification

- Read `docs/skills/travella-testing/SKILL.md` and `.agents/skills/travella-local/SKILL.md`; use the documented local command and URL, and authenticate as the supplied example user without exposing credentials.
- Use Chrome DevTools to exercise the affected drawer journey at desktop and narrow widths, inspect relevant console and network failures, and visually inspect persisted before/after screenshots. Verify plan list empty/loading behavior if those states can be reached in the local data. Do not claim unavailable states or evidence as checked.
- Run only the focused build/checks requested by the implementing workflow; automated tests are not requested by the user.

## Output

The authenticated conversation has one Plans navigation control: the left menu button. The right-side current-plan button has been removed. Existing list actions remain in the drawer; follow-up verification is recorded separately.

## Follow-up: remove the current-plan header button

Per the user's correction, the current-plan header button is removed completely; the menu button is the only Plans drawer opener. The updated UI was verified in the authenticated local Chrome tab. DevTools Network inspection and saved screenshots remain unavailable because the shared DevTools profile is locked. See `artifacts/testing/2026-10-04-remove-plan-header-button/verification.md`.


## Execution note

Implementation and available browser interactions are complete. Switching to another Plan, required DevTools network inspection, narrow viewport override, and saved screenshot evidence could not be completed. See `artifacts/testing/2026-10-04-plans-in-left-sidebar/verification.md`; verification remains incomplete.
