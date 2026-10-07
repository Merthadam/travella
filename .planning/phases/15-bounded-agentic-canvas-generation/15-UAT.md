---
phase: 15-bounded-agentic-canvas-generation
status: pending
---

# Remaining acceptance checks

Start at http://localhost:5174 and open a Plan conversation. The local stack is rebuilt; existing accounts/data are preserved.

1. Generate plan from a conversation with an early preference and later correction. Check themes against actual traveler statements and memory labels.
2. Check one semantic review and at most one revision per SDK group; inspect sanitized usage/latency against limits. Paid model evaluation has not been run.
3. Generate sourced findings/websites; verify actual read pages, conflicts, freshness and unavailable sources. Check source links and uncertainty in the UI.
4. Stop mid-generation, retry only the failed group, switch Plans and confirm late events do not replace other drafts. Save immediately after Stop should remain retryable while its lock finishes releasing.
5. Validate normal chat still streams and updates trip context. Update chat after saving a canvas, then verify stale notice and explicit regeneration behavior.
6. Exercise provider outage, ambiguous place/country viewport, keyboard-only editing/dialogs and reduced-motion preference.
7. Exercise cross-process/deployed AgentCore behavior. Saved-canvas soft-delete/recovery passed locally. Confirm a shared persistent server evidence-signing key in deployment.

Do not present unknown supplier availability as real offers or bookings. Current flight/accommodation browsing views intentionally show unavailable states.
