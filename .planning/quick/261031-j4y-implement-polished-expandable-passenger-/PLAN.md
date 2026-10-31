# Polished passenger sections — approved A

User selected prototype A and requested a prettier, more user-friendly implementation.
Prototype primary source: branch prototype/passenger-details-20261031, commits 4d3c4ee and 07f8876. Keep prototype code isolated.

1. Rewrite A for production: one expandable section per traveler, concise completed summaries, separate booking contact, compact grouped inputs, responsive styling. Solo traveler remains open.
2. Preserve transient data, country search, age/document/contact validation, explicit reservation consent, and recovery. Section completion only changes local UI. Invalid final submission reveals/focuses the relevant field.
3. Add focused interaction regressions; run travel/PlanningCanvas suite and production build. Rebuild canonical Docker from this worktree; authenticate example user with Chrome DevTools; exercise completion/edit/invalid/final reservation path, desktop/mobile, console/network. Capture/inspect evidence.
4. Commit implementation and verification; record quick task in STATE. No push or final booking.
