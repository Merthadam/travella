# Phase 10: Evidence-grounded iterative agent research - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in 10-CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-10-04  
**Phase:** 10-evidence-grounded-iterative-agent-research  
**Areas discussed:** Phase scope, research breadth, source reading, evidence limits, conflicts, search triggers, evidence reuse, freshness, source quality, destination results

---

## Phase scope

| Option | Description | Selected |
|--------|-------------|----------|
| Fold into Phase 3B | Revise the remaining work in the existing agentic-conversation phase. | |
| Create a new phase | Add a separate phase for the new evidence-grounded research loop. | ✓ |

**User's choice:** Create a new phase.  
**Notes:** The user said past plans do not matter for this work. Existing code and service contracts remain implementation context; user decisions in this phase govern scope.

## Research breadth

| Option | Description | Selected |
|--------|-------------|----------|
| Any country or place topic | Research factual questions about countries and places, with destination discovery as one use. | ✓ |
| Explain current destination shortlist | Limit research responses to the existing candidate shortlist. | |

**User's choice:** Any country or place topic.

## Source reading

| Option | Description | Selected |
|--------|-------------|----------|
| Read relevant page content; flag unavailable pages | Retrieve and inspect relevant linked-page content. Clearly mark pages the agent cannot read. | ✓ |
| Use search snippets when a page cannot be read | Fall back to the search result snippet as evidence. | |

**User's choice:** Read relevant page content; flag unavailable pages.

## Evidence limit

| Option | Description | Selected |
|--------|-------------|----------|
| Give the supported answer and state what remains uncertain | Answer partially from evidence and identify unresolved gaps when the bounded research loop ends. | ✓ |
| Stop and ask before answering | Withhold an answer until the user decides whether to continue. | |
| Answer from general knowledge for the gaps | Use model knowledge to fill evidence gaps. | |

**User's choice:** Give the supported answer and state what remains uncertain.

## Conflicting facts

| Option | Description | Selected |
|--------|-------------|----------|
| Explain disagreement and cite both sources | Preserve and explain material source conflicts. | ✓ |
| Prefer the most authoritative source and note the conflict | Select one claim while acknowledging disagreement. | |

**User's choice:** Explain the disagreement and cite both sources.

## When to search

| Option | Description | Selected |
|--------|-------------|----------|
| Research factual place questions; reuse sufficient recent evidence | Search for new factual topics and reuse relevant evidence that is still fresh. | ✓ |
| Search every place-related message | Search even for conversational follow-ups and non-factual discussion. | |

**User's choice:** Research factual place questions; reuse sufficient recent evidence.

## Evidence reuse

| Option | Description | Selected |
|--------|-------------|----------|
| Across resumed Plan chat while evidence is recent | Keep usable research evidence available when reopening/resuming a Plan conversation. | ✓ |
| Current open conversation only | Do not reuse evidence after the current chat is closed. | |

**User's choice:** Across resumed Plan chat while evidence is recent.

## Freshness rules

| Option | Description | Selected |
|--------|-------------|----------|
| Refresh time-sensitive facts; reuse stable facts | Refresh facts likely to change; reuse recent evidence for stable facts. | ✓ |
| Use one age limit for all evidence | Apply the same evidence age threshold to every fact type. | |

**User's choice:** Refresh time-sensitive facts; reuse stable facts.

## Source quality

| Option | Description | Selected |
|--------|-------------|----------|
| Official sources for rules; reputable sources for travel advice | Prefer authoritative sources for rules and reliable editorial sources for advice. | ✓ |
| Use the best relevant sources without source-type rules | Leave source selection entirely to general relevance/ranking. | |

**User's choice:** Official sources for rules; reputable sources for travel advice.

## Destination results

| Option | Description | Selected |
|--------|-------------|----------|
| Keep candidates and add an explanation | Preserve structured destination candidates and include Claude's source-grounded explanation. | ✓ |
| Return only the chat answer | Replace the candidate results with prose alone. | |

**User's choice:** Keep candidates and add an explanation.

## the agent's Discretion

- Exact per-turn research pass cap, query-refinement strategy, content extraction method, evidence freshness representation, and short-term cache/checkpoint implementation.
- Whether an Anthropic skill artifact is useful and supported; retrieval is done by explicit tools.

## Deferred Ideas

- Personal-memory RAG and vector search.
- New research UI or context drawer.
- Autonomous Plan changes or booking.
