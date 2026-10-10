---
sketch: 005
name: quiet-plan-navigation
question: How can switching, renaming and deleting plans feel quiet and direct?
winner: "B"
tags: [plans, navigation, inline-editing]
---

# Quiet plan navigation

GSD sketch workflow; requested direction: modern GPT-like density, double-click title to rename, small left-side trash icon. User explicitly requested prototypes; no further intake needed.

## Archived prototype

Full source is preserved on `prototype/quiet-plan-navigation-2026-10-10-b` at `f83271dcf95e`, path `.planning/sketches/005-quiet-plan-navigation/index.html`. Run a static server from that archive to compare A/B/C. Production implementation is available at http://localhost:5181.

- A: quiet sidebar, compact title-first list, metadata only on the selected row. Closest to existing drawer structure.
- B: recent-first drawer, date groups and destination subtitles, search for larger collections.
- C: centered searchable switcher, horizontal title/destination layout, more room for the conversation.

All variants: double-click title editing and small trash controls. A/C retain left-side trash; selected B places trash on the right, hidden until row hover or keyboard focus (always visible on touch). Other behavior: double-click title or F2 to edit, Enter explicitly confirms the displayed exact name, Escape cancels, small inline delete confirmation naming the affected plan, add, select, close/reopen, search (B/C), empty states, Reset. All records are invented and state stays in memory. Reload resets changes. Console reports relevant sample state; preview toolbar labels simulation.

## Scope and rationale

The app at the user's screenshot port (5180) is running from a different checkout (`gravel-mangosteen`). This GSD sketch uses a reconstructed conversation host in isolated HTML to avoid changing that running checkout or connecting prototype actions to real records. Actual frontend: React 19, Vite, CSS/Tailwind; existing PlanDrawer is the implementation host after selection. Native input, button and grid patterns require no new dependencies. No authenticated application behavior is being validated.

## Acceptance criteria

Compare structurally distinct variants, keep actions quiet, no large Rename/Delete controls, double-click inline editing with explicit Enter confirmation, exact-plan delete confirmation, responsive layout without clipping, usable keyboard alternatives, no mutation requests.

## Evidence and next step

See `artifacts/testing/2026-10-10-quiet-plan-navigation/verification.md`. User selected B: “design b is perfect but trash icon on right only appearing on hover”. The requested refinement is applied to B, with keyboard-focus and touch access. The chosen design is now implemented and verified. See `artifacts/testing/2026-10-11-quiet-plan-navigation/verification.md`. Throwaway HTML has been removed from the production working branch.

Prototype source and verification are archived on `prototype/quiet-plan-navigation-2026-10-10-b`. The working branch was not switched.
