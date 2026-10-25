# Phase 18 requirements

| ID | Observable outcome | Owning plan |
| --- | --- | --- |
| FOCUS-01 | Flights, Stays and Trip histories remain distinct across navigation, reload and another authenticated session; historical messages remain Trip messages. | 18-01, 18-03 |
| FOCUS-02 | Each specialist receives current trip theme, dates, party, relevant budget/preferences, a bounded set of selected activities and accepted travel choices, with source versions and omission labels. No other-topic transcript is injected. | 18-01, 18-04 |
| FOCUS-03 | Stays can ask for missing requirements, search/refine apartments or hotels, inspect details/reviews/room terms, and independently refine within a bounded budget to compare up to three options against the trip's priorities. | 18-02 |
| FOCUS-04 | Flights can resolve airports, search return trips, compare timing/layovers/baggage and verify a fare. It considers relevant activities and accepted accommodation without inventing transfer times. | 18-03 |
| FOCUS-05 | Each trip substage shows its own chat, current search/results, selected comparison targets, compact shared context and manual search fallback; switching preserves the right discussion and result identity. | 18-01, 18-02, 18-03 |
| FOCUS-06 | Relevant shared changes invalidate old result applicability and late replies. Stop, retry, duplicate submission, topic switch and multiple tabs cannot cross histories or commit obsolete decisions. | 18-01, 18-04, 18-05 |
| FOCUS-07 | A traveler can explicitly save/remove a shortlist item and confirm/replace/remove a preferred research choice. Readback/reload preserves it, and both specialists see accepted choice summaries. Choosing a preferred option marks the substage ready; removing it reopens research and relevant changes require review. No booking is implied. | 18-04 |
| FOCUS-08 | Provider capability, sandbox, observed-at, unknown and expiry states remain visible; unsupported modes stay hidden; every claimed comparison fact is grounded. | 18-02, 18-03, 18-05 |
| FOCUS-09 | CRUD authorizes topic data from the token-derived traveler; topic data follows seven-day Plan deletion/recovery/purge. Tool allowlists prevent cross-domain tools and transactions; private evidence stays private. | 18-01, 18-04, 18-05 |
| FOCUS-10 | Long discussions retain attributed topic preferences and rejected-option reasons without converting exploratory statements into shared requirements. Context has explicit bounds and incomplete-coverage behavior. | 18-04 |

Acceptance requires real HTTP/database persistence checks, migration verification, authenticated desktop/mobile browser journeys, and evidence-based agent evaluations. Mocked supplier/model fixtures establish deterministic behavior; they do not establish live inventory or live model quality.
