# Remove the current-plan header button

Date: 2026-10-04

## Scope

Removed the right-side current-plan button from the authenticated conversation header. The left menu button is the only Plans drawer trigger; Account and Sign out remain in the header.

## Checks performed

- `npm run build --prefix frontend` — passed (Vite built 32 modules).
- `git diff --check` — passed.
- Updated the running local app container and reloaded the authenticated Plan conversation in Chrome.
- Chrome accessibility tree and visual inspection showed Travella, the menu button, Account, and Sign out; no current-plan button is present.
- Opened Plans from the menu; the existing plan list appeared. Escape closed it and returned focus to the menu button.
- Browser console warnings/errors — none returned.

## Incomplete evidence

Chrome DevTools MCP could not attach because its shared Chrome profile is already running. I visually inspected the after state in Chrome, but could not save screenshot files or inspect the Network panel. The user's attached screenshot records the before state. Verification is incomplete against the required saved-screenshot and DevTools Network evidence gate.

No automated tests were run.
