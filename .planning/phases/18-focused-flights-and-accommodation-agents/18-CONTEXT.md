# Phase 18: Focused Flights and Accommodation Agents

Captured 2026-10-25; updated 2026-10-27 after the user requested completion of planning for the shared search workspace. Earlier implementation and evidence remain historical. The new workspace correction is planning only, with no auto-execution.

## Current decision authority — 2026-10-27

The user explicitly approved the frontend/manual search area as the primary experience, with a separate Canvas-consistent side chat operating on the same search. This supersedes quick261026-ksg's reply-attached option browser and explicit “View all results” import workflow. Preserve completed plans 18-01 through 18-05 and their historical evidence; add follow-up plans. The specialist architecture, trip context, explicit preferred choice and bounded research decisions below remain in force.

Current contract: `18-WORKSPACE-SPEC.md`. The user chose discussion without prototypes earlier in this session; retain that choice. A single rendered planning sketch records the agreed direction, not a new alternatives-selection exercise.

<decisions>
- **D18-01:** Flights and Stays remain substages of one trip, with independent persistent topic histories and compact saved trip context.
- **D18-02:** The main frontend owns one shared search/results view per topic. Manual search, filters, details, comparison and choosing must all work with chat closed.
- **D18-03:** The specialist can search, refine, sort and dismiss temporary results within the agreed budget; validated results update the same main view automatically. No separate import action or duplicate full results browser in chat.
- **D18-04:** Manual input wins over in-flight agent actions. Dismiss is reversible and does not delete saved choices. Agent actions never silently relax hard requirements or mutate saved trip facts.
- **D18-05:** Compare two or three exact options in the main workspace and discuss their evidence in side chat. Typing, pane toggles and selection do not send messages; explicit Compare may send structured context while preserving the composer's draft.
- **D18-06:** The result list has Details, Compare and Dismiss controls. Choose for trip lives in details/comparison and uses exact confirmation of the actual room/return fare; choosing marks ready and remains unbooked.
- **D18-07:** Flight cards show the real airline logo/name where reliably identified, both carriers for mixed flights, and a neutral airplane fallback. Provider/source identity remains distinct from carrier identity.
- **D18-08:** Cards expose total-price scope, source, observation time, sandbox/expiry/unknown states; source links exist only when verified and available.
- **D18-09:** Match the existing Canvas sidechat, keep browsing primary on mobile, preserve unsent drafts and user focus, and offer Stop/Undo without exposing internal tool machinery.
- **D18-10:** Finish planning now. No production implementation, deployment, booking expansion or acceptance claim follows automatically.
</decisions>

## Agreed experience

The user clarified that Flights and Accommodation are **substages within the existing trip workflow**. They are entered from the trip Canvas and remain attached to that trip. Phase 18 is only the development roadmap identifier; its five plans are implementation steps, not five traveler-facing stages. Neither substage forces completion of the other, and reopening one resumes its own discussion.

The user approved a dedicated Flights agent and a dedicated Accommodation agent, each with its own conversation and narrowly relevant tools. Each works toward the best fit for this trip, using its theme, confirmed requirements, selected activities and existing selected travel options. The user previously chose discussion without interactive prototypes; retain that choice.

One trip has three conversation scopes: the existing Trip conversation, Flights, and Stays. Specialist conversations share a compact trip brief, not the other conversations' transcripts. Their own preferences, comparisons, rejections and follow-up questions remain in their own discussion. Confirmed changes refresh the shared brief. Exploratory suggestions do not silently alter dates, requirements, activities or selections.

The four initial inspection tools are already implemented in `caf905b`. This phase makes those tools part of focused multi-turn journeys. It does not rebuild the provider integration or launch a new deployed agent service.

## Implementation defaults derived from the agreed experience

- Extend the existing Flights/Stays screens with their own chat, comparison results and a small expandable “Using your trip” summary. Retain the general side chat on the Canvas. A new OS/browser window is unnecessary; the user never selected one.
- Reuse Claude Agent SDK as a bounded worker inside the existing Agent service and Plan-scoped LangGraph. CRUD owns conversation history, research notes and accepted decisions. Retain disposable SDK invocations; application history supplies continuity.
- Use `trip`, `flights`, `stays` as server-validated topics; map the existing UI `accommodation` mode to `stays` at one boundary. Keep existing Trip callers compatible.
- Initially permit one active agent turn per Plan. Switching topics stops the current stream and waits for cancellation/commit resolution before sending another. Browsing results may continue. Independent histories do not require concurrent background agents.
- Shared context comes from the latest persisted trip and Canvas. Unfinished local edits are shown as pending and excluded until saved. Selected activities are included as a bounded, relevant subset with an omitted count, not the entire destination research.
- A shortlist is research; an explicitly confirmed preferred option becomes a saved research choice, always labeled unbooked. Cross-topic sharing includes that accepted summary, never raw supplier payloads or expiring checkout handles.
- Use existing exact-confirmation/revision patterns for shared changes. Specialist suggestions can open the existing trip-detail editor; conversation alone does not confirm a shared change.

These defaults are planning decisions, not additional claims about what the user explicitly selected. Keep them reviewable in the plans.

## Boundaries

One destination, return flights, curated private MCP tools, capability gating, bounded searches and honest freshness remain. Property/room claims must be supported by provider evidence. “Best” means best among the checked options for the stated priorities, not a guarantee of exhaustive inventory. Apartment availability depends on supplier coverage.

This phase does not add production booking/payment, autonomous reservation, flexible-date matrix, native SDK session storage, a multi-provider marketplace, or a replacement Plan graph. Existing explicit sandbox checkout stays separate and receives no specialist tool access. Supplier handoff is not expanded where exact-offer compatibility is unverified.

## Dependencies and evidence

- Existing Canvas/TravelSearch, CRUD lifecycle, Plan run lease and SDK runtime at `d0e3bbe`.
- [Provider/SDK research](../../../../docs/research/liteapi-agent-workspaces-2026-10-25.md).
- Prior phase acceptance gaps remain open; planning Phase 18 does not mark Phase 17 complete.
- Chrome DevTools `list_pages` failed on 2026-10-25 because `/Users/adammerth/.cache/chrome-devtools-mcp/chrome-profile` is already running. Required screenshot evidence is pending. See `artifacts/testing/2026-10-25-focused-travel-planning/verification.md`.

## Confirmed research and readiness decisions

The user answered both clarification questions:

- Each specialist may research and refine independently within a bounded budget after enough preferences are known. Ask when a missing preference or material tradeoff needs traveler judgment. Do not ask before every read-only inspection.
- The traveler explicitly chooses a preferred research option to mark that substage ready. Ready remains editable and unbooked. Removing the preferred choice returns it to research; relevant shared changes mark the retained choice as needing review rather than silently discarding it.

Implementation budget: at most ten provider calls per turn, up to three rate searches and up to six inspections within that total, plus existing bounded location/catalog lookup. Stop when the budget/deadline is reached and summarize useful evidence. A specialist may refine ranking or search within stated constraints; relaxing a hard requirement, changing shared dates/party, or accepting a tradeoff remains a traveler decision. Preserve the general Trip agent's current one-search-per-mode policy; the specialist path has its own explicitly bounded policy.
