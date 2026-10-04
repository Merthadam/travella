---
quick_id: 261004-pli
status: implemented_unverified
description: Put the authenticated conversation's existing Plans list in the openable left sidebar
---

# Put Plans in the left sidebar

## Goal

In an authenticated Plan Conversation, opening the left sidebar shows the existing Plans list, and the current-plan control opens that same sidebar. Travelers can still switch plans and create a new one.

## User direction

- Populate the existing left-openable sidebar with Plans.
- Keep the existing right-side current-plan control as a useful way to open the same drawer.
- Do not create a second drawer or overlay.

## Tasks

1. **Unify the conversation drawer.** In `frontend/src/PlansApp.jsx` and `frontend/src/features/plans/components/PlanDrawers.jsx`, render the existing Plans list inside the left sidebar, including loading and empty states, existing plan actions, plan switching, and New plan. Make both the hamburger trigger and the right-side current-plan control open the same drawer and fetch the active plan list; keep one backdrop, close control, Escape behavior, and focus handling. Remove the separate empty-sidebar/Plans-drawer rendering path without changing route-level My Plans or CRUD behavior. Preserve Account, Sign out, conversation, and auth/session flows.
2. **Match styling and verify the journey.** Update `frontend/src/styles.css` as needed so the populated drawer retains the established left-side motion, focus visibility, reduced-motion handling, and narrow-screen fit. Follow `docs/skills/travella-testing/SKILL.md`: use the local startup skill and example account; capture before and after evidence, then use Chrome DevTools on the authenticated conversation to open from both triggers, switch plans, exercise loading/empty states where available, create a plan, and check close/Escape, responsive layout, console, and network. Record actual outcomes and any blocked checks under `artifacts/testing/2026-10-04-plans-in-left-sidebar/`.

## Acceptance criteria

- Hamburger and right-side current-plan control open the same left Plans drawer; no second overlay appears.
- Existing active Plans, selected-plan actions, loading/empty feedback, switching, and New plan remain available and work.
- Drawer close button, backdrop, Escape, focus behavior, reduced motion, and narrow layout remain usable.
- Route-level My Plans, conversation, Account, Sign out, and authenticated session behavior remain intact.
- Browser evidence and sanitized verification outcomes are saved under `artifacts/testing/2026-10-04-plans-in-left-sidebar/`; any unavailable required inspection is marked incomplete.

## Verification

- Read `docs/skills/travella-testing/SKILL.md` and `.agents/skills/travella-local/SKILL.md`; use the documented local command and URL, and authenticate as the supplied example user without exposing credentials.
- Use Chrome DevTools to exercise the affected drawer journey at desktop and narrow widths, inspect relevant console and network failures, and visually inspect persisted before/after screenshots. Verify plan list empty/loading behavior if those states can be reached in the local data. Do not claim unavailable states or evidence as checked.
- Run only the focused build/checks requested by the implementing workflow; automated tests are not requested by the user.

## Output

The authenticated conversation's left sidebar is the single Plans navigation drawer, accessible from both header controls, with existing list actions preserved. Browser evidence and verification limits are recorded in `artifacts/testing/2026-10-04-plans-in-left-sidebar/verification.md`.


## Execution note

Implementation and available browser interactions are complete. Switching to another Plan, required DevTools network inspection, narrow viewport override, and saved screenshot evidence could not be completed. See `artifacts/testing/2026-10-04-plans-in-left-sidebar/verification.md`; verification remains incomplete.
