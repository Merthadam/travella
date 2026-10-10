---
status: complete
---
# Confirm trip details before canvas generation

Decision: keep the existing right-hand A2UI Trip Brief assessor unchanged. Combine the minimal Research → Planning canvas stage indicator with an explicit review before generating, as clarified by the traveler. Confirmation concerns canvas generation, not supplier checkout.

1. Show exact current destination/dates/travelers/budget/travel needs; unresolved values remain explicitly undecided. Cancel/edit returns to the unchanged assessor. Only confirmation starts generation.
2. Preserve existing replacement warnings and apply the review to manual full generation inside the canvas. Carry the reviewed context revision so changed details cannot silently generate a different plan.
3. Archive the three alternatives already captured on prototype/research-flow-alternatives-261010-j1q; remove their active route and files once promoted.
4. Focused behavior tests, build, authenticated Chrome DevTools interaction, console/network inspection and desktop/mobile screenshots. Verify cancellation produces no generation request, confirmation generates once, stale review is rejected, and keyboard focus returns.

Before-design evidence: selected-stepper.png and selected-confirmation.png reuse the visually inspected alternatives chosen by the user. The real right-hand assessor is preserved rather than replaced by sample prototype notes.
