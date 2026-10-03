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

## Active Direction for Sketch 003

Keep the experience full-screen and chat-first, like a straightforward GPT wrapper. Stream the assistant's user-facing reply text and show any available source links inline. Keep the agent's existing Plan context on the server; do not expose context, memory contents, tool activity, or research progress in the chat. There is no context drawer, Planning Canvas, map, or researcher dashboard. Country research, Tavily calls, remembered preferences, and state changes in the sketch are simulated.
