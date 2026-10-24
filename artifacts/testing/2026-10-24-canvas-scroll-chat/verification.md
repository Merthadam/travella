# Plan scrolling and side-chat reveal

2026-10-24 · implementation `4fe4897` · canonical local app `http://localhost:5174`

## Reproduction and fix

The closed-chat rule used vertical auto margins on the grid item that owns plan scrolling. This disabled stretching: inside an 871px workspace, the inner panel became 2115px tall, matching its content. The parent clipped it; even assigning scrollTop=900 returned 0. Reopening the side chat had no animation.

The grid now has a constrained row; the inner panel has height 100%, min-height 0 and horizontal-only auto margins. Plan content is a named keyboard-focusable region, and full generation moves focus into it after the mobile view changes. Desktop chat opens with a 520ms grid expansion and slide/fade, including after the full-screen generation loader. Reduced motion disables the transition/animations. Existing layout, light/dark colors, draft preservation and separate Save plan remain intact.

This was an inline GSD debug repair of the accepted design, without new prototype alternatives.

## Automated checks

- `npm test --prefix frontend -- --pool=threads --maxWorkers=1 src/features/plans/components/PlanningCanvas.test.jsx src/features/plans/travel/CanvasTravelJourney.test.jsx`: **25 passed, 1 skipped**. The existing Python SSE fixture case requires `TRAVELLA_CANVAS_SSE_FIXTURE`; it was not configured. Passing cases include chat draft/focus retention, generation visibility and new Plan content focus assertions, plus travel handoff regressions.
- `npm run build --prefix frontend`: passed after the final focus timing adjustment. Existing large-bundle warning only.
- `git diff --check`: passed.
- Local stack rebuilt with repository startup script, successful health and isolated authentication check. No active research lease existed before the rebuilds. Database volumes were preserved.

## Authenticated Chrome DevTools

Used the supplied example account in an isolated session with official Chrome DevTools MCP. Created and saved only one synthetic verification plan (`968156ee-c7b7-4596-8f57-3f615f374685`) containing Lisbon and eight clearly labelled layout notes. Credentials and unrelated account content were not recorded. Browser operations/results are in [browser-results.json](browser-results.json).

1. Measured open and closed layout dimensions and reproduced scrollTop remaining 0. Inspected [before, chat closed](plan/before-chat-closed.png).
2. After rebuilding, closed-chat panel height stayed 871px with 2115px content. Native Page Down moved scrollTop from 0 to 831; End reached 1244, exactly its maximum, with note 8 visible. Inspected [desktop bottom](implementation/closed-chat-bottom-desktop.png).
3. Reopened chat through its real button. Chrome reported `canvas-chat-layout-in` and `canvas-chat-reveal`, both 520ms. Paused them at 180ms solely to inspect the [opening frame](implementation/sidebar-opening-desktop.png), then resumed. This is the actual UI animation, not a mockup.
4. At 390×844, opened the mobile conversation and collapsed it. Plan scroll area was 664px, content 2750px, and scrollTop reached its maximum 2086; no horizontal overflow. Focus returned to Conversation. Inspected [mobile bottom](implementation/closed-chat-bottom-mobile.png).
5. At desktop width with reduced motion, collapse/reopen completed at 420px chat width with no running animations. Mobile also reported none under reduced motion.
6. Ran actual regeneration on the verification plan. The [full-screen loader](implementation/full-screen-generation.png) kept the workspace hidden while streaming. Generation completed with “Draft ready to review.” An observer recorded both 520ms sidebar animations when the loader cleared. The sidebar became visible, and focus subsequently reached Plan content. Its height remained 871px with 2352px content. Inspected [generated plan with sidebar](implementation/generated-plan-with-sidebar.png). Discarded only this unsaved verification regeneration using the normal leave confirmation, preserving the saved synthetic test fixture.
7. Inspected console and network after real generation: only the existing Lit development-mode warning, no errors; all 16 inspected fetch/XHR requests returned 200.

Screenshots were inspected for clipping, overlap and inaccessible bottom content. The fixed plan reaches its true bottom; the composer stays in the sidebar; mobile tabs remain accessible. No backend behavior was changed. The fixture-dependent SSE test is the only skipped automated check; a real browser generation exercised the running stream.

## Final rebuild and cleanup

After the small focus-timing adjustment, rebuilt again and matched SHA-256 hashes for the final React component and stylesheet against the running container. Reloaded the saved synthetic plan, returned to full-screen conversation, and reopened Draft plan: both sidebar animations were present. Opened accommodation search to verify the shared scrolling region remained 871px, ended at the viewport bottom, and retained overflow auto. Deleted only the verification plan through its current revision/challenge API, verified active read 404 and deleted lifecycle, and signed out the isolated browser session (200). No push or merge; local app remains running.
