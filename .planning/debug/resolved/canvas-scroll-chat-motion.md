---
status: resolved
trigger: "few issues on full screen chat no animation to opening side chat and no real way to scroll the plan if it is closed"
updated: 2026-10-24
---

## Symptoms

Expected: a gentle transition into the side chat after generation and when opening it; the full plan scrolls with chat open or closed. Preserve the current design, drafts, focus, and reduced-motion behavior.
Actual: chat appears abruptly; the closed-chat plan cannot be fully scrolled.
Reproduction: generate/open a canvas, collapse and reopen its chat, attempt to scroll the plan. Report follows the approved globe-loader implementation. No reported error message.

## Current Focus

hypothesis: confirmed. Vertical auto margins disable grid-item stretching when chat is closed. No side-chat or workspace animation exists.
next_action: complete; implementation 4fe4897 verified and local app rebuilt.

## Evidence

- Real saved synthetic verification plan: 968156ee-c7b7-4596-8f57-3f615f374685, eight explicitly labelled layout notes; no existing user Plan changed.
- Open chat: scroll region 871px high, content 2412px, within the viewport.
- Closed chat: region expands to 2115px (same as content), extends below the 1000px viewport, parent clips overflow. Setting scrollTop to 900 yields 0 because the inner region has no overflow of its own.
- Reopening chat reports no running animations.

## Resolution

Constrain the grid row and inner scrolling region, retain horizontal-only centering, and make Plan content keyboard-focusable. Focus it after full generation. Add a 520ms desktop grid reveal and chat slide/fade after loader reveal and on reopening; preserve the existing reduced-motion override.

Verified in authenticated Chrome DevTools: closed desktop scroll region remains 871px, Page Down moves 831px, End reaches the true bottom at 1244px. Closed mobile reaches its bottom at 2086px. Native animations appear both when opening a saved plan from full-screen conversation and when a real generation completes. Reduced motion runs no animations. Focus handoff waits a frame for the mobile canvas view to become visible.

25 tests passed; one pre-existing Python SSE fixture test skipped because its environment fixture is unset. Build and source/container hash checks passed. The verification plan was soft-deleted (active 404, deleted lifecycle confirmed); isolated test browser signed out. No push/merge. Evidence: artifacts/testing/2026-10-24-canvas-scroll-chat/verification.md.

## Approach

Inline GSD debug (no subagents). Keep the accepted layout; fix the existing interactions, without new prototype alternatives. Verify desktop/mobile, generation reveal, collapse/reopen, keyboard scrolling, draft/focus retention and reduced motion. Record screenshots and browser evidence in artifacts/testing/2026-10-24-canvas-scroll-chat/.
