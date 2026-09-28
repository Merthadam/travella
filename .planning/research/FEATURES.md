# Feature Landscape

**Domain:** Conversational travel research and planning
**Researched:** 2026-09-26
**Overall confidence:** MEDIUM

## Table stakes

| Feature | Why expected | Complexity | Travella treatment |
|---|---|---|---|
| Secure account and session recovery | Travel plans contain private identity and preference data | High | Cognito, verification, MFA, neutral recovery, token refresh |
| Saved plans with reliable resume | Research is rarely completed in one session | Medium | Multiple Draft Plans, last view, reconnect, seven-day recovery |
| Search by destination and travel mode | Travelers expect destinations plus stay/flight/car discovery | High | One destination/city, functional provider modes only |
| Comparable price and policy details | Price without cancellation, baggage, or terms is misleading | High | Mode-specific cards, total/estimated-total disclosure, provider identity |
| Explicit save and edit controls | Travelers need to distinguish browsing from a decision | Medium | Confirmed Selected Options, Map Pins, Brief, Requirements |
| Map/list organization | Location is central to choosing places | High | Permanent map-first Canvas with categorized list |
| Clear supplier handoff | Planning tools commonly link to providers instead of owning checkout | High | Verified server-generated same-tab redirect; booking status unknown |
| Failure, refresh, and stale-result handling | Provider APIs and travel inventory are volatile | High | Updating, Retry, recheck, no fabricated fallback |

## Differentiators

| Feature | Value proposition | Complexity | Dependency |
|---|---|---|---|
| Progressive conversational research | Reduces form fatigue while preserving user direction | High | Agent graph, evidence normalization, interrupt/resume |
| Editable Brief with active/inactive context | Keeps agent context useful without letting deleted preferences influence ranking | Medium | CRUD model plus agent checkpoint contract |
| Validated adaptive workspace | Shows only relevant empty/search-ready surfaces instead of a generic dashboard | High | Requirements snapshot, WorkspaceManifest, approved component catalog |
| Evidence-backed candidate shortlist | Makes recommendations inspectable without dumping raw research | High | Web/provider retrieval, compact evidence records, source panel |
| Explicit challenge-and-commit mutations | Makes consequential agent proposals reviewable and replay-safe | High | CRUD confirmation tokens, revisions, idempotency |
| Traveler-controlled interruption | New messages can stop obsolete work and prevent stale results | High | LangGraph interrupts, cancellation, ordered AG-UI events |
| Custom Map Pins distinct from inventory | Supports personal places without implying availability or booking | Medium | Map search and separate saved-pin model |

## Anti-features

| Anti-feature | Why avoid | Instead |
|---|---|---|
| Autonomous booking or silent Plan mutation | Creates financial and trust risk | Explicit traveler confirmation for every consequential change |
| Fake or demo inventory presented as real | Travel price/availability is time-sensitive | Hide unavailable modes and label demonstrations honestly |
| Multi-provider aggregation in the first release | Requires normalized terms and can imply false equivalence | One canonical functional provider per mode |
| Unbounded generated executable UI | Security and consistency risk | Allow-listed validated component schemas |
| Full raw research persistence | Privacy, cost, and stale-data risk | Compact candidates/evidence references only |
| Background price polling | Expensive and creates surprising mutations | Traveler-initiated refresh plus mandatory final recheck |
| In-app checkout | Expands payments, credentials, support, and transaction liability | Verified external supplier handoff |

## Feature dependencies

```text
Authentication → private Plans → Conversation/Brief
Conversation + evidence tools → candidate shortlist → confirmed destination
Confirmed destination + Requirements → WorkspaceManifest + permanent map
Functional provider capability + exact criteria → search results
Search result + final recheck → explicit add-to-Plan confirmation
Saved provider option + final handoff recheck → verified supplier redirect
CRUD revisions/idempotency → every mutation, recovery, and reconnect path
```

## MVP recommendation

Prioritize the accepted full-MVP journey in this order:

1. Secure entry and Draft Plan lifecycle.
2. Conversation, Brief, destination research, and evidence/uncertainty.
3. Requirements confirmation and map-first workspace composition.
4. Provider-backed search, comparison, refresh, and error states.
5. Explicit saved options, Map Pins, Custom Map Pins, and Canvas management.
6. Verified supplier handoff with unknown booking status.

Defer multi-provider aggregation, in-app checkout, booking imports, multi-destination itinerary planning, and autonomous changes.

## Sources

- Repository source-of-truth stories: `docs/user-stories/`
- https://ag-ui.ai/en/technologies/ag-ui
- https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-how-to-authenticate.html
- https://docs.aws.amazon.com/cognito/latest/developerguide/managing-security.html
