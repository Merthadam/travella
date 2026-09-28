# ADR 0002: Frontend feature structure and Tailwind styling

**Status:** Accepted

**Date:** 2026-09-28

## Decision

Travella's frontend will be organized by feature rather than keeping plan workspace behavior in a single application component. Plans owns its page, components, hooks, and API adapters under `frontend/src/features/plans/`. Account access remains a separate feature boundary.

New frontend styling will use Tailwind CSS utilities and theme tokens. Shared legacy styles may remain temporarily while existing account and lifecycle screens are migrated, but new UI work should not add feature-specific CSS rules to the global stylesheet.

## Rationale

The Plans screen now combines lifecycle routing, drawers, Google Maps loading, Places autocomplete, destination CRUD, and workspace rendering. Feature boundaries keep those concerns testable and make the Planning Brief and agent surfaces safer to add.

Tailwind provides a consistent utility vocabulary and keeps layout decisions close to the component that owns them. The Travella theme tokens preserve the current ink, teal, and mist palette without introducing another bespoke CSS system.

## Consequences

- `PlansApp.jsx` remains the orchestration boundary while responsibilities move into `features/plans/components`, `hooks`, and `api` modules.
- Tailwind is enabled through the Vite plugin and `src/tailwind.css`.
- The migration can be incremental; existing global styles are not rewritten in the same change.
- Future components should prefer Tailwind classes and feature-local composition over adding selectors to `styles.css`.
