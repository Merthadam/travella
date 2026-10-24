---
status: complete
---
# Selected travel journal A — destination photos

User selected A and explicitly chose destination photography from Google Maps, with a placeholder until generation. Replaced illustrative art with live destination photos using the existing Google loader, Geocoder exact destination resolution and Places photo API. Contributor links and Google Maps credit remain visible. Photos load lazily; missing/failed photos retain an honest placeholder. No durable photo cache.

Aligned labels and progress with the existing Research → Canvas flow. Confirming a destination stays in Research; simulated generation advances to Canvas and updates automatic titles. Manual names remain protected. The generated-plan preview uses the same photo component. Prior B/C alternatives are retained in git history.

Source commit: bce9c01. Prototype only: sample trips and in-memory mutations; actual Plans/Canvas integration remains pending. Public browser Maps configuration reused in ignored local env, never committed.

Verified authenticated Chrome DevTools desktop/mobile, light/dark, live photos and credits, generation/name transition, manual-name protection, stage filtering, empty state, fallback, console/network and build. Evidence: artifacts/testing/2026-10-24-plans-photo-refinement/verification.md. Preview: http://localhost:5190/plans?prototype=plans-journal&variant=A.

Retain capture branch prototype/plans-journal-20261024. No push or merge. Remove the development prototype when promoting selected behavior to production.
