# Searchable travel selectors and pagination of ten

GSD quick execution, inline. Prototype alternatives previously declined in this session.

1. Replace long country and airline menus with an accessible searchable selector, capped at ten choices per page. Preserve imported values and explicit selection; support keyboard selection, dismissal, no matches, and required validation.
2. Replace growing Show more lists with ten-result pages for stays and return flights. Filtering, sorting, imports and new searches return to page one; comparisons persist between pages.
3. Run focused component/journey tests and production build. Rebuild the existing isolated port 5175 stack with the local-startup skill. Exercise authenticated search, paging, keyboard and responsive layouts in Chrome DevTools, retain before/after evidence, and clean up only test-created Plans.

Acceptance: no enormous native country/airline menus; at most ten selector choices or travel results per page; accurate counts and boundary controls; preloaded criteria and provider request semantics preserved. No durable Plan or booking changes.

Evidence: artifacts/testing/2026-10-16-searchable-travel-pagination/. User screenshot preserved in plan/native-country-before.png.
