# Confirmation before canvas generation

Date: 2026-10-10.

## Decision and implementation

The traveler clarified that confirmation belongs before generating the planning canvas and that the existing right-hand assessor must stay unchanged. The production research page retains A2uiTripBrief/TripBrief without changes, adds the two-stage Research → Planning canvas indicator, and uses Review & generate → review dialog → Confirm & generate. Escape/Edit trip details cancel and restore focus. Open canvas remains navigation only; its full Generate action also requires review. Existing replacement warnings remain.

The review displays real research-context values and explicitly labels undecided details. Generation carries the reviewed context revision and rejects later changes or a context locked by another reply. Confirmation does not save the generated canvas. The three throwaway alternatives remain archived on `prototype/research-flow-alternatives-261010-j1q`; their active route, files, and runner script were removed after the decision.

## Executed checks

- `npm test --prefix frontend -- --run src/features/plans/components/PlanConversation.test.jsx src/features/plans/components/PlanningCanvas.test.jsx`: **18 passed**. Includes confirmation gating, cancellation/focus return, read failures, manual canvas generation, stale reviewed revision, and prior conversation/canvas behavior. The initial test caught focus restoration; fixed before the final passing run.
- `npm run build --prefix frontend`: passed; existing bundle-size advisory remains.
- `git diff --check`: passed.
- Canonical app rebuilt with the local startup skill after Cognito precheck. Launcher sign-in/session/sign-out passed. Running container hashes match changed review, conversation, canvas, hook, stylesheet, and route files.
- Authenticated **Chrome DevTools MCP** used through the existing isolated headless MCP instance (default shared MCP profile is busy). Example-account browser sign-in passed. First attempt received transient HTTP 503; one subsequent attempt passed. No password rejection or credential changes.
- Research review open and cancel: **zero write requests**. Escape closed the dialog and returned focus to Review & generate. Edit trip details did the same.
- Confirm & generate: exactly **one** `generate_plan` request, HTTP 200. Real generation completed with “Draft ready to review. Nothing is saved until you choose Save plan.” No canvas was saved.
- Separate new verification Plan: selected Milan through the unchanged assessor, set two travelers and flexible dates, waited for saves, reloaded, and verified the review displayed the persisted values. Remaining fields stayed Undecided.
- Open canvas made no generation request. Its Generate plan action opened review; Keep editing canceled successfully.
- Desktop 1440×1000, mobile 390×844, narrow 320×740, dark/light confirmation captures inspected. No horizontal overflow or clipped controls in reviewed screenshots. Dialog scrolls for longer contents.
- Final inspected app/agent/context/map requests returned 200. No final change-related console errors; only the existing Lit development warning.

No backend CRUD code changed. Broader PlansApp test fixtures have the seven pre-existing missing-researchContext failures documented in the previous cleanup report; that broader suite was not rerun for this change.

## Evidence

Plan references carried from the selected alternatives: [stage indicator](plan/selected-stepper.png), [confirmation checkpoint](plan/selected-confirmation.png). The sample prototype summary is not promoted; the real assessor is preserved.

Implementation: [research desktop](implementation/research-desktop.png), [research mobile](implementation/research-mobile.png), [confirmation desktop](implementation/confirmation-desktop.png), [mobile](implementation/confirmation-mobile.png), [narrow](implementation/confirmation-narrow.png), [light](implementation/confirmation-light.png), [canvas](implementation/canvas-before-generation.png), [canvas review](implementation/canvas-generation-review.png).

Screenshots use the new verification Plan with only deliberate Milan test data. The earlier live-generation Plan was originally created by the previous cleanup task; its generation remained unsaved. The new verification Plan is retained for review at http://localhost:5174/plans/251e8848-822b-4665-af4b-21735bfd0d62.
