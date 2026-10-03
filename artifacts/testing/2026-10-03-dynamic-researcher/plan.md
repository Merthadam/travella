# Dynamic researcher UX prototype plan

## User journey

Inside an open Travella Plan, the traveler says: “I’m from Hungary and want a windy surf holiday, with a five-hour-or-less flight.” The researcher begins low-risk discovery, asks one useful clarification about the kind of surf, exposes traveler-safe tool activity, and returns source-backed options. The traveler then asks “What would Vienna offer?” and gets a contextual answer that explains Vienna does not fit a coastal surf brief, with an option to clarify whether Vienna is a departure point. The traveler can inspect cited evidence, ask a focused follow-up, and explicitly choose whether to save an option.

## Acceptance criteria

- Three structurally distinct, interactive alternatives cover the same conversation and follow-up.
- Each alternative visibly distinguishes user messages, assistant answers, current research activity, finished tool calls, and cited source material.
- Tool activity says what the system is doing in traveler-friendly language; it never displays internal reasoning.
- The “Vienna” follow-up is interpreted against the surf brief instead of being treated as a fresh, context-free destination search.
- Candidate evidence and uncertainty are visible; provider results are clearly marked simulated in this prototype.
- Save controls require an explicit click and visibly state that they are simulated; the prototype makes no API or Plan mutation.
- Each alternative works at desktop and phone widths and is reviewable in Chrome.

## Design question

Which interaction structure makes a tool-using, source-grounded researcher feel capable and conversational while keeping the Plan and traveler in control?

## Alternatives

- A: Inline research — tool activity, citations, and options live in the conversation stream.
- B: Evidence workspace — conversation sits beside an inspectable sources and tool-activity rail.
- C: Research mission — the latest query and its progress/evidence take the main canvas, with conversation available as a compact command thread.

## Constraints

- Prototype only; tool calls, source records, candidate research, and saves are simulated.
- Keep the existing Travella dark navy / mint design direction.
- Do not change production UI or backend during the comparison.
