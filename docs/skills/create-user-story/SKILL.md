---
name: create-user-story
description: Create or refine a repository user story from product context through a focused grilling session, purposeful diagram selection, and human review between diagram iterations. Use for planning user stories, acceptance criteria, and supporting documentation; do not use for implementing product code.
---

# Create User Story

Create a coherent, decision-backed user-story package that fits the product context already recorded in the repository.

## Start with context, then grill

Before creating or changing artifacts:

1. Read the product overview, glossary, relevant architecture decisions, planning documents, and related user stories.
2. Identify confirmed decisions, explicit exclusions, unresolved questions, and contradictions. Treat the newest explicit user decision as authoritative; flag conflicts rather than silently blending them.
3. Run a focused grilling session before drafting. Ask only questions that existing context cannot answer, one decision at a time. Do not re-ask a question already answered in the repository or current conversation.
4. Summarize the accepted decisions and remaining unknowns before proposing artifacts.

Keep questions product-facing. Explain technical consequences only when they affect a product or security decision.

## Build the story package

Put the story in `docs/user-stories/<story-slug>/`. Keep the story README as the source of truth for:

- User story and success outcome.
- Happy-path flow.
- In-scope and out-of-scope behavior.
- Acceptance criteria or clear testable outcomes when the story is ready for implementation.
- A decision table with the decision and its rationale.
- Links to every supporting diagram and related artifact.

Use the repository glossary consistently. Record new confirmed decisions beside the affected story, not only in a generic planning index.

Add a small Mermaid decision-relationship graph only when several decisions depend on one another. Do not add a graph merely for decoration.

## Future knowledge base

The repository is expected to grow a graph-based knowledge base under `docs/`, with user stories and their decisions as linked nodes. When that structure is introduced:

- Store each decision with the affected user story and connect it to related stories, architecture decisions, and planning artifacts.
- Maintain one dedicated navigator file that links the knowledge-base entry points and source documents without duplicating their content.
- Keep links stable and update the navigator when a new story or decision becomes part of the graph.

Do not create, move, or delete the knowledge-base structure until the user explicitly asks. In particular, preserve `docs/overview.md` as-is until the user explicitly replaces or retires it.

## Choose diagrams deliberately

Decide which diagram types materially clarify the story; user stories differ, so do not apply a fixed diagram set.

Use:

- A use-case diagram for actors, system boundary, and user goals.
- A sequence diagram for ordered browser, service, API, or provider interactions.
- A state diagram for lifecycle, expiry, recovery, and conditional-state behavior.
- A flowchart or decision diagram for branching user journeys.
- An ER/data-ownership diagram only when persisted ownership or relationships are central.
- A component or context diagram only when service boundaries matter to the story.

Skip diagrams that do not add clarity. Prefer native `.drawio` files for repository diagrams and use the configured draw.io workflow to render and inspect them.

## Keep a human in the loop

Never create or substantially revise multiple diagrams in one batch.

For each diagram:

1. State the diagram type, purpose, and the decisions it will represent.
2. Get the user's approval before creating or materially redesigning it.
3. Create or revise only that diagram.
4. Render and inspect the result.
5. Report what it captures and ask the user to approve it, revise it, or proceed to the next diagram.

Do not infer approval for another diagram from approval of the previous one.

## Quality bar

Keep terminology, narrative, diagrams, and decision records aligned. Surface important edge cases, authorization boundaries, external dependencies, recovery behavior, and security expectations when they belong to the story.

Preserve product scope: do not turn assumptions into requirements, invent integrations, or change behavior beyond confirmed decisions. Do not commit, push, or alter unrelated files unless the user explicitly asks.
