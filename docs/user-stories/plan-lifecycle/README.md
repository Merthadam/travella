# US-004 — Create, resume, and recover Plans

## User story

As a traveler, I can create, find, resume, delete, and restore my Draft Plans, so I can explore several holiday ideas over time without losing the planning context that matters to me.

## Success outcome

After signing in, the traveler reaches **My plans**: a private list of their active Draft Plans. They can start a new conversation-backed Plan, return to a prior Plan in the view they last used, and safely remove a Plan with a seven-day opportunity to restore it.

The MVP has no finalized or completed Plan state. Active Plans remain Draft Plans until the traveler deletes them. A later finalization experience may introduce a different lifecycle, but it is outside this story.

## Confirmed interaction model

- A traveler may have multiple active Draft Plans at once. Each Plan is separate, centered on one destination/city once chosen, and has one linked Conversation.
- **New plan** immediately creates an empty Draft Plan and opens its linked Conversation. The traveler can begin with an open-ended intent or a known destination, as defined in [US-002](../agentic-plan-research/README.md).
- Travella supplies a context-aware automatic title while the traveler has not chosen one, for example from an initial intent and then a chosen destination. The traveler may edit the title at any time. A traveler-entered title is authoritative and is not silently replaced by the automatic title.
- **My plans** shows active Draft Plans ordered by most recent activity. This is a presentation default, not a separate Plan state.
- Opening an active Plan resumes the last working view the traveler used: its Conversation or Planning Canvas. If that view is unavailable, Travella opens the Conversation as the safe fallback.
- Deleting a Draft Plan removes it from the normal My plans list immediately and moves it to **Recently deleted**. The traveler can restore it during the seven-day Recovery Period.
- Restoring a Plan returns its latest consistent saved state, including its title, linked Conversation, planning brief, selected options, Map Pins, and last working view. It returns to My plans as an active Draft Plan.
- At the end of the Recovery Period, Travella permanently removes identifiable Plan data. Expired Plans can no longer be restored.
- The traveler can access only their own active or deleted Plans. A browser-supplied traveler or Plan identifier never grants access.

## Happy-path flow

1. After successful authentication, Travella opens My plans.
2. The traveler sees their active Draft Plans, most recently active first, or an empty state when none exist.
3. The traveler chooses **New plan**.
4. Travella creates an empty Draft Plan with a linked Conversation and opens the Conversation.
5. As the traveler supplies an intent or destination, Travella maintains an automatic title unless the traveler has edited it.
6. The traveler can return to My plans and open any active Draft Plan; Travella restores its most recently used view.
7. The traveler deletes a Draft Plan. Travella removes it from My plans and shows it in Recently deleted with its restoration deadline.
8. Before the deadline, the traveler restores the Plan. Travella returns the latest consistent saved state to My plans.

## In scope

- My plans as the post-authentication home for active Draft Plans.
- Multiple active Draft Plans per traveler.
- Creating an empty Draft Plan and its linked Conversation.
- Automatic, context-aware Plan titles and traveler-edited titles.
- Finding and reopening active Plans in last-used view.
- Deleting, listing in Recently deleted, restoring, and expiry after the seven-day Recovery Period.
- Private server-side authorization for all Plan lifecycle actions.
- Consistent recovery of durable Plan state after refresh, reconnect, or restoration.

## Out of scope

- Finalizing, completing, sharing, collaborating on, duplicating, or archiving a Plan.
- Multi-destination Plans, route planning, and day/time itinerary assignment.
- Editing the contents of a Conversation, planning brief, Selected Option, or Map Pin beyond the flows in US-002 and US-003.
- Password recovery, profile editing, and other account-management features.
- Exact My plans and Recently deleted wireframes, database design, API schemas, and infrastructure choices.

## Acceptance criteria

