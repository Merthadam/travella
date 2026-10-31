---
status: resolved
trigger: "there is this flicker when clicking on checkout"
created: 2026-10-31
updated: 2026-10-31
---

# Checkout entry flicker

Execute gsd-debug inline. Expected: stable transition into checkout. Actual: user still sees a flicker on click after prior data-preparation fix. Exact button clarification pending; investigate manual entry while awaiting it. No reported error. Preserve approved design; no new prototype decision needed for a bug fix.

## Current Focus

Confirmed cause: adding pending status/Cancel rows re-centered and widened the result action column.
Current state: fixed in 8fc8b31; browser geometry, cancellation/retry and automated checks passed.

## Acceptance

Fix only evidence-backed causes, preserve abort/error/booking contracts. Record before/after frame evidence and screenshots; focused tests/build and canonical running-source checks. No booking/payment. Clean only the verification-owned Plan.

## Evidence

User confirmed View flight → checkout. Actual Chrome frame capture at 1440×1000 shows button rectangle changes from x858/y511/w115/h46 to x828/y451/w145/h46 when pending status/Cancel are inserted. Result card and scroll positions remain constant; centered action column reflows upwards 60px. Checkout then appears fully populated with stable geometry. Prior content-only frame checks missed this loading-state movement.

Fix: give the same button a cancellable loading state with a small spinner. Stack idle/loading labels in one grid cell, reserving identical intrinsic dimensions. Keep the status announcement outside visual layout and preserve abort/error handling. No extra row appears while pending; respect reduced motion.

## Resolution

8fc8b31 keeps idle/loading labels in the same grid cell and uses the same button for Cancel check while pending. Desktop button remained x837/y511/w136/h46 throughout loading; result rectangle unchanged. Mobile button remained x33/y432/w136/h46 through loading/cancellation and normal checkout entry. Both checkout layouts appeared once at stable geometry. Browser keyboard cancellation retained focus; real retry after a simulated network failure succeeded.

274 travel/canvas tests passed, 12 existing external-fixture skips; production build passed. Canonical Docker auth readiness and changed-source hashes matched. Authenticated Chrome desktop/mobile screenshots inspected, network/console reviewed, verification Plan cleaned. Evidence: artifacts/testing/2026-10-31-checkout-layout-flicker/verification.md. No reservation/payment, push/merge/deployment; wider phase acceptance unchanged.
