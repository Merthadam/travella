---
status: resolved
trigger: "i cant scroll down"
created: 2026-10-09
updated: 2026-10-09
---

## Symptoms

User screenshot shows accommodation results for Milan, 2026-10-23 through 2026-10-26, Italy, Hungary nationality, EUR, one room and two guests. The first result is visible, but the user cannot scroll to the remaining results in the new localhost:5474 stack.
Expected: ordinary wheel, touch and keyboard scrolling can reach all returned results and Show more.
Timeline: reported after launching the new container with the search implementation.

## Current focus

Root cause confirmed: travel mode switched the workspace grid to block layout; the auto-sized inner canvas grew to content height while its fixed-height parent hid overflow. The parent main also received keyboard focus instead of the intended scrolling region.
Verification: complete against the rebuilt localhost:5474 stack using Chrome DevTools and native Page Down presses.

## Evidence

- Canvas workspace and body both hide overflow; the inner canvas normally owns scrolling.
- Travel-specific rules change the workspace body layout and inner sizing.
- Design A remains the explicitly selected layout; this is a behavior repair.

## Resolution

Kept travel mode in a single constrained grid track, explicitly bounded the inner canvas to 100% height with min-height zero, and made that region keyboard-focusable only while travel search is open.

Before: outer height 828px, inner height/content 3355px, Page Down left scrollTop at zero.
After: inner height 828px, content 3355px, Page Down moved scrollTop to 820px. Desktop Show more was reachable; all 30 hotels were loaded and mobile scrolling reached the true bottom (16488px). Flight results scrolled on desktop and mobile. Returning to the canvas restored its normal overflow and focus behavior.

Frontend build passed. Final container source hashes match both changed files. Evidence: artifacts/testing/2026-10-09-search-scroll/verification.md. No durable Plan mutation or backend change.
