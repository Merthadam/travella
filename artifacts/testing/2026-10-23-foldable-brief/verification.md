# Foldable Trip Brief prototype C

C now defaults to a compact green completion ring, detail count, label and draft-readiness hint. Native disclosure opens the existing editable A2UI brief; draft generation remains inside it. Removed duplicate heading/count when expanded. Following feedback about blank space, collapsed conversation uses available width and content height, without a reserved sidebar or fixed gap above the composer.

Authenticated example-account verification using Chrome DevTools:
- Early research: collapsed 1/6; Enter expands, generation disabled. Choosing Lisbon updates count to 2/6. Collapse/reopen preserves edits; Space closes.
- Ready state: 5/6 and readiness hint; review opens/cancels. Explicit flight confirmation generates the mock draft; return to research shows draft-ready hint.
- Desktop light/dark and mobile screenshots inspected. No horizontal overflow; mobile review action visible and usable. Composer follows final message with less than 50px gap.
- Console: only existing Lit development warning. Network: successful requests, no observed failures.
- Build passed with existing large-bundle warning. PlanConversation and CanvasGenerationReview: 13 tests passed.

Prototype only; all trip mutations/generation are in memory. No new automated prototype tests. Generation failure was not rerun in this refinement. Existing fixed prototype switcher can overlay conversation content on mobile; expanded mobile brief is internally scrollable.

[Before](plan/before.png) · [Compact desktop](plan/compact-collapsed.png) · [Light collapsed](plan/light-collapsed.png) · [Expanded](plan/light-expanded.png) · [Mobile collapsed](plan/mobile-collapsed.png) · [Mobile expanded](plan/mobile-expanded.png)
