---
mode: quick
status: complete
---

# Editable travel search defaults

Use the existing search form (user explicitly selected it and confirmed the defaults). Prefill flight departure using home city, arrival using Plan destination, and existing fixed Plan dates. Prefer the supplier's all-airports city option; retain specific airport selection and manual alternate departure. Country of residence uses home country; stay guest nationality uses saved citizenship, falling back to home country. Never mutate the saved profile or Plan when seeding/editing search criteria.

1. Add guarded asynchronous airport defaults and pass the authenticated profile to workspaces. Preserve edited, recovered, imported, and already searched criteria. Do not auto-search. Keep blank/flexible dates and unresolved/ambiguous locations honest.
2. Preserve city airport metadata through lookup, and validate city-wide flight endpoints against provider-confirmed membership plus the existing explicit Milan membership. Individual airport requests remain exact.
3. Run focused frontend and connector regressions plus build; inspect and exercise the authenticated form with isolated Chrome DevTools, including changing departure, reload, nationality, empty/error lookup, and responsive layout. Capture plan and implementation screenshots and record evidence.
