# Canvas activity editing — approved C

## Locked decisions

Use the approved Place explorer C from sketch 004. Continue the Plan conversation in a side chat, open automatically after generation, and explain the transition. Add a dedicated LangGraph canvas-editing node with its own Claude Agent SDK loop and activity skill. Supply current unsaved draft, trip context, conversation and read-only preferences. Search Google Places within destination bounds or an explicitly chosen map area. Present a few real suggestions; preview is temporary, Add to plan modifies the editable draft, Save plan remains the explicit durable action.

## Execution

1. Extend the authenticated Maps MCP with destination-area resolution, bounded place search and details. Reuse private transport, cap requests/results, retain real provider attribution, no durable writes.
2. Add typed editing request/result contracts and a bounded Claude Agent SDK editing node. Ground suggestions/pins in observed Places results, validate current-draft input, bind returned suggestions to traveler/Plan, preserve conversation and existing run/cancel boundaries. No direct Anthropic SDK.
3. Implement approved C as an allow-listed A2UI chat component, full-height canvas side chat, streaming text, loading/error/empty states, preview/add/dedup and mobile tabs. Preserve unsaved manual edits and Save plan behavior.

## Acceptance / manual verification

- Existing conversation loads; generation opens side chat with an accurate transition note.
- Request activities, receive real area-bound Google results, inspect C rows/detail, preview without adding, add once, see purple map pin.
- Agent can handle explicit add requests using prior suggestions; never invent coordinates or save a Plan.
- Stop/failure leaves draft intact, editing is locked while a turn runs; useful retry is available.
- Save and reopen preserves chosen pins. Desktop/mobile screenshots, console/network review, honest unavailable/error handling.
- Use the local skill and example account. No automated tests requested; do not add or run them.

## Scope boundary

First editing capability is activity suggestions and addition. Booking, itinerary scheduling and broader component rewrites are later. Provider suggestions are ephemeral; saved pins use the existing durable canvas contract. Prototype source remains separately reviewable; no prototype fixtures enter production.
