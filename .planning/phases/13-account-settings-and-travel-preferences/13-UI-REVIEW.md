# Phase 13 — UI Review

**Audited:** 2026-10-06
**Baseline:** 13-UI-SPEC.md and selected prototype C; execution plans resolve implementation choices such as manual authenticator setup.
**Screenshots:** Seven existing production captures inspected with the image viewer, compared with five selected-C planning captures. No new captures or live sensitive mutations.
**Verdict:** Changes recommended. No demonstrated task-completion blocker; significant interaction-contract gaps remain.

## Pillar Scores

| Pillar | Score | Key Finding |
|--------|-------|-------------|
| Copywriting | 3/4 | Clear preference copy; email and identity summaries omit promised status/context. |
| Visuals | 3/4 | Selected-C hierarchy retained; specified icons and error indicators missing. |
| Color | 3/4 | Both palettes preserved; focused headings/errors use browser-default outlines. |
| Typography | 3/4 | Four-size scale is readable; reused strong text can add an undeclared weight. |
| Spacing | 4/4 | Contract grid, breakpoint, gutters and target sizes implemented; inspected captures do not clip. |
| Experience Design | 2/4 | Sensitive confirmation, account-read recovery and identity conflict/focus gaps. |

**Overall: 18/24**

## Top 3 Priority Fixes

1. **Make sensitive confirmation action-specific.** Authenticator disable and recovery replacement execute after a generic Continue verification submission. Add the contracted confirmation state with the consequence, safe action and explicit Turn off authenticator/Replace recovery codes action. Keep fresh verification and one-use proofs; do not introduce automatic retries.
2. **Distinguish loading from account-read failure and provide local Retry.** Track account loading/error independently of preferences. Security rows currently become a dead-end Status unavailable when the initial read fails; a slow identity read falsely announces an error. Retry should recover the selected setting without requiring another section or page reload.
3. **Finish identity editor focus and conflict review.** Focus the name/email editor on entry and errors on failure; show latest acknowledged names next to the retained draft after conflict review before enabling a fresh Save.

## Detailed Findings

### Pillar 1: Copywriting (3/4)

- **WARNING C1:** `frontend/src/features/account/AccountIdentity.jsx:128`–130 renders the email string without verified status and uses “Email changes are currently unavailable.” The contract requires verified status and reassurance that the current address is unchanged. Confirmed in `account-security-unavailable.png`. Render canonical verification status and the specified unavailable copy; retain Check availability and the capability gate.
- **WARNING C2:** `AccountIdentity.jsx:56` combines names into one string, uses an alternate empty message and omits “How we address you across Travella.” Missing individual name fields therefore are not identified as Not provided. `AccountSecurity.jsx:106` renders only the password action, omitting the contracted descriptive summary. Add the declared context and per-field empty labels; only claim Password is set if capability/data actually supports it.
- Preference save, uncertainty and conflict copy matches the contract (`AccountSettingsPage.jsx:117`–128, 169–178). Needs summaries preserve multiline values; zero interests and citizenships are explicit (`PreferenceSettings.jsx:90`–95). Generic Cancel is intentional per contract, not a defect.

### Pillar 2: Visuals (3/4)

- **WARNING V1:** `AccountSettingsPage.jsx:159`–168 uses Unicode branding/theme glyphs, a hollow circle for missing identity and no local setting SVGs. The design system specifies local 20px outline SVGs and a neutral person icon. Replace these glyphs with the existing icon approach, hiding decorative shapes from assistive technology. This is a minor fidelity issue, not a reason to redesign C.
- **WARNING V2:** Error markup at `AccountSettingsPage.jsx:170`, `AccountIdentity.jsx:50` and `AccountSecurity.jsx:104` has text but no required error icon. The simulated-conflict screenshot shows an accent-bordered box visually close to ordinary content. Add a small decorative error indicator alongside the explicit message; preserve alert semantics.
- Inspected desktop light/dark captures retain the 296px settings rail, adjacent detail area, clear title and single dominant edit action. Mobile captures retain the grouped selector, readable wrapping and natural vertical scrolling. Production appropriately removes fictional identity, prototype toolbar and illustrative map. The larger mobile header follows the granted responsive/hit-target discretion.

### Pillar 3: Color (3/4)

- **WARNING CO1:** `account.css:8` applies the 3px accent focus ring only to buttons, anchors and form controls. Programmatically focused headings and alerts (`AccountSettingsPage.jsx:63`–67, 168–170) are excluded. All ordinary summary captures show a browser-default blue/light outline around the heading, rather than the specified accent ring. Include focusable headings/alerts in the scoped focus selector without suppressing visible focus.
- Token declarations at `account.css:1`–2 match the light/dark contract. Accent references occur in eight rule groups: focus, active header, selected airport, selected interests, map pin, primary button, alert and token definition. Visible accent remains concentrated in primary actions and small indicators; no large accent surface or apparent overuse occurs. Neutral page/navigation and secondary panel areas preserve C's intended balance; no exact pixel-area 60/30/10 measurement is claimed.
- Input boundaries use the stronger muted token (`account.css:9`), not decorative dividers. Hardcoded shadow/backdrop colors at lines 19, 25 and 74 are neutral effects, not arbitrary new semantic colors.

### Pillar 4: Typography (3/4)

- **WARNING T1:** The explicit account CSS uses exactly 14, 16, 24 and 32px and weights 400/600, but does not normalize `strong`. `PreferenceSettings.jsx:63` renders a legacy-interest `strong` element, allowing the browser's bolder weight (normally 700) outside the declared two-weight scale. Scope `strong,b` to 600 inside the account surface; review reused field markup under the same rule.
- Captured headings, labels, helper text and inputs remain readable in both themes and on mobile. The prototype's small metadata has correctly been enlarged. No new font dependency was introduced. Recovery text remains ordinary selectable 16px text; monospace was permitted, not mandatory.

