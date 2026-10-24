---
status: complete
---
# Refine selected journal A with destination photos

User selected A and clarified that Google Maps imagery means destination photography, not a miniature map. Keep a quiet placeholder until a plan has been generated, then display the destination photo with contributor credit. The same destination photo treatment should be reusable in the planning canvas. Continue prototype refinement; actual production Canvas integration remains pending.

Use the existing two-step Research → Canvas flow from PlanStages/CanvasGenerationLoader, eliminating the invented Exploring stage. Preserve the earlier A/B/C prototypes in committed history. Reuse the existing Google Maps loader and Places photo approach, resolve the exact destination, fetch live photos, retain required contributor attribution, and retain a placeholder when imagery is unavailable. No Plan mutations or permanent photo/URL cache.

Verify through authenticated Chrome DevTools: generated and pre-generation photos, generation transition, name protection, mobile/light/dark layouts, simulated unavailable-photo fallback, console/network and build. Record screenshots under artifacts/testing/2026-10-24-plans-photo-refinement/plan. Existing browser map configuration may be reused in ignored local frontend env; credentials must not be printed or committed.
