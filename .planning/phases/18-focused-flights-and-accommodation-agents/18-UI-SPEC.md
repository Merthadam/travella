---
phase: 18
status: draft
visual_verification: blocked
---

# Focused travel workspaces

This is a textual design contract for the agreed direction, not a visually verified design. The user declined interactive alternatives. Before frontend implementation, capture and inspect the current screens and a rendered outline through Chrome DevTools; the profile conflict is recorded in the evidence report.

## Layout and navigation

Flights and Accommodation are substages of the existing trip Canvas, not new top-level trip lifecycle stages. Compose the existing dedicated Flights/Stays screens. Keep Back to canvas, trip title, substage navigation and provider environment label. Preserve the existing Research → Canvas progression; do not add a new five-step traveler progress indicator. Below the heading place a compact “Using your trip” row: dates, travelers and theme, expandable to relevant selected activities and saved research choices. Pending unsaved Canvas edits are identified as not yet included.

Desktop: conversation on the left, results/comparison on the right; both have independent scroll and a visible composer. Use the existing typography, theme variables, border radius, spacing and button hierarchy. Do not import prototype components or add a new design system. “Adjust search” reveals the existing manual form; it is not a second competing default screen.

Mobile: one active pane with Chat / Options controls; preserve scroll and input draft per topic. Announce result counts without forcing a pane switch. Shared context expands inline. Topic tabs and Back remain reachable at narrow widths and zoom. At most three compared options are shown as stacked cards on narrow screens.

Use the existing Stays navigation label and “Accommodation assistant” in its chat heading. Flights uses “Flight assistant”. Neither presents itself as a booking agent. Do not expose SDK, MCP, internal tool steps or hidden reasoning to travelers.

## Interaction and states

- First visit shows a concise grounded greeting and optional prompts based on current trip facts. Merely opening a workspace performs no rate search or Plan mutation.
- Selecting an option offers “Discuss this option”, supplying a validated reference. Selecting two or three enables “Compare selected”. The chat and cards point at the same observed option IDs.
- The agent researches and refines within a finite budget without asking before every read-only call. It asks when a preference/tradeoff requires judgment. Search refinements stay topic-local. Shared date/party edits open the existing trip editor with explicit review. “Maybe a day earlier” remains exploratory.
- Results display observation time, sandbox status, total-price scope, unknowns and stale state. Changed flight price shows old/new observed prices; verification is not a seat hold.
- Shortlist actions use “Save to shortlist” / “Remove from shortlist”. “Choose for trip” opens exact option review; confirm saves a research choice labeled “Selected · not booked” and marks this substage ready. Removing the preferred choice returns it to research; relevant shared changes mark it “Needs review” while retaining the choice. Replacing/removing the chosen option is explicit and revision checked.
- Reopening restores history/notes/shortlist. Expired offers remain historical evidence with “Search again”; old prices are not presented as current.
- Provide loading, missing requirements, no matches, unavailable mode, inspection failure, expired evidence, history-load failure, context-changed, stopped and interrupted states. Retry is deliberate; keep independently successful evidence.
- Switching topics while replying stops the active stream; wait for cancellation/commit resolution before another send. Preserve completed history and input drafts. Late events cannot repaint another topic.

## Accessibility and acceptance

Reuse semantic buttons/forms, visible focus, keyboard navigation and existing accessible chat markup. Focus returns to the triggering option after detail/review closes. Errors use alerts; streaming text avoids repeatedly announcing the full transcript. Test desktop and mobile, light/dark themes and 200% zoom. No composer obstruction, clipped comparison terms or focus loss on topic switch.

Planning outline: `artifacts/testing/2026-10-25-focused-travel-planning/plan/workspace-outline.html`. Screenshots and visual inspection are pending; existence of this file does not waive the project testing skill.
