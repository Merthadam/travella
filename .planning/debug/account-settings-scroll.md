---
status: resolved
trigger: "Account settings cannot scroll; investigate perceived page reloads."
created: 2026-10-16
updated: 2026-10-16
---

## Symptoms
- Expected: Account settings and long editors scroll to every control; internal navigation stays in React and preserves Plans.
- Actual: User reports inability to scroll and apparent page loads.
- Reproduction: Open Account from Plans; inspect long settings on short desktop and mobile viewports.
- Errors/timeline: Not supplied.

## Current Focus
next_action: None; viewport scrolling and navigation verified in Chrome DevTools.
finding: Account relied on outer document scrolling and automatic focus scrolled the page. An explicit Account scroll container removes that dependency and prevents focus-driven jumps.

## Acceptance criteria
- All account content and actions are reachable with native scrolling on desktop and mobile.
- Internal Plans/Account navigation causes no document reload and retains existing draft guards.
- Relevant frontend tests and build pass; browser console/network and screenshot evidence reviewed.

## Evidence
- AccountContent retains PlansApp in a hidden/inert wrapper and uses history.pushState for account navigation.
- AccountSettingsPage imports its sections eagerly and uses React state to select settings.
- Default Chrome DevTools MCP profile is locked; using isolated Chrome DevTools CLI/MCP session.

## Resolution
- Account now fills the viewport, keeps the header visible, and scrolls its main content independently.
- Setting/editor focus and discard-dialog focus restoration use preventScroll.
- Browser checks passed at 1280x720 and 390x680, including reaching both bottom actions, retaining drafts/scroll after Keep editing, discard, Back/Forward, and retaining the Plans DOM without reloading.
- 27 focused account/Plans tests pass; production build passes. Five broader AccountApp tests fail identically on unchanged HEAD (outdated onboarding expectations).
- Limitation: the original complete inability to scroll was not reproduced in standalone Chrome. Whole-document scrolling worked before the fix; focus jumps were observed. The fix makes Account scrolling local to its viewport, including constrained app shells.
- Evidence: artifacts/testing/2026-10-16-account-scroll/verification.md.

## Shipping
- User explicitly requested merge to main on 2026-10-16.
- PR: https://github.com/Merthadam/travella/pull/10 (abrasive-menu → main).
- Implementation commit: 2c76d19.
- Verification and security shipping gates passed; no CI checks are configured on the PR.
- The divergent local main worktree is preserved; GitHub origin/main is the merge target.
