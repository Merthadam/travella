---
phase: 18
status: planned_revision
visual_verification: shared_workspace_sketch_inspected
---

# Focused travel workspaces — current contract

Current authority: 2026-10-27 user approval and `18-WORKSPACE-SPEC.md`. Earlier chat-centric behavior below is implementation history only. This revision is not implemented.

## Layout and navigation

Use the existing dedicated Flights/Stays screens and Canvas chat dock. The main pane is the primary search, filters, results, details and comparison surface. Desktop keeps the collapsible full-height chat at right with independent scrolling and visible composer; mobile defaults to Browse with one-tap Chat and preserved state/draft. Keep existing Back to canvas, topic navigation, theme tokens, shared ChatHeader/ChatComposer and compact expandable trip context. No extra navigation level, lifecycle stage or browser window.

## Controls and information hierarchy

- Search fields and Search action lead; active filter chips, result count, sort and Dismissed follow. Separate editable fields from the criteria that produced visible results. Apartment/amenity/refundable controls remain accessible manually and to the specialist.
- Cards show price scope, mode-specific facts, provider source, observation/freshness and sandbox labels. Flight cards show actual airline marks/names when available; neutral airplane fallback otherwise. Never use the supplier mark as the airline mark. Stays distinguish property amenities from room evidence.
- Cards contain Details, a labeled Compare checkbox and a quiet Dismiss button. Details expose exact room/rate or return-fare review, Choose for trip and existing saved-shortlist controls. Dismiss affects visibility only and exposes Undo/restore.
- Two or three selected cards reveal Compare. Main-pane comparison uses aligned facts on desktop and stacked sections on narrow screens. Explicit Compare may initiate discussion with validated references; the manual facts view still works when chat cannot respond. Typed chat drafts are never replaced.
- Chat contains explanation, questions, concise update summaries and small contextual references that focus an option in the main pane. Remove duplicated full recommendation cards and specialist View all results import. Do not add a second suggestions browser or search box in chat. Legacy transcript evidence remains readable and historical.
- Agent results update the main pane automatically only if still applicable. No auto pane switch, focus theft, scroll jump or draft replacement. A manual edit invalidates pending replacement. Keep old results while updating, preserve detail inspection context, and offer Stop.

## States and accessibility

Show missing inputs, loading, zero matches, provider errors, expired observations, stale context, interrupted/canceled turns, history unavailable and unsupported capabilities honestly. No automatic constraint relaxation. Manual search stays enabled during agent work. Failed refresh retains labeled prior evidence; successful empty results retain filters and recovery controls. Broken carrier images fall back without layout shift.

Keyboard users can search, select comparison, dismiss/Undo, inspect, close details and confirm. Restore focus to the initiating control; if a card was dismissed, focus its next sibling or results heading. Announce counts/change summaries once using polite live status, not the entire transcript. All visible actions have accessible names. Comparison has a readable narrow-screen structure. Respect reduced motion, light/dark tokens and 200% zoom; no horizontal page overflow or obscured composer.

## UI Considerations

| Consideration | Verification | Acceptance |
|---|---|---|
| Manual completion | explicit | Search, inspect, compare and choose with chat closed and when an agent request fails. |
| Shared view | explicit | Manual and agent actions show identical applied criteria, order, visibility and result identity. |
| User precedence | explicit | Typed-but-unsubmitted form input and newer filter changes survive late effects. |
| Quiet assistant | explicit | Auto search updates results without importing cards, switching mobile pane or moving focus. |
| Logo fallback | explicit | Name and leg/carrier identity remain legible with missing/error/multiple carrier images. |
| Reversible narrowing | explicit | Dismiss/Undo affects only temporary visibility, including saved options. |
| Mobile and zoom | explicit | Browse default, persistent composer/draft and accessible comparison at 390px and 200% zoom. |

Planning sketch and inspected captures: `artifacts/testing/2026-10-27-shared-travel-planning/plan/`. Production acceptance is future work. See the adjacent verification record for exactly what was checked.

## Historical implementation contracts — superseded where conflicting

The following records document earlier implementation and its evidence, not instructions for the new workspace revision.


The user declined interactive alternatives. An isolated Chrome DevTools session captured the rendered desktop/mobile outline before implementation and the authenticated final workspaces after implementation. Screenshots were inspected; broader light/native-zoom acceptance remains pending. See the execution verification report.

