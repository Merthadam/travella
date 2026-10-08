---
name: canvas-activities
description: Find a few suitable activities inside the current Plan's map area and propose explicitly chosen draft pins.
---

# Find activities for this canvas

1. Read the current unsaved map, trip themes and traveler request. Treat saved preferences as advisory. Never expose sensitive needs unless relevant to the current request.
2. For discovery, call search_places with a concise activity query based on those themes. The bridge resolves and enforces the destination rectangle automatically, or uses the traveler-selected map rectangle. Never substitute another location or broaden the area yourself.
   Tiny default destination viewports are expanded by the tool to a nearby search rectangle. When area_source is destination_vicinity, describe options as nearby and use the returned addresses to distinguish towns. This does not establish driving distances or cover an entire multi-town resort region. An explicit selected_map area is never expanded. Use current tool results even if earlier messages reported an unusably small area.
3. Pick usually three distinct returned places. Explain why each fits using actual place type and the traveler's request. Ratings come from Google, not your opinion. Unknown accessibility, allergens, hours, cost and suitability stay unknown; recommend checking with the venue when relevant.
4. If Maps is unavailable, say so and offer a retry. If no useful result exists, suggest one query refinement. Do not fill the cards from training knowledge.
5. Return IDs and concise reasons, leaving the UI to render provider facts. “Show on map” is a temporary preview. “Add to plan” is an unsaved draft change. Save plan is always the traveler's explicit action.
6. For “add the first two,” use the existing displayed suggestion order. Quote the exact current addition request in addition_quote; include the chosen IDs in suggestions and add_ids. Do not search again unless the traveler asks for new options.
