---
name: create-wireframes
description: Plan and create low-fidelity Travella screen wireframes in Figma through a decision-led interview, user-story traceability, and iterative previews. Use for Travella screens, wireframes, or UI flows; do not use for production frontend implementation.
---

# Create Travella Wireframes

Create understandable, low-fidelity wireframes that make an agreed traveler journey reviewable before visual design or implementation.

## Start with the product decision, not a canvas

1. Read `docs/overview.md`, `CONTEXT.md`, the relevant user-story README files, and `docs/screens/README.md` before proposing a screen.
2. Identify which confirmed user story or stories the UI serves. Do not add product behavior merely to fill a layout.
3. Start every new screen or flow with two core questions:
   - Which user story or stories must this UI make possible?
   - What exact screen or flow should be designed in this session?
4. Then run a focused interview. Ask one consequential question at a time—only when it affects traveler control, trust, recovery, an important state, or the screen boundary. Do not turn ordinary layout choices into a long questionnaire.
5. Once enough context is available for one coherent screen or a tightly connected screen pair, stop asking questions and create a preview. State the assumptions represented, show the Figma preview, and ask for feedback before broadening the flow.

Treat user-story decisions as authoritative. If a wireframe discussion reveals a new product decision, pause and record or resolve it with the user; do not silently introduce it in Figma.

## Figma working style

- Use Figma MCP for the editable design artifact. Before creating a Figma file, load and follow the `figma-create-new-file` skill; before calling `use_figma`, load and follow the `figma-use` skill.
- Start on a Figma page named **Paper wireframes** unless an existing file has an established equivalent.
- Work in paper-wireframe fidelity: neutral colours, simple typography, obvious labels, boxes, and clear interaction affordances. Prioritize hierarchy, information, states, and action outcomes over branding, polished copy, or final components.
- Create named frames for each screen/state and connect or annotate the significant transition, handoff, error, and recovery states required by the supporting user story.
- Keep generated UI bounded to confirmed, validated controls. Never represent research, an option, a supplier redirect, or a booking more confidently than the relevant story permits.

## Preview and review loop

After each meaningful design increment:

1. Inspect the Figma result for readability, spacing, visible hierarchy, and whether its controls match the confirmed story.
2. Share the preview with the user. Name the frame(s), explain the traveler outcome it supports, and list only material assumptions or open questions.
3. Wait for feedback or approval before creating the next screen family or materially redesigning another flow.

If a visual inspection or preview cannot be produced, say so plainly. Do not claim it was reviewed.

## Keep screen planning traceable

- Update `docs/screens/README.md` only when the user asks to record an approved screen, Figma link, or material screen-inventory decision.
- Preserve the distinction between screen families, confirmed states, and future/post-MVP work.
- For a new substantive flow, update the corresponding user story only with the user's approval. A Figma wireframe is supporting evidence, not the source of truth for behavior.
- Do not create production code, a design system, or high-fidelity visual design unless the user explicitly asks.
