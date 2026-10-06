# Phase 14: Standalone A2UI Planning Components

Captured: 2026-10-06. Latest scope correction is authoritative: “first just lets design non connected a2ui components that will be able to be generated.” This task writes the plan; implementation follows separately.

<decisions>
### Agreed scope
- **D-01:** Design reusable declarative A2UI components for a modern, consistently structured planning canvas.
- **D-02:** Components are standalone and use sample data. No live agent generation, shared state, persistence or backend wiring in this phase.
- **D-03:** Flights and Accommodation are small containers opening separate preview browsing views; keep full result galleries off the canvas.
- **D-04:** LiteAPI will supply both search modes later. No LiteAPI integration now.
- **D-05:** Trip essentials are separate from themes/preferences, pace, priorities and useful facts.
- **D-06:** Destination gets its own generatable Google Maps component. This phase designs its component interface and fixture-backed visual states; the live provider adapter is deferred.
- **D-07:** Include useful websites and important links as a component.
- **D-08:** Reuse the installed A2UI renderer/catalog pattern; define schemas so an agent can generate these components later. No framework migration.
- **D-09:** Focus on components and their consistent composition. Keep production chat layout and Plan navigation unchanged.
- **D-10:** Map supports multiple categorized, differently colored pins, adding places and inspecting them. Design with local sample pins first.
- **D-11:** Initial composition is acceptable but too bland; strengthen visual hierarchy and category accents while keeping the structure consistent.
</decisions>

## Deliverable
A local development gallery displaying seven registered component types from validated A2UI fixture messages. Include isolated component inspection and one composed canvas preview, with simulated create/update/hide, editing and navigation. Visible label: “Component preview · sample data · changes are not saved.” Reset restores fixtures. No real account data is needed or read by the gallery.

## Design inventory
TripEssentials; DestinationMap; TripThemes; FlightsEntry; AccommodationEntry; ResearchFindings; ImportantLinks. Modern light cards, restrained green accents, consistent spacing and typography. The existing compact container pattern is accepted. No A/B/C selection was made for the complete canvas; composition remains a proposal for review.

## Not this phase
Agent prompts/model calls; LangGraph/AgentCore changes; AG-UI subscriptions; CRUD/database migrations; resumable shared state; production Plan routes; live Maps/Places or LiteAPI calls; booking or handoff; memory changes; arbitrary agent code; drag/drop infinite canvas.

## Carry-forward, not implementation requirements
The later integration phase must reconcile current state ownership and traveler-confirmed durable Plan choices. The props/event contract keeps that possible without implementing those systems now. The earlier live-generation plan draft has been superseded by this scope correction.

## Visual reference
Existing compact-card previews: artifacts/testing/2026-10-05-planning-cards/plan/. Combined planning sketch: artifacts/testing/2026-10-06-dynamic-canvas-plan/plan/canvas-layout.html. This is a review sketch, not a claimed final user-approved design. Keep existing throwaway prototype code off main; future execution should carry only these planning artifacts onto the integration branch.

## Execution refinement
User requested a separate design-system folder for approval. Implementation lives under frontend/src/design-system/ with components, a2ui and preview directories. Production app imports remain unchanged.
