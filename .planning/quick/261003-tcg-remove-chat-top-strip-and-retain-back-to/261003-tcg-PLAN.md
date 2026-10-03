# Quick Task: Make Plan chat the primary Plan screen

## Scope

Make the chat the primary screen when a traveler opens or creates a Plan. Keep the existing planning components in the codebase for later use. Adapt the top navigation to the chat and retain an explicit Plans switcher that opens the drawer for choosing another Plan.

## Acceptance criteria

- Opening a Plan from the Plans list loads its full-page chat directly at `/plans/{id}`.
- Creating or restoring a Plan opens its full-page chat.
- The chat header anchors Travella at the far left, groups the Plans chevron beside it, and styles the current Plan selector on the right before Account and Sign out.
- The header has no control that routes to the old Plan workspace.
- The Plans drawer is closed on entry and opens only when Plans is selected, allowing another Plan to be opened.
- The `/plans/{id}/conversation` route continues to load chat and normalizes to `/plans/{id}`.
- Frontend tests and production build pass; verify the running route in Chrome.

## Implementation

1. Route Plan opening, creation, and restoration to the chat as the primary Plan view.
2. Adapt the chat header and retain the Plans drawer switcher.
3. Keep existing planning components available in the codebase for future use.
4. Update route tests and run required frontend checks and live browser inspection.

## GSD note

Executed inline because this task is a small targeted layout correction and this runtime prohibits unrequested subagent delegation.
