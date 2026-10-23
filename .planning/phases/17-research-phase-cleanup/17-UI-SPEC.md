---
phase: 17
status: approved-direction
source: user-selected prototype C
---
# Research desktop design contract

Desktop only; approved direction is the draggable overlay prototype at commit 1c3e236. Inspect artifacts/testing/2026-10-23-floating-brief/plan/{closed-desktop,open-desktop,light-open-desktop,moved-desktop}.png. Inline offer is specified below and needs an implementation preview; it was not part of those captures.

## Layout

Reuse existing theme tokens/typeface. Full-width quiet Research → Draft plan stage bar spans the Research workspace; progress connector stays, structural divider seams go. No duplicate research header or conspicuous Generate toolbar. Conversation uses available width with existing readable message widths and composer directly following short history (prototype gap 24px); long history remains usable and does not jump on overlay toggle.

Collapsed brief: 52px movable circle with a 4px green progress ring, numeric completed/total count (for example 5/6), accessible Trip brief name and readiness description. The count measures filled details, not permission to generate. Choose the default anchor outside the composer/send-control rectangle, including after short/long transcript changes; check this explicitly because the planning sketch can place the circle close to Send. User-directed dragging may intentionally overlay text. Drag threshold approximately 5px; drag does not click. Keyboard arrow movement, visible focus, Enter/Space toggle, Escape close. Provide discovery text on hover/focus and an accessible move instruction; circle is never the only place the draft-next message appears.

Open brief: 340px nonmodal overlay, background from app theme, 16px radius, restrained border/shadow, fixed/portal layer above Research but below modal review. Existing A2UI editor, current locked/saving/error state, readiness and manual review action; no duplicate heading/count. Max height 560px constrained to desktop viewport; contents scroll. Circle and close remain reachable near every edge and at 200% zoom. Opening/closing/dragging/resizing does not change any message/composer rectangle at the same scroll position. Focus returns to trigger on close. Background conversation stays interactive.

## Agent guidance and inline offer

After explicit destination confirmation, answer the traveler's current question first and briefly explain that the research is shaping a draft; ask at most one useful missing-detail question. No offer from destination alone.

On an eligible, committed assistant turn: concise contextual sentence such as “We have enough to put together a first draft for Lisbon. Want to review it, or keep exploring?” followed by understated Review & create draft and secondary Keep researching actions. Render once beside that message, using approved React/A2UI types; no generated HTML. Review is the primary action but avoids a large saturated banner. Subsequent ordinary turns do not repeat it. Deferred card becomes inactive acknowledgement; manual brief action remains discoverable.

## States/copy

Early: “Your draft comes next. Let’s shape the essentials first.”
Ready: “Ready to review a draft.”
Deferred: “We’ll keep researching. You can review a draft from your Trip brief when you’re ready.”
Stale: “Your trip details changed. Review the latest version.”
Running: prevent duplicate launch, retain current generation behavior.
Failure: preserve Research/brief and offer an honest retry/review without claiming a saved draft.
Existing draft: Open draft plan uses existing route and never starts generation.

## UI Considerations

D-01/D-10: research-only desktop styling; production route excludes mock controls. D-02/D-04: full-width state bar, compact conversation, data in overlay. D-03: overlay does not reflow text. D-05/D-06/D-07: useful contextual offer and durable respectful deferral. D-08/D-09: review is topmost, stale offers disabled/revalidated, no auto-generation or save. Every resolved consideration is covered in phase plan truths.

## Evidence gate

Authenticated example account in Chrome DevTools at 1440×1000 and 1280×800, light/dark, keyboard, drag, 200% zoom and scroll. Inspect actual screenshots before completion. Existing prototype screenshots document accepted direction; capture inline offer plan preview before production rendering and final corresponding implementation states. Mobile redesign/testing deferred by user.
