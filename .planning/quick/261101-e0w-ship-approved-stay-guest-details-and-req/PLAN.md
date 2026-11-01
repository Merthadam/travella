# Ship approved stay guest details and requests

User explicitly approved the implemented layout and requested merge to main. Scope: summary-card removal, selected layout A, contact and room guests, per-room requests, provider validation/mapping and verification evidence. Preserve the separate dirty primary checkout.

1. Integrate origin/main and preserve both work-log histories.
2. Review the scoped diff and security boundaries; rerun combined checkout/canvas tests and backend regressions, then build.
3. Retain prior actual Chrome verification where source behavior is unchanged; rebuild the canonical app with integrated flight improvements and check authentication/source hashes.
4. Push the feature branch, create a reviewable PR, verify mergeability/checks and merge the exact reviewed head under the user's explicit authorization. Record PR and outcome. Broader Phase 18 acceptance remains unchanged.
