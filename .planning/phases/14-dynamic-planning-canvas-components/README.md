# Standalone A2UI planning components

**Implemented; ready for your design review.** Open http://localhost:5177/. Latest scope: design reusable components with sample data, ready for future agent generation.

## Components
1. Trip Essentials — dates, travelers, budget.
2. Destination Map — places and colored category pins; local add/edit/remove/filter/details.
3. Trip Themes — interests, pace, priorities, must-dos and things to avoid.
4. Flights — compact entry into a separate preview view.
5. Accommodation — same compact entry pattern.
6. Research Findings — concise facts with source/uncertainty presentation.
7. Important Links — useful websites, domains and purpose.

## Implementation order
| Wave | Plan | Outcome |
|---|---|---|
| 1 | [14-01](14-01-PLAN.md) | A2UI fixture gallery and Essentials |
| 2 | [14-02](14-02-PLAN.md) | Map/pins and Themes |
| 2 | [14-03](14-03-PLAN.md) | Travel entries, Findings and Links |
| 3 | [14-04](14-04-PLAN.md) | Compose, refine and inspect the full catalog |

[Component contracts](14-COMPONENT-CONTRACT.md) · [UI design](14-UI-SPEC.md) · [Decisions](14-CONTEXT.md) · [Plan review](14-PLAN-REVIEW.md)

The local gallery simulates A2UI creation and updates. Live agent, AG-UI, persistence, Google Maps/Places and LiteAPI connections are deferred. The component gallery is now implemented, with manual browser evidence in artifacts/testing/2026-10-06-planning-components/. Final design approval remains pending.
