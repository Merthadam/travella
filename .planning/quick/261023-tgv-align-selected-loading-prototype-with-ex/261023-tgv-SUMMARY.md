---
status: complete
---
# Align the selected loader with existing Travella components

Preserved B's globe/text composition, completed-item count and C's full-width Research → Canvas indicator. Selected C now uses the existing design tokens, canvas header/button styling, actual CanvasConversation, TripEssentials, TripThemes and ResearchFindings. All fixture changes and chat responses remain in-memory. No production component or backend source was changed.

The right-hand Plan chat eases open from a 56px rail to 400px over 1.1 seconds when the simulated generation starts or replays. Collapsing/reopening works. The globe stays mounted and animated across both phases. Reduced motion disables transitions and globe motion. Mobile uses existing Plan & map / Conversation tabs, with preview navigation below the content so it cannot cover the count. Desktop cards scroll independently of the chat composer.

Build and authenticated official Chrome DevTools checks passed for desktop/mobile and light/dark themes. Verified the intermediate animated width, collapsed/reopened state, disabled composer during generation, phase continuity, completion, editor open/cancel, local sample chat, cancel/error/retry, and reduced motion. Screenshots inspected. Evidence: artifacts/testing/2026-10-23-aligned-loader/verification.md.

Code commit: 854c6fe. Prototype branch only, no push or merge. The original globe alternatives remain available; live generation integration remains deferred.
