# C refinement: generation inside A2UI Trip Brief

2026-10-23 · `prototype/full-width-state-bar-20261023`.

User finds C promising and requests all non-stage information inside the A2UI Trip Brief, including possibly generation. This prototype revision places readiness, loading/error feedback, and the review/create action in the real A2UI Trip Brief. The full-width bar contains only Research → Draft plan. No duplicate readiness checklist. A/B retained. Production selection and readiness policy remain unapproved.

Preview: `http://localhost:5177/plans?prototype=state-bar&variant=C&scene=ready`.
Run: `npm --prefix frontend run prototype:navigation`. Sample stage switches early/ready. Generation and all brief mutations remain memory-only.

## Verification performed

Chrome DevTools MCP CLI with the authenticated example-account session from the preceding verification. Actual UI interactions checked at desktop 1440×1000 and mobile 390×844.

- Top bar has no readiness text/action; draft action is inside the A2UI Trip Brief.
- Early action disabled; ready action opens existing confirmation. Cancel returns to brief.
- Explicit flight confirmation shows loading in brief, then opens sample draft. Returning to research shows Open draft plan in brief.
- Mobile action is fully visible inside the brief; no horizontal overflow. Review/cancel exercised on mobile.
- Simulated error remains in brief; review/retry and cancel work.
- No application console errors; existing Lit development warning only. No mutation requests during mocked flow. See browser-checks.txt and network.txt.
- Existing PlanConversation + CanvasGenerationReview tests: 13 passed in 2 files.
- Production build passed; existing large-chunk warning remains. `git diff --check` passed.
- All screenshots inspected. Mobile brief uses a taller internal scroll region to keep readiness and generation visible. Floating bottom controls are prototype tools only.

## Screenshots

[Before](plan/before.png) · [Early desktop](plan/c-early-desktop.png) · [Ready desktop](plan/c-ready-desktop.png) · [Ready mobile](plan/c-ready-mobile.png) · [Mobile review](plan/c-mobile-review.png) · [Loading](plan/c-loading.png) · [Error](plan/c-error.png) · [Existing draft](plan/c-existing-draft.png).

No backend CRUD changed. Real generation/persistence and the broader production stability issues were not addressed or verified here. The full suite was not rerun; previously recorded baseline failures remain outside this prototype revision.
