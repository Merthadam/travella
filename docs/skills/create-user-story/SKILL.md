---
name: create-user-story
description: Create or refine a repository user story through focused decision discovery, iterative documentation, purposeful diagram selection, and human review. Use for planning user stories, acceptance criteria, and supporting documentation; do not use for implementing product code.
---

# Create User Story

Create a coherent, decision-backed user-story package that fits the product context already recorded in the repository.

## Start with context, then guide decisions

Before creating or changing artifacts:

1. Read the product overview, glossary, relevant architecture decisions, planning documents, and related user stories.
2. Identify confirmed decisions, explicit exclusions, unresolved questions, and contradictions. Treat the newest explicit user decision as authoritative; flag conflicts rather than silently blending them.
3. Keep a working decision ledger while reading and talking: confirmed choice, affected behavior, source, and any superseded choice. The newest explicit user decision is authoritative.
4. Run a focused decision conversation before substantial drafting. Ask one question at a time, but only when it affects the traveler outcome, scope, trust, recovery, or an implementation boundary the user wants to decide. Do not re-ask a question already answered in the repository or current conversation.
5. Group related decisions into a short arc, such as candidate lifecycle, confirmation, or recovery. After a natural boundary—or sooner when the user says the questions are repetitive—stop questioning, summarize the accepted set, update the story source of truth, and move to the next unresolved area.
6. Do not turn every implementation detail into a question. Make clearly reversible, low-risk defaults when they preserve the user's intent; mark genuinely open choices instead of inventing them.
7. When the user corrects or qualifies an earlier answer, state the revised interpretation and replace the old decision everywhere it matters before continuing.
8. Summarize the accepted decisions and remaining material unknowns before proposing a new artifact or diagram.

### Plan lifecycle stories

When the story creates, resumes, deletes, restores, or expires a user-owned record, establish the product lifecycle before drafting. Reuse existing retention and privacy decisions rather than asking again. Only resolve the following when they are not already decided and materially affect the traveler outcome:

- Whether a traveler can have one or many active records, and how a new record starts.
- How a record is identified before it has meaningful content, including automatic versus traveler-controlled naming.
- Where reopening returns the traveler and what state must survive recovery.
- What deletion changes immediately, where recoverable records appear, who may restore them, and the recovery deadline.
- Whether a distinct completed, finalized, archived, or expired state exists in the MVP.

Treat ordinary activity such as opening, renaming, and updating a record as an action that may update metadata, not a new lifecycle state unless the product says otherwise. Keep expired or permanently removed records unavailable for restoration, and make the durable-data and authorization boundaries explicit.

Keep questions product-facing and in the user's requested language level. Explain technical consequences only when they affect a product, security, or meaningful delivery decision. Do not turn the conversation into a checklist or repeatedly seek confirmation of an already implied choice.

## Build the story package

Put the story in `docs/user-stories/<story-slug>/`. Keep the story README as the source of truth for:

- User story and success outcome.
- Happy-path flow.
- In-scope and out-of-scope behavior.
- Acceptance criteria or clear testable outcomes when the story is ready for implementation.
- A decision table with the decision and its rationale.
- Links to every supporting diagram and related artifact.

Update the README at natural decision boundaries instead of holding every decision until the end. Reconcile new decisions with earlier text immediately; do not leave a story internally contradictory while continuing the interview.

For a story that is ready to plan technically, record an initial state/event contract when it materially reduces ambiguity. Keep it implementation-neutral: identify authoritative data, compact resumable context, transient/raw data, allowed browser projection, typed traveler actions, and idempotency or recovery expectations. It is not a reason to prematurely choose a database, protocol schema, or vendor.

Use the repository glossary consistently. Record new confirmed decisions beside the affected story, not only in a generic planning index.

Add a small Mermaid decision-relationship graph only when several decisions depend on one another. Do not add a graph merely for decoration.

## Future knowledge base

The repository is expected to grow a graph-based knowledge base under `docs/`, with user stories and their decisions as linked nodes. When that structure is introduced:

- Store each decision with the affected user story and connect it to related stories, architecture decisions, and planning artifacts.
- Maintain one dedicated navigator file that links the knowledge-base entry points and source documents without duplicating their content.
- Keep links stable and update the navigator when a new story or decision becomes part of the graph.

Do not create, move, or delete the knowledge-base structure until the user explicitly asks. In particular, preserve `docs/overview.md` as-is until the user explicitly replaces or retires it.

## Agentic and research flows

When a story includes an agent, research, or dynamic UI, cover these areas only when they apply to the requested flow:

- Traveler authority: what requires explicit confirmation, what may update context, and how direct traveler edits override agent inference.
- Research lifecycle: what the traveler sees while work runs, how interruption and stale work behave, and what appears after recovery.
- Recommendation lifecycle: what is transient, what compact context may survive for the current plan, what starts fresh for a new plan, and whether recommendations may refresh.
- Evidence: how a traveler can inspect support for a claim without exposing raw tool payloads or internal reasoning by default.
- UI projection: the difference between internal state, checkpointed state, and the validated fields/events the browser may receive.

Use the user's confirmed product decisions to set these rules. Do not impose a specific agent framework, model, memory product, streaming method, component library, or storage technology unless the user selected it.

## Choose diagrams deliberately

Decide which diagram types materially clarify the story; user stories differ, so do not apply a fixed diagram set. First inspect existing diagrams and written contracts. Skip a new diagram when they already make the relationship clear.

Use:

- A use-case diagram for actors, system boundary, and user goals.
- A sequence diagram for ordered browser, service, API, or provider interactions.
- A state diagram for lifecycle, expiry, recovery, and conditional-state behavior. Strongly prefer one when deletion has a recovery period, a deadline can cause permanent removal, or restoration has materially different outcomes from normal activity.
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

For a lifecycle state diagram, show the initial creation path, active state, recoverable-deletion state, restoration transition, expiry transition, and terminal state when applicable. Label ordinary activity as self-preserving metadata updates rather than inventing extra states. Include authorization or ownership as a concise note when it applies to every transition rather than repeating it on each arrow.

When the repository uses native Draw.io sources, create the `.drawio` file and render a reviewable preview when that is the existing repository convention. Validate the source XML and inspect the rendered result before reporting it. If the configured renderer is unavailable, state the limitation and use the closest local, non-destructive rendering check available; do not claim visual verification without one.

## Quality bar

Keep terminology, narrative, diagrams, state/event contracts, and decision records aligned. Before handing off, run a concise acceptance pass: turn the confirmed behavior into testable outcomes, remove duplicated or contradictory wording, and check document formatting.

Surface important edge cases, authorization boundaries, external dependencies, recovery behavior, and security expectations when they belong to the story. For agentic stories, distinguish an understandable user-facing progress state from hidden reasoning.

Preserve product scope: do not turn assumptions into requirements, invent integrations, or change behavior beyond confirmed decisions. Do not commit, push, or alter unrelated files unless the user explicitly asks.

When the user requests a commit, verify the resulting commit hash, `git status --short --branch`, and the ref that contains the commit. In a detached worktree, report that the commit is not on the primary branch; do not move that branch without explicit authorization. If a visible feature branch is appropriate and authorized, use the repository's branch naming convention and report it.