## Layout and navigation

Flights and Accommodation are substages of the existing trip Canvas, not new top-level trip lifecycle stages. Compose the existing dedicated Flights/Stays screens. Keep Back to canvas, trip title, substage navigation and provider environment label. Preserve the existing Research → Canvas progression; do not add a new five-step traveler progress indicator. Below the heading place a compact “Using your trip” row: dates, travelers and theme, expandable to relevant selected activities and saved research choices. Pending unsaved Canvas edits are identified as not yet included.

Desktop: manual booking-style search, filters, results and details are the primary left pane; a collapsible specialist sidechat sits on the right with its own history and visible composer. Both remain available in parallel with independent scrolling. Use the existing typography, theme variables, border radius, spacing and button hierarchy. Do not import prototype components or add a new design system. The existing manual form is visible immediately. Assistant recommendations are attached to the reply that produced them, using compact Canvas-style option rows and one expanded card. Manual result cards attach exact option context to the composer without replacing its draft or automatically sending.

Mobile: open Browse stays/flights by default, with the corresponding topic chat one tap away. Keep both mounted and preserve search state and unsent chat drafts when toggling. Announce result counts without forcing a pane switch. Shared context expands inline. Topic tabs and Back remain reachable at narrow widths and zoom. At most three compared options are shown as stacked cards on narrow screens.

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

Planning outline: `artifacts/testing/2026-10-25-focused-travel-planning/plan/workspace-outline.html`. Inspected planning screenshots: artifacts/testing/2026-10-25-focused-travel/plan/workspace-desktop.png and workspace-mobile.png. Actual implementation evidence is in the adjacent implementation directory.

User correction2026-10-26: rejected conversation-first hierarchy and hidden manual search. This contract now reflects manual browsing with parallel independent sidechat. See quick261026-b8g and artifacts/testing/2026-10-26-parallel-travel.


User correction 2026-10-26 (quick 261026-c0h): travel uses Canvas's full-height right chat dock, shared ChatHeader/ChatComposer controls, collapse arrow and 56px reopen rail. Compact global travel navigation; no duplicate page title or helper toolbar above the panes. Saved trip context lives in a collapsible chat section; manual browse readiness remains with results. Mobile uses fixed browse/chat tabs and independently scrolling content with a visible composer. Starter prompts prepare editable drafts; result cards say “Ask about this stay/flight”. Separate histories and manual search remain mounted when switching views. Booking.com inspiration is contextual property questions alongside structured browsing, not a claim of feature parity. Evidence: artifacts/testing/2026-10-26-canvas-travel-chat/.


User correction2026-10-26 (quick261026-d92): recommendation, shortlist and preferred-option cards belong inside the topic chat history, with a suggestions shortcut, text filtering, comparison and editable fresh-search questions. Manual browsing contains provider search/results only. Manual stays expose the same catalog-backed hotel types, amenities, strict/all vs any matching and refundable-only search as the specialist. Catalog IDs are resolved from the provider, never inferred from property names. Property amenities do not guarantee room amenities. Imported agent search criteria preserve these filters. Implementation browser acceptance remains pending example-account sign-in recovery; see quick summary/evidence.


User approval 2026-10-26, implemented 2026-10-27 (quick261026-ksg): supersedes the separate suggestions shortcut/filter and generated discussion drafts above. Suggestions belong to their original assistant reply and restore with it. Discuss attaches a removable exact search/option/room context chip; it preserves typed text and makes no model call. Compare selected (2–3) submits structured references directly. View all results explicitly imports that search and provider filters into manual browsing; ordinary chat results never overwrite current manual work. Manual property/room/return-flight results provide the same discussion and comparison handoff. Choosing an exact manual room or return flight creates a host-authored review with no model call, then uses the same explicit CRUD confirmation as chat. Old observations remain historical; new acceptance expires after ten minutes. Research references are ephemeral and owner/Plan scoped; restart or eviction requires a fresh search. Shared themes and selected activities continue to come from the saved compact trip brief. Browser sign-in recovered; authenticated desktop/mobile stay/flight journeys and two live specialist turns passed. Evidence: artifacts/testing/2026-10-27-connected-travel/. Full Phase18 quality matrix and user UAT remain open.
