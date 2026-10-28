# Tailored briefing sources

Completed 2026-10-27 on the existing prototype branch. The user requested basic city information plus resources relevant to the trip: transport, matching sights, and (for a ski trip) local rental providers. Updated the Lisbon example while recording the broader source-selection requirement. Runtime personalization and live model generation remain unimplemented.

## Source checks

Browsed the actual primary pages on 2026-10-27:

- [Lisbon Metro — Using the Metro](https://www.metrolisboa.pt/en/travel/using-the-metro/): tickets and network usage. Replaces the generic city guide for the transport highlight.
- [CARRIS — Travel Planning](https://www.carris.pt/en/travel/planear-viagem/): origin, destination, date and time fields for journey planning. Included in expanded context for reaching Belém from the eventual base.
- [National Coach Museum — Plan your Visit](https://www.mncoches.gov.pt/en/visita): direct English visitor information. Presented as an optional match for the sample culture interest and Belém plans, not as a saved selection.
- Existing [Visit Portugal city overview](https://www.visitportugal.com/en/content/lisbon-in-a-day) and [food guide](https://www.visitportugal.com/en/destinos/lisboa-regiao/196876) remain as general background. Their content was checked earlier in this session.

Five distinct sources in total. No invented ski destination or supplier was selected. No date-specific prices, opening availability, transit routes or rental inventory are asserted.

## Executed verification

- Authenticated as the configured example account through the real local app; password excluded from artifacts.
- Used the established isolated Chrome DevTools protocol workflow and CDP screenshots because of earlier MCP screenshot transport timeouts.
- Asserted five distinct links, exact Metro/CARRIS/museum destinations and new-tab/noopener attributes.
- Pointer and keyboard disclosure worked; mobile expanded context remained accessible. Source new-tab opening was exercised in the preceding briefing check; this revision verified the new destinations and preserved behavior attributes without visiting a supplier transaction page.
- Captured and visually inspected desktop collapsed/expanded and mobile. No horizontal overflow; no clipping or unreadable content in the card.
- No JavaScript page errors or Plan mutation requests. Existing favicon 404 and expected pre-login session 401 were the only failed requests. Existing Lit/Google Maps development warnings remain. [Browser results](plan/browser-checks.json).
- `npm run build` and `git diff --check` passed; existing build chunk-size warning remains. No new unit tests for this small throwaway content revision.

## Evidence and scope

- [Compact card](plan/tailored-card.png), [expanded](plan/tailored-expanded.png), [mobile](plan/tailored-mobile.png).
- Preview: http://localhost:5192/plans/0355fb3e-acb1-438b-9177-ccccb1da588c?prototype=trip-essentials&variant=D
- Sources are manually tailored in this prototype. Accepted future behavior is documented in the quick-task plan: adapt source categories to confirmed destination, interests, purpose, saved places and relevant constraints, rather than filling a fixed directory. For skiing this includes the specific resort, lift/piste information and appropriate local equipment rental. Automatic selection, generation and durable storage were not implemented or tested.
