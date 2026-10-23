---
quick_id: 261023-skp
status: complete
commit: d6abf21
---
# Research docking complete

The latest user correction puts the draggable brief circle at the top-right end of the full-width progress bar. The transcript fills available space and scrolls above the bottom composer. The brief remains a portal overlay; opening, closing and dragging do not move conversation text.

Executed inline through GSD quick. Production change: d6abf21. Updated existing position and drag tests. 30 focused tests passed, production build passed (existing chunk warning). Chrome DevTools verified the example-account journey at 1440×1000 and 1280×800, exact default anchoring, composer bottom alignment, open/Escape/keyboard/pointer drag, reload, and temporary long-history scrolling. Console had only the existing Lit development warning; relevant network reads were 200. Source hashes match rebuilt isolated research17 runtime.

Quick source review: no new blocking findings in changed components, CSS or tests. No backend changes, paid model calls or Plan mutations. Phase 17's broader human acceptance remains pending; this quick task verifies the layout follow-up only.

Evidence: [verification](../../../artifacts/testing/2026-10-23-research-docking/verification.md). Preview: http://localhost:5178/plans/f717203b-6f46-4203-834e-ac9dd8f1e2e5
