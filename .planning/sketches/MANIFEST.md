# Sketch Manifest

## Design Direction
An assured, contemporary travel copilot that feels conversational and active while showing only useful traveler-facing updates. Keep the openable right-side Plan context, preserve the map workspace, and never expose model reasoning or generic thinking copy.

## Reference Points
ChatGPT-style conversational flow; the existing Travella map-first Plan workspace; dark navy surfaces with mint and restrained violet accents.

## Sketches

| # | Name | Design Question | Winner | Tags |
|---|------|----------------|--------|------|
| 001 | copilot-chat-directions | Which conversation structure makes Copilot feel useful and dynamic inside a Plan? | Pending | conversation, copilot, layout |
| 002 | dynamic-researcher | Which interaction structure makes a tool-using, source-grounded researcher feel capable and conversational while keeping the Plan and traveler in control? | Pending | agent, conversation, research, evidence |
| 003 | full-screen-travel-guide | How should a simple GPT-like travel chat surface current research and the travel facts it learns? | A — Clean Chat | travel-guide, full-screen, chat, research, memory |
| 004 | canvas-activity-chat | How should a few Maps-style activity suggestions appear in the canvas side chat? | C — Place explorer | canvas, side-chat, a2ui, activities, maps |

## Active Direction for Sketch 003

Keep the experience full-screen and chat-first, like a straightforward GPT wrapper. Stream the assistant's user-facing reply text and show any available source links inline. Keep the agent's existing Plan context on the server; do not expose context, memory contents, tool activity, or research progress in the chat. There is no context drawer, Planning Canvas, map, or researcher dashboard. Country research, Tavily calls, remembered preferences, and state changes in the sketch are simulated.

## Direction for Sketch 004

Current request: after canvas generation, continue the same conversation in an
automatically opened side chat. Its first editing capability suggests a few
activities from an area-bound Maps MCP search. A2UI place cards offer preview and
explicit Add to plan; Save plan remains separate. Compare stacked place cards,
a swipeable shortlist, and a compact list with an expanded place preview.
Use the approved canvas's green/paper palette. This is an isolated simulated
canvas, with no agent, Google API, authenticated session, or durable mutations.

## Sketch 005 — Quiet plan navigation

| # | Name | Design Question | Winner | Tags |
|---|------|----------------|--------|------|
| 005 | quiet-plan-navigation | How can switching, renaming and deleting plans feel quiet and direct? | B — Recent first, trailing hover trash | plans, navigation, inline-editing |

Direction: compact GPT-like plan navigation; double-click the title to edit, with selected B placing muted trash on the right. Compared quiet sidebar, recent-first grouped drawer, and centered searchable switcher. Simulated actions only; preview and evidence pointers in the sketch README.

### Selected direction for Sketch 005

User chose B (Recent first) and requested the trash icon on the right, appearing only on row hover. B now uses a trailing trash icon with keyboard-focus visibility and a visible touch fallback; double-click inline renaming is retained. Production integration completed in quick task 261011-01k; authenticated desktop/mobile evidence is in artifacts/testing/2026-10-11-quiet-plan-navigation/verification.md. Full throwaway source is archived on prototype/quiet-plan-navigation-2026-10-10-b.
