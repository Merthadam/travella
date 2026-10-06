# Phase 15 — Bounded agentic canvas generation

Date: 2026-10-06. Authority: current conversation and inspected code. Historical roadmap plans do not expand this scope.

## Locked decisions

- D-01: Keep the seven approved component designs and consistent canvas structure. User approved the studio including Booked / Not booked flight and stay states. No new prototype alternatives.
- D-02: Start with Themes & preferences. Summarize the available trip context into interests, pace, priorities, must-dos and avoidances.
- D-03: Trip essentials map dates, travelers and budget directly from current state; flexible dates/no fixed budget stay resolved; missing values remain unset. No LLM for mapping.
- D-04: Map starts centered and zoomed to the chosen destination using provider coordinates/viewport; preserve differently colored category pins. No LLM for coordinates or default zoom.
- D-05: Flights and Accommodation are compact state-mapped entry containers with separate browsing views and two booking states. Provider integration is still deferred; never infer Booked from a redirect or generation.
- D-06: Claude Agent SDK workers run under the existing Plan-scoped LangGraph/AgentCore architecture. LangGraph owns orchestration and state boundaries.
- D-07: Themes worker is tool-free; findings and useful websites share an evidence-oriented SDK worker. Research can fill missing/stale evidence with a small targeted search/read budget; reuse sufficient recent evidence first.
- D-08: Every model-generated component group gets code validation, one model review and at most one revision. Stop after that. No model review for deterministic state mappings.
- D-09: Return typed data for allowlisted A2UI components through AG-UI. No generated executable UI or model-defined layouts.
- D-10: Low reasoning effort, compact useful output, explicit aggregate time/cost/tool limits. No RAG/vector database for this phase.
- D-11: Produce an editable draft; an explicit Save plan action commits the exact reviewed version. User selected this over preview-only on 2026-10-06.
- D-12: Plan now, do not execute the implementation plans during this turn. No tests or paid model calls during planning.

## Implementation choices proposed by the planner

- Generate plan opens the approved canvas with per-component loading states; return to chat preserves it within the session.
- Require a final destination for full generation. Themes-only generation can work earlier.
- Lock edits while the corresponding generation is running; Stop preserves completed draft components. Never replace a user-edited component silently.
- Save commits one consistent full snapshot through CRUD. Unsaved drafts remain session-local; leaving with edits warns. Reopening restores the last saved snapshot.
- Keep chat usable after canvas generation. No parallel mutation of the same Plan.
- Input preparation must cover historical traveler preferences beyond the current last-12-message window, with explicit bounded-history coverage rather than a claim of unlimited memory.
- Reuse existing model/secret setup. Initial numeric budgets are configurable engineering defaults documented in AI-SPEC, not measured performance promises.

## Deferred

LiteAPI search and supplier booking verification; native SDK parent-to-subagent delegation; a new graph framework; AgentCore infrastructure migration; long-term memory writes; RAG; full itinerary scheduling; drag/drop canvas layout; automatic saved-Plan mutation; cross-device unsaved-draft recovery.
