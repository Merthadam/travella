---
status: complete
---
# Refine selected account-access prototype A

User selected A for refinement: keep split composition, improve night mode, make recovery/verification and errors feel natural with fewer standalone components. Continue prototype exploration; production authentication remains unchanged.

1. Research current first-party recovery patterns. GitHub places recovery beside password and asks for email before inbox/reset; Slack uses email-code recovery. Keep Travella's existing code-based reset capability.
2. Refine A with system-aware theme plus visible toggle, quiet inline feedback, contextual verification after registration or generic failed sign-in, and email → inbox confirmation → reset → sign-in. Preserve direct code entry and resend. Keep stub actions clearly labeled.
3. Exercise desktop/mobile light/dark, error/loading/recovery/verification/registration and existing MFA previews in Chrome DevTools. Inspect captures, console/network, build and diff. Capture prototype branch and record evidence.

Acceptance: no standalone verify-email block on initial login; contextual verification remains reachable; meaningful neutral reset confirmation; inline accessible error; coherent night palette; no clipping or auth requests.
