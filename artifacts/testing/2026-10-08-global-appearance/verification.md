# Global appearance verification

Date: 2026-10-08. Source: `756aee6` on `feature/account-settings`.
Result: PASS for the application appearance correction. Preview: **http://localhost:5184/account**.

The Account controls now update one root AppearanceProvider. Root `data-theme` and native `color-scheme` persist across route changes, including sign-out. Existing `travella.account.theme` selections migrate to `travella.theme`. Storage denial falls back to an in-memory selection; initial system preference and cross-tab changes are supported. Shared semantic colors cover Account, Plans, conversation/Markdown, Trip Brief, dialogs and authentication; onboarding receives dark surface rules as well.

## Executed checks

- `NODE_OPTIONS=--no-experimental-webstorage npm --prefix frontend test -- src/features/appearance/AppearanceProvider.test.jsx src/features/account/AccountSettingsPage.test.jsx src/features/account/PreferenceSettings.test.jsx src/features/account/AccountIdentity.test.jsx src/features/account/AccountSecurity.test.jsx`: **41 tests passed in 5 files**. New checks cover legacy migration, root persistence while route controls unmount, remount persistence, global preference precedence, cross-tab updates, denied browser storage and real AccountApp navigation.
- `npm --prefix frontend run build`: passed after final styles. Existing large-bundle advisory remains.
- Read-only local Cognito precheck passed. `TRAVELLA_LOCAL_ORIGIN=http://localhost:5184 uv run --locked python scripts/check-local-auth.py`: sign-in, session and temporary sign-out passed.
- Actual isolated **Chrome DevTools MCP** authenticated as the supplied example account. Before-state and a DOM-rendered dark Plans design were captured before production source changes. The previous prototype-C selection was retained.
- Account Dark → My plans: root theme and native scheme remained dark; Plans background `rgb(12,23,37)`, cards `rgb(20,34,53)`. Direct Plans reload retained dark. Browser storage contained global `dark` and the legacy key was removed.
- Plans rename dialog opened with dark surface, readable field and visible focus; closed without renaming.
- Conversation, Markdown headings/text/links, user messages, composer and Trip Brief inherited dark. Returning through Account and choosing Light restored light conversation/composer surfaces.
- Mobile at **390×844**: dark and light conversation/Trip Brief/composer, Account navigation and Plans checked; no horizontal overflow. Desktop checked at **1440×1050**.
- An unsent synthetic composer draft survived Account → change appearance → return. The draft was then cleared without submitting it.
- Sign-out retained dark styling on the sign-in form; browser sign-in returned to the app still dark. No credentials appear in evidence.
- Final production navigation: no console errors or warnings. `/plans` 304; `/auth/session`, `/v1/traveler-profile`, `/v1/plans`, `/auth/account` 200. No application write was submitted other than the explicit test sign-in/out; no Plan/settings values were changed.
- SHA-256 matched all six changed runtime source files, `frontend/dist/index.html`, and all three compiled JS/CSS assets in the dedicated container. Container state: running, healthy.
- All screenshots below were opened and visually inspected for theme consistency, readable controls, clipping and overlap. Conversation text/selected places were replaced only in the screenshot DOM with clearly labeled verification samples and restored immediately; no stored content changed. Account identity was similarly masked.
- `git diff --check`: passed.

## Visual evidence

[Before Plans](plan/before-plans-light.png) · [Rendered intended dark Plans](plan/intended-plans-dark.png)

- [Account dark](implementation/01-account-dark.png)
- [Plans dark](implementation/02-plans-dark.png)
- [Plan dialog dark](implementation/03-plan-dialog-dark.png)
- [Conversation dark](implementation/04-conversation-dark.png)
- [Conversation light](implementation/05-conversation-light.png)
- [Mobile conversation dark](implementation/06-conversation-mobile-dark.png)
- [Mobile conversation light](implementation/07-conversation-mobile-light.png)
- [Mobile Plans dark](implementation/08-plans-mobile-dark.png)
- [Mobile sign-in dark](implementation/09-sign-in-mobile-dark.png)

## Runtime notes and verification limits

The dedicated `travella-account-preview` container remains on frontend5184/auth8014/agent8114. The concurrently used5174 stack was not replaced. The existing migration0010 definition from the earlier preview remains a runtime-only compatibility file for the shared database; no database migration or deletion was performed.

During the first mobile pass Docker OOM-killed the development server in its approximately2GB VM. That interrupted pass was discarded and rerun. The dedicated container now serves the compiled production assets via Vite preview with a minimal runtime proxy config, reducing observed memory from roughly548MiB to424MiB. Its launcher/config and compiled assets are runtime-only; source hashes and built-asset hashes were checked. It still depends on the shared local database/network and available VM memory. Final health/auth/browser checks passed.

No backend CRUD handler changed; CRUD mutation testing was not applicable. Broader existing test debt was not rerun or claimed fixed. First-login onboarding received matching dark styles but was not resubmitted because the example traveler has completed onboarding; no profile reset was performed. External provider map imagery is provider-rendered and was not changed. This record supersedes the previous Account-only appearance limitation for application-owned surfaces.
