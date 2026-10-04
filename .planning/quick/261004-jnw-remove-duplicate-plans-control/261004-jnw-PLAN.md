---
quick_id: 261004-jnw
status: planned
description: Remove the duplicate Plans navigation control and make the current Plan header control support inline editing and switching
---

# Remove duplicate Plans control

## Goal

On an authenticated Plan Conversation, show one Plan control on the right side of the header. The traveler can edit the Plan title inline without a separate rename button, and open the Plan selector from the chevron to switch Plans. Preserve the existing conversation, account/sign-out actions, authentication, and durable Plan contracts.

## User direction

- Remove the leading left-side “Plans” button shown in the user's screenshot.
- Keep a single right-side Plan control; its chevron folds the selector in from the right.
- Edit the current Plan name in place without a separate edit-name button.
- Use the selector to open and switch to another Plan.
- Do not alter existing auth/session behavior or the exact-confirmation contract for durable mutations.

## Tasks

1. **Capture current state and simplify the conversation header.** Use the local startup flow in `.agents/skills/travella-local/SKILL.md`, authenticate as the example user, and capture the current header in Chrome DevTools before editing. In `frontend/src/PlansApp.jsx`, remove the leading Plans control from the authenticated Conversation header and preserve the single right-aligned Plan selector beside Account and Sign out. Keep the selector's chevron as the entry point to the existing Plan drawer/switching flow, with an animated right-to-left reveal, reduced-motion handling, and usable focus states in `frontend/src/styles.css`. Preserve non-conversation Plans navigation and all auth/session callbacks. Do not expose the development prototype switcher on the normal conversation UI.
2. **Make the selected title directly editable and retain explicit mutation confirmation.** In `frontend/src/PlansApp.jsx`, let activating the title text enter an inline edit state while the adjacent chevron continues to open the Plan list; provide keyboard save/cancel behavior and accessible labels. Route the completed edit through the existing rename prepare/commit and exact confirmation flow, reusing its validation and error handling. Do not introduce a standalone edit-name button or bypass CRUD authorization/revision behavior. Update only focused frontend coverage in `frontend/src/PlansApp.test.jsx` if needed to lock the title-edit entry, save/cancel, and selector distinction.
3. **Exercise and capture the real implementation.** Use Chrome DevTools on the authenticated local conversation. Verify the leading duplicate is absent, the single selector opens/closes and switches to another Plan, inline title editing and confirmation work, the persisted title survives reload, and account/sign-out controls remain present. Check desktop and narrow widths, relevant console/network failures, and that session state remains authenticated during the journey. Save before/after screenshots and sanitized outcomes under `artifacts/testing/2026-10-04-remove-duplicate-plans/` and visually inspect the screenshots.

## Acceptance criteria

- The authenticated conversation header contains one Plan control, right-aligned before Account and Sign out; the left-side duplicate Plans button is gone.
- The selector chevron reveals the existing Plan list with an animated fold/slide from the right and allows opening another Plan.
- Activating the displayed Plan title edits it in place; no separate edit-name button is needed. Keyboard save/cancel and accessible focus/labels work.
- Rename still uses the existing explicit confirmation, validation, and CRUD mutation contract; switching continues through the authorized existing Plan-opening path.
- Conversation, selected Plan, authentication/session, Account, and Sign out behavior remain intact at desktop and narrow viewport widths.
- Chrome DevTools browser exercise, console/network review, visually inspected before/after screenshots, and verification outcomes are recorded in `artifacts/testing/2026-10-04-remove-duplicate-plans/`.

## Verification

- Start and authenticate using `bash scripts/start-local-ready.sh` as documented by `.agents/skills/travella-local/SKILL.md`; do not expose the example password or session credentials.
- Run `npm --prefix frontend run build` and `git diff --check`.
- In Chrome DevTools, perform the selector, switch, inline edit/confirm, reload persistence, responsive, and authenticated-session checks described above. Inspect console and network requests for regressions; retain actual browser evidence and report any blocker as incomplete.

## Output

The authenticated Plan Conversation has one right-side Plan control that supports inline title editing and Plan switching, with the required implementation screenshots and verification record available for review.
