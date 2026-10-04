---
quick_id: 261004-jnw
status: complete
description: Removed the duplicate left-side Plans control from the authenticated conversation header.
key_files:
  modified:
    - frontend/src/PlansApp.jsx
    - frontend/src/PlansApp.test.jsx
decisions:
  - Keep the right-side Plan selector and its existing selector behavior.
verification:
  source_inspection: passed
  focused_diff_check: passed
  browser: passed
  tests: not_run
---

# Remove duplicate Plans control — Summary

Removed the leading “Plans” button from the authenticated conversation header while retaining the right-side Plan selector. Updated the existing UI assertions to expect the duplicate control to be absent. The unrelated prototype changes present in the shared working tree were not included in this summary's implementation scope.

## Verification

- Inspected the focused diff in `frontend/src/PlansApp.jsx`: the leading `aria-label="Plans"` button is deleted, and the right-side `chat-plan-selector` remains.
- Inspected the existing UI assertions in `frontend/src/PlansApp.test.jsx`: the conversation test now asserts that a `Plans` button is absent; the drawer-switch test opens the drawer through the retained selector.
- `git diff --check -- frontend/src/PlansApp.jsx frontend/src/PlansApp.test.jsx` passed.
- Opened the signed-in plan conversation in Chrome and confirmed the header contains Travella, one right-side “Untitled plan” selector, Account, and Sign out; the duplicate left-side Plans control is absent.
- Updated the running local container with the focused header change. `git diff --check` passed. Tests were not run.

## Commit

No commit was created. The shared worktree contains concurrent unrelated changes, and its current branch (`similar-yarrow`) is outside the permitted agent branch namespace. Staging the mixed `PlansApp.jsx` diff would include unrelated prototype work.
