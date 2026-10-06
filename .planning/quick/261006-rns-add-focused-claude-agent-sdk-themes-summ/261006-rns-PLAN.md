# First canvas generation node: Themes & preferences

## Agreed scope
Keep the approved component layout. Start with a dedicated LangGraph node invoking a focused Claude Agent SDK worker to summarize available trip context into the Themes & preferences contract. No RAG or web research. This is a proposed draft, not a durable Plan mutation.

## Tasks
1. Add strict summary/result contracts and a bounded, tool-free SDK worker with its own prompt, short deadline and budget ceiling. Match existing theme/pace/priority/must_do/avoid fields. Ground each item in a supplied source; current traveler corrections override earlier statements and advisory profile details.
2. Register canvas_generation in the existing graph, explicitly selected by generate_themes action. Expose draft through authenticated turn/AgentCore transport and final state events, preserving cancellation and event reservation. Bypass conversational routing and the research loop.
3. Document invocation, source precedence, limits and next integration boundary. Run static compile/lint checks only; no tests or paid model runs unless requested. Keep the component studio and production UI unchanged.

## Acceptance
Explicit action runs one SDK worker and returns validated TripThemes-compatible draft data. Conversation requests retain existing routing. Invalid or timed-out generation returns a sanitized error and no partial draft. SDK never receives identity/credentials in the prompt. No durable canvas save or frontend generation button in this initial worker slice.
