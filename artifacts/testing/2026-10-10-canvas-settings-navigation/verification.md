# Canvas editing, navigation and Settings appearance

Verified 2026-10-10 at http://localhost:5474, Compose project `travella-liteapi-fresh`.

## User request and reproduced cause

Theme changes belong only in Settings. The user also reported that chat typing and flight-card navigation stopped working after generating a plan.

Inspection of the user's visible Chrome tab found an open **Add a place** editor. PlanningCanvas explicitly disabled chat whenever any editor was open, and silently returned from `open_flights` / `open_accommodation` despite rendering enabled entry buttons. The mobile Conversation view hid the editor and its explanation.

This is a correction to the existing approved design, not a new layout/prototype decision. [Prior canvas switch](plan/before-canvas-switch.png) and [reproduced editor lock](plan/before-editor-lock.png) were retained as before-state evidence.

## Changes

- Removed the canvas theme control and its unused component/styles/test. Account Settings remains the sole appearance control; the shared provider still themes the canvas and map.
- Allowed chat and travel search while card editors are open; whole-plan save and regeneration still require completing the editor.
- Kept canvas editors and chat mounted while travel search is visible, preserving unfinished fields and unsent messages on return.
- Allowed append-only activity additions without closing unrelated editors. Existing generation/save/reply consistency guards remain.
- Always handle editor-close events, including during an active reply, to avoid a stale editor lock.

## Executed verification

| Check | Result |
| --- | --- |
| Focused Vitest run: PlanningCanvas, AppearanceProvider, CanvasDestinationMap, AccountSettingsPage, TravelSearch | 26 tests passed; then PlanningCanvas suite passed all 3 tests after adding activity-merge coverage (27 distinct focused tests in total) |
| Production build | Passed; existing large-chunk advisory only |
| `git diff --check` | Passed |
| Local startup skill | Read-only Cognito precheck, Docker rebuild, health checks and example-account auth smoke passed |
| Container source | SHA-256 matched PlanningCanvas, canvas/chat CSS, and usePlanningCanvas against this checkout |
| Chrome DevTools MCP, example account | Real desktop (1440×900) and mobile (390×844) journeys exercised |
| Editor → flights → stays → canvas | Typed an unfinished place and unsent chat; both were identical on return, and chat remained enabled |
| Real chat with editor open | Sent one request to compare Milan airports without changing the plan; received a complete provider-backed assistant reply while the unfinished place remained present |
| Mobile navigation | Switched Conversation/Plan & map, opened flights, returned; unsent message and place field remained intact; document width equaled viewport (390px) |
| Settings appearance | Chose Light and Dark through Account Settings, navigated/reloaded the Plan and reopened canvas; shared theme persisted and no canvas theme control existed |
| Empty/loading | Search empty states and active chat reply/loading controls inspected |
| Console/network | No JavaScript errors in final pass; existing Lit dev-mode warning only. All 14 inspected final fetch/XHR requests returned 200 |
| Data | Test-only unfinished place was cancelled. No Plan save, generation, place addition or booking was submitted in the live browser. The single chat test added conversation messages. No backend CRUD handler changed. |

Regression tests use the real A2UI surface, canvas state and conversation hooks, with external map/search services stubbed. They cover editor/message retention through flight/stay navigation, sending during an open editor, cancelling during a reply, save-lock release, and append-only activity merging without overwriting independent edits.

All implementation screenshots were visually inspected. No clipping or horizontal overflow regression observed. Full unrelated application suites and actual flight transactions were not exercised for this UI repair.

## Evidence

- [Dark canvas, Settings only](implementation/dark-canvas-settings-only.png) · [Light mobile canvas](implementation/light-canvas-settings-only.png)
- [Editor and enabled chat](implementation/editor-chat-enabled.png) · [Dark editor](implementation/dark-editor-chat-enabled.png)
- [Flights with editor retained](implementation/flights-with-open-edit.png) · [Stays](implementation/stays-with-open-edit.png) · [Returned canvas](implementation/returned-editor-preserved.png)
- [Chat sending](implementation/chat-sending-with-editor.png) · [Real reply on mobile](implementation/mobile-chat-open-editor.png)
- [Mobile flights](implementation/mobile-flights-open-editor.png) · [Unsent message retained](implementation/mobile-chat-draft-preserved.png)
- [Dark flights](implementation/dark-flights.png)