1. After authentication, a traveler lands on My plans and can see only their own active Draft Plans.
2. A traveler can keep multiple active Draft Plans at the same time.
3. Selecting New plan creates an empty Draft Plan and one linked Conversation, then opens that Conversation.
4. An automatic title can reflect available intent or destination context while no traveler-entered title exists.
5. A traveler can edit a Plan title, and later automatic-title updates never overwrite that edit.
6. Active Draft Plans appear in My plans in most-recently-active order.
7. Opening an active Plan returns the traveler to its last used Conversation or Planning Canvas view; if that view cannot be restored, Travella opens the Conversation.
8. Deleting a Draft Plan removes it from the active list immediately and makes it available in Recently deleted for seven days.
9. Recently deleted shows the remaining restoration period for each deleted Plan.
10. Restoring a deleted Plan during its Recovery Period returns its latest consistent saved state to My plans as an active Draft Plan.
11. After seven days, the deleted Plan's identifiable data is permanently removed and the Plan cannot be restored.
12. Deleting, restoring, opening, renaming, or listing a Plan is authorized server-side against the authenticated traveler; another traveler cannot access or mutate it.
13. Repeating a create, delete, restore, or title-update request does not create duplicate Plans or contradict the latest lifecycle state.
14. The MVP offers no finalized or completed Plan state.

## Decisions

| Area | Decision | Rationale |
| --- | --- | --- |
| Plan count | A traveler may hold multiple active Draft Plans. | Holiday research is exploratory and benefits from separate, chat-like planning contexts. |
| Creation | New plan creates an empty Draft Plan and opens its Conversation immediately. | The traveler can begin planning without first completing a form. |
| Title | Travella supplies an automatic title; the traveler can edit it, and their edit is authoritative. | Plans remain recognizable with little effort while retaining traveler control. |
| Resume view | Reopen the last used Conversation or Planning Canvas view. | Returning feels continuous and preserves the traveler's working context. |
| Active list | My plans is ordered by most recent activity. | The likely next Plan is easy to find without introducing lifecycle complexity. |
| Deletion | Delete moves a Draft Plan out of My plans into Recently deleted immediately. | The active list stays clear while the traveler retains a recoverable safety net. |
| Recovery | A deleted Plan can be restored for seven days, then identifiable Plan data is removed. | Provides meaningful protection against accidental deletion while limiting retained private data. |
| Completion | No finalized/complete Plan state exists in the MVP. | It keeps the first lifecycle focused; a future finalized-plan design can be introduced intentionally. |

## Initial state and event contract

### Authoritative state

- The CRUD backend is the sole durable-data owner for active and deleted Plans, title provenance (automatic or traveler-edited), linked Conversation identity, recovery deadline, and last-used view.
- A Plan remains scoped to the authenticated traveler throughout its active and deleted states.
- The latest consistent durable snapshot is authoritative for restoration and reconnect. In-progress research and other temporary outputs are governed by US-002 and are not made durable merely by opening or restoring a Plan.

### Browser projection and traveler actions

- The browser may receive an authorized projection of the traveler's active Plans, Recently deleted entries, titles, timestamps, recovery deadline, and resumable view.
- Traveler actions are `create_plan`, `open_plan`, `rename_plan`, `delete_plan`, and `restore_plan`.
- The browser may request an action but cannot choose the traveler identity or establish authorization through a Plan identifier.
- Lifecycle actions use idempotency handling so retrying an action after an interrupted connection cannot duplicate a Plan or revert a newer state.

### Recovery expectations

- A refresh or reconnect restores the latest consistent active Plan list and, when resuming a Plan, its latest consistent saved state and last-used view.
- A restored Plan is not recreated from scratch: it preserves the durable planning context permitted by its related stories.
- Once the Recovery Period expires, the Plan is no longer exposed through Recently deleted and cannot be recovered.

## Related artifacts

- [Travella overview](../../overview.md)
- [Domain glossary](../../../CONTEXT.md)
- [Architecture foundations](../../planning/architecture-foundations.md)
- [Service-boundary ADR](../../adr/0001-separate-agent-data-and-connector-services.md)
- [US-001 — Access a private Travella account](../login/README.md)
- [US-002 — Research and shape a plan through conversation](../agentic-plan-research/README.md)
- [US-003 — Select options and maintain the planning canvas](../option-selection-and-canvas/README.md)

## Open implementation decisions

- Exact My plans, empty-state, rename, deletion-confirmation, and Recently deleted wireframes.
- Whether search, filtering, pagination, or additional organization is needed when a traveler has many Plans.
- Exact title-generation rules and how title changes are surfaced in the UI.
- Data model, deletion job/retry mechanics, and exact retention/de-identification implementation.
- API/event schemas, idempotency-key lifetime, and recovery-deadline representation.
