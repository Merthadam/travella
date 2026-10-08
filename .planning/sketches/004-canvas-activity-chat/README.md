---
sketch: 004
name: canvas-activity-chat
question: "How should a few Maps-style activity suggestions appear beside the planning canvas?"
winner: null
tags: [canvas, chat, a2ui, activities, maps]
---

# Activity suggestions inside canvas chat

Throwaway UI prototype. No production files, agent calls, provider searches or
durable edits. Data, map, ratings, distances and save behavior are simulated;
photos are illustrative rather than verified venue photography.

## Run

From the repository root:

```sh
python3 -m http.server 5178 --bind 127.0.0.1 --directory .planning/sketches
```

Open http://localhost:5178/004-canvas-activity-chat/?variant=A

## Compare

- **A — Place cards:** stacked compact cards; compare information and add inline.
- **B — Shortlist:** photo-first horizontal cards; swipe or use activity arrows.
- **C — Place explorer:** scan three compact rows, then inspect one expanded place.

Variant arrows and A/B/C controls update the URL. Arrow keys cycle variants when
outside interactive controls. State is in memory and shared between variants;
reload resets it. Prototype tools show the full relevant state and allow reset,
mobile/tablet sizing, loading, empty and error states.

## Try

1. Show a place on the map: a preview pin appears, without adding it.
2. Add to plan: purple draft pin, Added state, draft counter. Click Added to undo.
3. Type "add the first two" in chat, or use the matching shortcut.
4. Save plan: explicit simulated save feedback. Nothing is persisted.
5. Phone: preview opens Plan & map; Conversation returns to the cards.

Representative Salzburg photos are bundled locally so opening the prototype
does not make image-provider requests. See [photo sources](assets/PHOTO-SOURCES.md)
for origins and licenses. These are not live Google Places photos.

Question and variants were authorized in the conversation. Selection remains
pending; keep this prototype on branch `prototype/canvas-activity-chat`.
