# Account visual alignment

The user selected prototype C and then requested reimplementation to address inconsistency with the main application. Retain the settings list and adjacent inline editor, grouped mobile selector, explicit Save/Cancel and account-scoped light/dark modes. No new prototype selection is needed.

Before production edits, the example account was authenticated through the actual local app in Chrome DevTools. A temporary document with synthetic traveler content rendered the intended design; its controls are explicitly simulated. Captured and visually inspected `intended-desktop-light.png` at 1440 × 1050. The preview has no clipped or overlapping content. It is design evidence, not a claim of implemented behavior.

- Share the navy application header and capitalized Travella wordmark with Plans. Navigation stays caller-owned and Account exits retain the existing unsaved-edit guard.
- Use the main app's cool background, navy typography, mint primary actions, Inter type and 1240px outer width with 32px desktop gutters.
- Keep the C structure while allowing the detail card to fit its content instead of stretching to the full sidebar height. Reduce nested card decoration.
- Place the appearance control beside the page heading, then below it on mobile, to keep navigation compact.
- Use navy/slate surfaces and mint actions for Account dark mode. Full-application dark mode remains outside this task.
- Keep keyboard focus visible and alerts focused; restrict the future-suggestions note to travel preferences.

Evidence: [Before Plans](before-plans.png), [Before Account](before-account-light.png), [Intended light design](intended-desktop-light.png), [Synthetic preview source](intended-preview.html).

Acceptance checks: focused account regression suites and build, then actual rebuilt Chrome desktop/mobile light/dark, preserved navigation and edit guards, theme reload persistence, console/network review and source freshness. Final implementation checks are recorded separately in `../verification.md`.
