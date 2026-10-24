# Login redesign exploration — 2026-10-24

Status: three browser-verified design prototypes. Production redesign is pending user selection.

## Scope and source

User requested a login redesign with the same functionality. Offered three prototypes versus direct redesign; after reviewing the current UI and waiting for an answer, proceeded with prototype exploration, as in the earlier header task. No production visual direction has been selected.

A: split welcome and travel illustration. B: compact centered form. C: persistent account-access navigation rail. All live on `/?prototype=account-access&variant=A|B|C`, gated by Vite development mode. Existing AccountContent authentication handlers, request bodies and session logic are unchanged. Source captured on `prototype/login-redesign-20261024`.

Start: `cd frontend && npm run prototype:auth`.
Preview: http://localhost:5189/?prototype=account-access&variant=B

## Executed verification

- Chrome DevTools CLI used with a separate `login-redesign` browser context. Existing authenticated tabs remained intact. These are signed-out simulated flows, so no example-account login was required and no real credentials were entered.
- All three variants: simulated sign-in → success; registration with four fields → email verification; resend feedback; verification → sign-in; recovery → reset → sign-in; MFA recovery → replacement authenticator → recovery codes → success. All completed.
- Loading checked after the React update: form aria-busy and disabled fieldset both true. Error preview visible in all variants. Inputs reset on submission and navigation; no form values stored in browser storage or sent to APIs.
- Native ArrowRight switching verified B → C; URL persisted through reload. ArrowRight dispatched on a focused input left the variant unchanged. Bottom arrow buttons also used during exploration.
- Desktop 1440×1000, mobile/touch 390×844, light/dark palettes checked. No horizontal overflow; form bounds remain within viewport. Long registration screen and error screen checked on mobile; page remains scrollable above the prototype control bar.
- Inspected saved A/B/C desktop, mobile and dark screenshots, plus B registration/error screenshots. Fixed a missing space in A's mobile hero text and replaced that screenshot.
- Initial harness busy check ran before React committed state and returned false; repeated after 100ms and passed. An initial synthetic keyboard event targeted window instead of the focused field; corrected the harness to dispatch on the input and reran. Final console has no errors; only existing Lit development-mode warning.
- Final network inspection: zero `/auth/` or `/v1/` requests. Actions are simulated, visibly labelled in the persistent prototype controls.
- `npm run build --prefix frontend`: passed. Existing large-chunk warning remains. `git diff --check`: passed.
- No automated tests added for throwaway UI. No real registration, password reset, MFA enrollment or production sign-in was attempted by this prototype task.

## Evidence

Original UI: [desktop](plan/before-desktop.png), [mobile](plan/before-mobile.png).

| Variant | Desktop | Mobile | Dark |
|---|---|---|---|
| A — The journey begins | [Screenshot](plan/A-desktop.png) | [Screenshot](plan/A-mobile.png) | [Screenshot](plan/A-dark.png) |
| B — Quiet focus | [Screenshot](plan/B-desktop.png) | [Screenshot](plan/B-mobile.png) | [Screenshot](plan/B-dark.png) |
| C — Your workspace | [Screenshot](plan/C-desktop.png) | [Screenshot](plan/C-mobile.png) | [Screenshot](plan/C-dark.png) |

Additional B states: [registration](plan/B-registration-mobile.png), [error](plan/B-error-mobile.png).

## Remaining work

Record user selection before production implementation, per the mandatory Travella skill. Then integrate the chosen layout with the existing real handlers and verify real login/logout plus the applicable mocked security journeys. Existing five AccountApp test failures from the preceding task remain documented there and have not been changed or retested here. No deployment or shared Docker rebuild.
