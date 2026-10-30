# Login frontend dead-code cleanup

User chose to preserve the current design without prototypes. Execute GSD quick inline.

1. Trace AccountApp → AccountAccess and auth/onboarding stylesheet references throughout frontend entry points, tests and previews. Remove only demonstrably unused legacy auth/onboarding code. Keep current auth/account recovery-code rendering and all current auth state-machine paths.
2. Capture the current login desktop/mobile/theme states as the unchanged visual target with isolated Chrome DevTools MCP. Remove unused selectors, their theme references and the unreferenced FirstLoginOnboarding compatibility export.
3. Run existing AccountApp and account-security regressions plus the production build. Use the real example-account sign-in/session/logout journey, auth navigation, theme switching and responsive checks; inspect console/network and before/after screenshots. Record evidence and limitations, update STATE, commit scoped changes.

Acceptance: current login appearance and auth behavior unchanged; removed code has no live frontend consumers; existing account recovery-code rendering preserved. No auth backend changes or user account mutations.
