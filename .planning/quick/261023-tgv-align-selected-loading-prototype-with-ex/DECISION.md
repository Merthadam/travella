# Existing-component alignment

User requested preserving the general shape while aligning the preview with the current frontend, plus a small animation slowly opening the Copilot sidebar during generation.

Retain B Full focus globe + full-width C Research → Canvas. Reuse actual Plan chat and canvas card components with design tokens and local fixtures. Desktop sidebar reveal lasts 1.1 seconds; reduced motion opens directly. Mobile retains the current workspace tab pattern. This refines the prototype rather than changing the production frontend or starting real generation.

Superseded by user clarification: alignment was intended for the progress bar only. Broad component/sidebar changes removed in quick 261023-to4; retain the previously accepted globe layout.
