---
status: resolved
trigger: "header aint united unfortunately; i want header to not be changing this is shit not what we discussed"
created: 2026-10-29
updated: 2026-10-29
---

## Symptoms

Expected: A consistent header across the main canvas and focused travel workspaces.
Actual: The rollout changes header contents and appearance when entering Flights/Stays.
Timeline: Reported after focused travel header integration.
Reproduction: Canvas → Flights/Stays → canvas.

## Current Focus

hypothesis: The implementation interpreted unified as one DOM header, while changing its controls, height, background and chat-toggle placement by workspace.
next_action: Complete; verified locally, evidence in artifacts/testing/2026-10-29-header-consistency/verification.md.

## Evidence

- PlansApp.jsx switches className to focused-travel-header and replaces brand/sidebar navigation with the leading portal only while focused.
- focused-header.css changes the focused background and sets a 72px minimum height; the normal chat header retains separate styling.
- PlanningCanvas.jsx keeps its main chat controls in the content/sidebar while TravelWorkspace.jsx portals its toggle into the shell.
- Previous implementation plan explicitly described different header contents. The user's correction supersedes that interpretation.

## Resolution

User selected Back to canvas below the header. Acceptance: same shell geometry, colours, Plans/brand and chat toggle in Canvas/Flights/Stays; only the controlled chat changes. Account stays in Plans drawer. No duplicate canvas chat controls. Verify desktop/mobile navigation, chat state/focus, drawer, and source hashes on localhost:5196. Continue the existing GSD debug workflow inline; no new design alternatives needed for this correction.


Root cause: header unification was implemented as conditional replacement of shell controls/styles rather than consistent navigation.
Fix: permanent Plans/brand shell and shared Chat control; move Back into travel content; remove duplicate canvas chat toggles and closed-chat rail gap.
Verification: focused suites and new integrated regression passed, production build passed, Chrome desktop/mobile dark/light geometry and interactions verified, container sources matched. See linked evidence record for precise results and limits.
