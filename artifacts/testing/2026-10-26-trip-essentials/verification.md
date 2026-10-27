# Combined Trip essentials design exploration

Started 2026-10-26; completed 2026-10-27. Prototype delivery only. User design selection, production integration and actual research-subagent work remain pending.

## Preview and scope

- Branch: `prototype/trip-essentials-20261026`, based on main after PR #19.
- Run: `cd frontend && npm run prototype:essentials`.
- URL: http://localhost:5192/plans/0355fb3e-acb1-438b-9177-ccccb1da588c?prototype=trip-essentials&variant=A (also B/C).
- Existing authenticated canvas route, map, flight/stay cards and read handlers retained. Development-only rendering replaces themes/findings/links with one combined component. Host editing/generation/chat controls disabled or hidden in this preview.
- All new choices, preferences and kept notes are in memory. Sample destination advice and source dialogs are explicitly unverified examples. No model generation, supplier handoff or durable Plan mutation was implemented.
- Backend remains the separate main-controls stack on port 8010. Shared port 5174, dirty primary checkout and database were not changed.

## Executed checks

- Signed in using the configured example account; credentials read at runtime and excluded from evidence.
- Chrome DevTools MCP inspected the real authenticated canvas and exercised A expansion, note keeping, transport choice and preference-dialog opening.
- MCP `Page.captureScreenshot` repeatedly timed out. Continued with a fresh isolated Chrome controlled through the Chrome DevTools protocol, using the installed Chrome DevTools package's Puppeteer transport and `--disable-gpu`. CDP `Page.captureScreenshot` then succeeded. This was a capture-transport workaround, not a substitute mock UI.
- A: expansion, note keeping, transport choice/change, preference checkbox/save, resource dialog and Escape.
- B: topic navigation, note keeping, decision panel and transport choice.
- C: journey-stage expansion, note keeping and contextual resource dialog.
- Switcher: click and keyboard arrows, wrapping, shareable variant URL, no arrow interception in dialogs or selects.
- Reload retained selected URL variant and reset simulated edits. Ready/generating/empty controls exercised.
- Desktop 1440×1100, mobile 390×844, dark A/B/C and light B inspected. No horizontal document/component overflow. Saved screenshots opened and visually inspected. Dialog placement and inherited label margins corrected; mobile chat overlap removed.
- Desktop source dialog centered; mobile preference dialog stayed within viewport after the layout fixes.
- `npm run build`: passed. Existing large-bundle warning remains. Prototype content and styles absent from `frontend/dist` by string check.
- `git diff --check`: passed. No prototype unit tests added, following the throwaway-prototype skill.

## Console/network observations and limits

- No JavaScript page errors in the completed interaction run. All 35 observed `/v1` requests were GETs; no Plan writes or generation requests. See [browser-checks.json](plan/browser-checks.json).
- A separate console/network check recorded the expected signed-out `/auth/session` 401, an existing missing `/favicon.ico` 404, and a 503 from the host canvas's travel-capabilities endpoint. These did not prevent the combined-component previews or their local interactions. Flight/stay availability was not verified in this design task.
- Existing Lit development-mode and Google Maps event-listener warnings remain. See [console-network.json](plan/console-network.json).
- No actual destination information was researched or verified. Future dedicated Claude research subagent generation and performance are not implemented or benchmarked.

## Screenshots

- [A desktop](plan/a-desktop.png), [A mobile top](plan/a-mobile-top.png), [A mobile lower section](plan/a-mobile-bottom.png).
- [B desktop](plan/b-desktop.png), [B mobile top](plan/b-mobile-top.png), [B mobile lower section](plan/b-mobile-bottom.png), [B light](plan/b-light.png).
- [C desktop](plan/c-desktop.png), [C mobile top](plan/c-mobile-top.png), [C mobile lower section](plan/c-mobile-bottom.png).
- [Resource dialog](plan/resource-dialog.png), [mobile preferences](plan/preferences-mobile.png), [generating](plan/generating.png), [empty](plan/empty.png).

Production design selection is intentionally open. Recommendation: A for quick scanning, B for richer sourced explanations, C for advice organized by when it becomes useful.
