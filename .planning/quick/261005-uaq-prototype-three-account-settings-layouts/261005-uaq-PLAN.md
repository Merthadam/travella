# Account settings design exploration

Question: which account-page structure best supports editing identity, onboarding preferences and security, in both light and dark mode?

User approved personal details, travel preferences and security, explicit section saves, optional-field clearing and no automatic changes to confirmed Plans. User requested prototypes and light/dark preview. Design C was selected by the user on 2026-10-05 (“c would be perfect”); see SUMMARY.md for the captured decision.

1. Build three development-only React variants, using the existing frontend prototype convention and Travella colors: A sidebar sections, B editorial travel studio with expandable sections, C master/detail editor. Show the application header for context. All use fictional sample data and in-memory simulated changes. No authentication, real account edits, provider calls or new external integration.
2. Provide a shared URL-driven variant bar and light/dark controls; support responsive layouts, save/cancel, security previews, preference clearing and keyboard navigation. Expose the full sample state through a developer disclosure. Add one npm preview command on available port 5176. Production build excludes the prototype entry.
3. Run the production build. Exercise each direction and both themes through Chrome DevTools, verify edits and cancel behavior, inspect console/network, and save desktop/mobile screenshots under artifacts/testing/2026-10-05-account-prototypes/plan. Record exact verification and limitations. Capture on prototype/account-settings, update STATE and hand off preview links for user selection.

Execution: GSD quick workflow, inline per Codex adapter; no extra agents. No tests for throwaway prototype code. Visual and interaction gates still apply. Authenticated example-account journey is inapplicable to this clearly labeled sample-only design preview.