### Pillar 5: Spacing (4/4)

- **PASS S1:** `account.css:20`, 25, 33 and 79 implement the 1136px outer maximum, 296px rail, 32px detail padding, 760px switch, 16px mobile gutters and 24px mobile detail padding. Shared controls have 44px minimum targets and 16px input padding (lines 5, 9). Related gaps use 4/8/16/24/32/48px tokens; custom dimensions such as map height are content dimensions, not spacing violations.
- Desktop/mobile captures show no overlap, clipped controls or fixed overlay. The execution record additionally reports all nine settings selected at 320px without horizontal page overflow. No spacing correction recommended. This score is based on the inspected states plus source; there is no separate tablet screenshot in the supplied evidence.

### Pillar 6: Experience Design (2/4)

- **WARNING E1 — priority:** `AccountSecurity.jsx:79`–85 calls `mutate()` immediately when fresh verification completes; the form's final action is generic Continue (`:134`). The explanatory warnings (`:120`–122) do not supply the specified “Turn off two-factor authentication?” / “Replace recovery codes?” confirmation with safe and consequential action labels. The existing initial action and warning mean this is not a silent mutation, but it is a meaningful contract gap for irreversible invalidation. Add explicit confirmation, including replacement-authenticator wording, before the corresponding operation. Validate with isolated fixtures, not shared-account changes.
- **WARNING E2 — priority:** `AccountSettingsPage.jsx:27,52` represents both pending and failed account reads as null and swallows non-401 read errors. `AccountIdentity.jsx:48` immediately shows a load error during loading; `AccountSecurity.jsx:105` has Status unavailable with no Retry. Implement the declared loading status/skeleton and per-setting recovery while keeping preference editing available.
- **WARNING E3 — priority:** `AccountIdentity.jsx:34`–38 refreshes canonical names after a conflict but clears the conflict without displaying those latest values. The edited form still shows only the retained draft (`:51`–55), so “Review latest details” does not let the traveler actually compare them before overwriting. Render the latest saved fields and “Your unsaved changes”, using the preference conflict pattern already implemented at `AccountSettingsPage.jsx:174`.
- **WARNING E4:** Name/email editor entry and error rendering lack focus refs/effects (`AccountIdentity.jsx:50`–56, 127–142). The parent only reacts to selected setting or preference draft (`AccountSettingsPage.jsx:63`), not these internal editor stages. Focus the first input or editor heading on stage entry and associate/focus validation feedback. Password mismatch already implements useful focus and error association (`AccountSecurity.jsx:31,129`).
- **WARNING E5:** The mobile selector disables only for ordinary `busy`, whereas desktop navigation disables for `busy || identityBusy` (`AccountSettingsPage.jsx:165`–166). The guard prevents sensitive navigation, so this does not cause an extra write, but the mobile control remains misleadingly operable during sensitive submission. Use the same pending condition.
- Positive evidence: ordinary Save uses section-scoped payloads, revision/event receipts, pending disabling, retained failed drafts and same-attempt reconciliation. Conflict latest data does not replace preference drafts. Native discard dialog focuses the safe action and restores focus. Real Chrome evidence documents save/readback/reload, dirty keep/discard, empty saves, selected-Plan return/history, theme and keyboard checks. Sensitive forms clear transient data and code disclosure has an exit guard. No new backend-security conclusion is inferred from this UI audit.

## Evidence and Limits

- Applied the mandatory `docs/skills/travella-testing/SKILL.md` requirements to the supplied completed execution evidence; selected C was already approved, so no new prototype choice was opened.
- Reviewed [verification record](../../../artifacts/testing/2026-10-06-account-settings/verification.md), all five phase summaries and phase planning/context materials. The record separates real persistence/browser checks from simulated 422/409/lost-response transport and isolated provider fixtures.
- Opened all seven [implementation captures](../../../artifacts/testing/2026-10-06-account-settings/implementation/) and selected-C light/dark desktop/mobile plus inline-editor captures under [planning evidence](../../../artifacts/testing/2026-10-05-account-prototypes/plan/).
- Read-only server detection: localhost 3000 unavailable, 5173 returned 200, 8080 unavailable; canonical 5174 returned 200. No new screenshots were captured; the existing authenticated Chrome evidence was reused as explicitly dispatched. No new screenshot files or binary storage changes were made.
- The generic `.planning/ui-reviews/.gitignore` capture gate was not created because this dispatch permits writing only this report and takes no new captures. Existing project evidence remains in its mandated artifacts path. No claim is made that those existing artifacts are ignored.
- Sensitive successful email/password/MFA operations remain fixture-tested rather than live shared-account mutations, as required by the phase. Broader existing frontend/Python regression failures remain documented debt, not erased by this score.
- No `components.json` exists at root or frontend; no third-party registry blocks are declared. Registry audit is not applicable.

## Files Audited

- `frontend/src/features/account/AccountSettingsPage.jsx`
- `frontend/src/features/account/AccountIdentity.jsx`
- `frontend/src/features/account/AccountSecurity.jsx`
- `frontend/src/features/account/PreferenceSettings.jsx`
- `frontend/src/features/account/account.css`
- `frontend/src/AccountApp.jsx` (route/loading integration)
- `frontend/src/styles.css` (global typography check)
- Phase 13 UI-SPEC, CONTEXT, PLAN and SUMMARY documents
- `artifacts/testing/2026-10-06-account-settings/verification.md` and the twelve images identified above

**Recommendation count:** 3 priority fixes; 8 additional minor recommendations (C1, C2, V1, V2, CO1, T1, E4, E5). No BLOCKER finding; warning findings should be resolved before declaring full UI-contract conformance.
