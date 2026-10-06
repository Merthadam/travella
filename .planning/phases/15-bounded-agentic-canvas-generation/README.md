# Phase 15 — Canvas generation plan

Status: planned; implementation has not begun for this phase. The earlier single-call themes worker exists and has static checks only.

## Agreed flow

Generate plan → snapshot current trip context → map known state → generate themes → code validation → one Claude review → optional one revision → publish approved component data. Findings + useful websites use the same bounded pattern with restricted research. Edit the draft → explicitly Save plan → restore that saved version on reopening.

## Execution order

| Plan | Delivers |
|---|---|
| [15-01](15-01-PLAN.md) | Themes generation end to end, earlier context coverage, bounded review and editable approved component. |
| [15-02](15-02-PLAN.md) | State-mapped essentials/travel cards and destination-centered Google Map. |
| [15-03](15-03-PLAN.md) | Evidence-based findings and links, incremental component delivery and shared budgets. |
| [15-04](15-04-PLAN.md) | Explicit atomic Save plan, conflict handling and saved-canvas recovery. |
| [15-05](15-05-PLAN.md) | Manual connected-flow verification and measured model limits when requested. |

Five sequential waves keep the first working slice small. No new design alternatives, RAG, LiteAPI search or booking integration.

## Contracts

- [Decisions](15-CONTEXT.md)
- [SDK, prompts, loop and cost contract](15-AI-SPEC.md)
- [Approved design and new interaction behavior](15-UI-SPEC.md)
- [Current-code research](15-RESEARCH.md)
- [Verification plan](15-VALIDATION.md)
- [Plan review](15-PLAN-REVIEW.md)

Proposed engineering defaults remain adjustable: low effort; themes $0.10 / 45s aggregate; findings+links $0.25 / 90s aggregate; whole run $0.35 / 120s; never more than one review and one revision per worker group. These are configured ceilings, not measured prices or response times.
