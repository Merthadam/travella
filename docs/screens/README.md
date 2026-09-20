# Travella screen inventory

This folder is the planning home for Travella's screen inventory and wireframe decisions. Editable design artifacts are created in Figma; this folder records the screen purpose, the user stories it serves, and links to the approved Figma work when available.

## Working agreement

- Begin a screen-design session by confirming the relevant user story or stories and the traveler outcome.
- Work as low-fidelity paper wireframes first. Validate structure, actions, states, and transitions before visual styling or a component system.
- Design one coherent screen or tightly related flow at a time. Once there is enough agreed context, share a Figma preview and collect feedback before expanding the work.
- A wireframe does not establish new product behavior. Record any behavior decision in its applicable user story first.

## Initial screen families

These are the requested starting points. They are an inventory to refine, not a committed wireframe set.

| Screen family | Traveler outcome | Supporting user stories | Initial states to consider |
| --- | --- | --- | --- |
| Account access | Register, sign in, recover account access, and return safely to Travella. | US-001 | Sign in, registration, email verification, password reset, two-step verification, session expired. |
| My plans | Find, create, resume, delete, or restore private Draft Plans. | US-004 | Empty, active Plans, Recently deleted, create, restore. |
| Plan workspace | Work in one Plan's Conversation and map-based Planning Canvas. | US-002, US-003 | Open-ended discovery, chosen destination, canvas/map, categorized list, selected-pin details. |
| Travel-option search | Provide inputs, review results, compare options, and refresh safely. | US-005 | Missing inputs, provisional dates, results, comparison, updating, unavailable/error. |
| Selection confirmation | Deliberately add, replace, edit, or remove a saved option or Custom Map Pin. | US-003 | Add, replacement, edit, removal, completed change. |
| Supplier handoff | Recheck an eligible selected option and leave Travella for the verified supplier. | US-006 — supplier redirect | Recheck, changed terms, unavailable, final handoff confirmation, return with booking status unknown. |

## Deferred screen families

Do not design these for the MVP unless their scope is deliberately changed: day-by-day itinerary, route optimisation, in-app checkout or payment, booking management, collaboration, profile preferences, alerts, and multi-destination planning.
