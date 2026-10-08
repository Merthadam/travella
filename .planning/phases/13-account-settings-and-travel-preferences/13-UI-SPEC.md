---
phase: "13"
slug: "account-settings-and-travel-preferences"
status: approved
shadcn_initialized: false
preset: none
created: "2026-10-06"
---

# Phase 13 — UI Design Contract

Canonical production contract for ACCOUNT-13-01 through ACCOUNT-13-06. User selected prototype C. Preserve its settings list, adjacent inline editor, grouped mobile selector and green light/dark palette. Implement real account state; exclude variant controls, fictional records, illustrative maps, simulated verification and debug state.

## Design System

| Property | Value |
|---|---|
| Tool | none; existing manual React/CSS system |
| Preset | not applicable |
| Component library | existing native React components; no new UI package |
| Icon library | existing local outline SVGs; 20px icons, decorative icons hidden from assistive technology |
| Font | Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif |
| Gate disposition | No components.json found. Approved C and upstream reuse decisions retain the manual system; do not reopen selection or initialize shadcn. |

Sources: 13-CONTEXT.md locks the design, scope and Save/Cancel behavior; 13-RESEARCH.md and 13-PATTERNS.md establish canonical data, identity capabilities and reuse. C's JSX/CSS and inspected screenshots establish layout and palette. Exact spacing, readable type, focus and fallback behavior below are implementation defaults within the granted accessibility discretion.

No packaged design-system inventory applies. Reuse the account-relevant behavior of `HomeStep`, `CitizenshipStep`, `NeedsStep`, `InterestsStep`, `GoogleAddressSearch`, `HomeLocationMap` and catalogs under `frontend/src/features/onboarding/`. Extract or parameterize their fields and controls; account styling and copy must not import onboarding progression, animated interest bubbles or the five-interest minimum.

## Spacing Scale

| Token | Value | Usage |
|---|---|---|
| xs | 4px | Compact label/icon separation |
| sm | 8px | Chips, related controls and heading/description gap |
| md | 16px | Field gaps, mobile page gutter and navigation padding |
| lg | 24px | Mobile panel padding, field groups and section separation |
| xl | 32px | Desktop panel padding and page-heading separation |
| 2xl | 48px | Page start and end breathing room |
| 3xl | 64px | Wide-screen header navigation separation |

Exceptions: 44px minimum hit area in both dimensions for buttons, links, selectable chips, icon controls and inputs; 16px input padding; 32px desktop detail horizontal padding. All are multiples of four. Borders 1px, focus outline 3px and 2px offset are strokes, not spacing tokens. Use 8px control radius, 12px inner-card radius and 16px workspace radius.

## Typography

| Role | Size | Weight | Line height |
|---|---|---|---|
| Body and field input | 16px | 400 | 1.5 |
| Label, navigation and button | 14px | 600 | 1.5 |
| Helper, metadata and status | 14px | 400 | 1.5 |
| Setting heading | 24px | 600 | 1.2 |
| Page heading | 32px | 600 | 1.2 |

Exactly four sizes (14, 16, 24, 32px) and two weights (400, 600). Group kickers use label styling; do not retain the prototype's 8–12px copy. Keep this scale at mobile widths; allow headings to wrap. Recovery-code text may use the system monospace family at 16px/400. Do not load a new web font.

## Color

| Role | Light | Dark | Usage |
|---|---|---|---|
| Dominant (60%) | #f7f8f2 | #111b17 | Page and settings navigation surface |
| Secondary (30%) | #ffffff | #192620 | Header, detail panel and inputs |
| Accent (10% maximum) | #2f694d | #b3d59b | Primary edit/save/verify action, active indicator, focus, selected-control border and success icon |
| Text | #233f35 | #e6ecdf | Headings and ordinary content |
| Muted text | #67766b | #a3b4a7 | Supporting copy and group labels |
| Divider | #dfe5da | #34453a | Panel separation and nonessential borders |
| Control boundary | #67766b | #a3b4a7 | Input and unselected interactive-control boundaries |
| Soft surface | #eff3e9 | #22332a | Secondary fact boxes |
| Selected surface | #e8efdf | #2c4232 | Active setting and selected chips |
| Destructive | #a12e35 | #ffb4ab | Discard, disable authenticator and replace-code confirmation actions only |

Accent reserved for the listed elements and small matching section icons; neutral navigation and secondary actions remain text colored. Accent button text is #ffffff in light mode and #192620 in dark mode. Error feedback uses explicit text and an error icon, not destructive styling alone. Aim for the C surface balance; never add large accent backgrounds. Controls must remain distinguishable without color. Preserve text contrast of at least 4.5:1 and control/focus contrast of at least 3:1; use the stronger control boundary token instead of the decorative divider for inputs.

## Layout, Navigation and Appearance

- Desktop above 760px: 84px header; centered content with maximum outer width 1136px and 24px gutters. Workspace grid is 296px settings column plus `minmax(0, 1fr)` detail column. Main heading precedes the workspace by 24px; detail padding is 32px vertically and 32px horizontally. Use C's restrained border and shadow.
- At 760px and below: one column; hide desktop settings navigation entirely. Put a labeled native select, “Choose a setting”, at the top of the workspace with optgroups “Personal details”, “Travel preferences”, “Security”. Use 16px page gutters and 24px panel padding. Stack fact/name columns and action rows when needed. At 320px, wrap the header to retain 44px targets; no horizontal page scrolling. Allow natural page scrolling, with no fixed footer overlay.
- Header retains Travella, “My plans”, active “Account”, and Light/Dark controls. Theme icons may replace visible text on mobile, but retain “Light mode”/“Dark mode” accessible names and pressed state. The account title is “Account & preferences”; supporting copy is “Small details. Better journeys.”
- Default setting is Home base. The desktop order and grouped mobile order match the nine-setting table below. Display actual canonical name/initials; missing name uses “Your traveler profile” and a neutral person icon, never a sample identity.
- The authenticated account route survives reload and supports browser back/forward. Account navigation must not start MFA enrollment. “My plans” and back return to the prior internal Plans route and selected Plan; direct account entry falls back to the Plans list. Never include account values in route parameters. Preserve Plans state without altering its data or styling.
- Theme applies only within the account surface. Store only `light` or `dark` under a device-local account theme key. Initial fallback: valid stored choice, then system color preference, then light. Catch unavailable/malformed storage; keep the chosen theme in memory without blocking editing. Restore any document-level color-scheme override on unmount. Theme changes neither save travel preferences nor discard edits.
- Home detail shows canonical city/address and airport. Use the real map only when resolved location data is available, with required provider attribution. When absent/manual/unavailable, render the textual facts and truthful map state. Never position a fabricated marker or reuse C's decorative sample map as geographic evidence.

## Copywriting Contract

| Element | Copy |
|---|---|
| Ordinary primary CTA | “Save changes”; pending: “Saving…” |
| Ordinary secondary CTA | “Cancel” |
| Generic empty heading | “Not provided” |
| Generic empty body | “Add this detail when you're ready.” |
| Profile-use note | “These preferences help shape future suggestions. Your confirmed Plan details will not change.” |
| Load failure | “We couldn't load this setting. Try again.” / “Retry” |
| Save failure | “We couldn't save your changes. Your edits are still here. Try again.” / “Save changes” |
| Validation summary | “Check the highlighted fields and try again.” |
| Unknown ordinary save result | “We couldn't confirm whether your changes were saved. Check the saved details before trying again.” / “Check saved details” |
| Revision conflict | “These preferences changed in another session. Review the latest saved details before saving again.” / “Review latest details” |
| Dirty confirmation | “Discard unsaved changes?” / “Your changes to this setting haven't been saved.” / “Keep editing” / “Discard changes” |
| Session expiry | “Your session has expired. Sign in again to continue.” / “Sign in” |
| Fresh-verification prompt | “Confirm it's you” / “Enter your current password to continue.” / “Continue” |
| Invalid verification | “We couldn't verify those details. Check them and try again.” |
| Expired verification | “Verification expired. Confirm it's you again to continue.” / “Verify again” |
| Invalid or expired code | “This code is invalid or expired. Check the code or request a new one.” |
| Throttle | “Too many attempts. Please wait before trying again.” |
| Sensitive result unknown | “We couldn't confirm the result. Check your account status before trying again.” / “Check account status” |
| Disable confirmation | “Turn off two-factor authentication?” / “You won't need an authenticator code to sign in.” / “Keep it on” / “Turn off authenticator” |
| Replace authenticator confirmation | “Replace your authenticator?” / “Your current authenticator will stop working when the new one is verified.” / “Keep current authenticator” / “Replace authenticator” |
| Rotate confirmation | “Replace recovery codes?” / “Your previous recovery codes will stop working. Save the new codes somewhere private.” / “Keep current codes” / “Replace recovery codes” |

### Nine settings: exact content and controls

| Group / setting | Read and empty states | Editor and actions | Acknowledged result / failure detail |
|---|---|---|---|
| Personal details / Your name | Actual given and family names; missing fields: “Not provided”. “How we address you across Travella.” | “Edit your name”; “First name”, “Last name”, both required; name autocomplete; Save changes/Cancel | “Your name was saved.” Only update identity and avatar from canonical readback. Empty field: “Enter your first name.” / “Enter your last name.” |
| Personal details / Email address | Current canonical address and verified status. Pending address must be explicitly labeled “Awaiting verification”. | If capable: “Change email address”, fresh verification, “New email address”, “Send verification code”, “Verification code”, “Verify email address”, “Resend code”. Current unsafe deployment: “Email changes are unavailable right now. Your current email address is unchanged.” with “Check availability”; no enabled initiation or code form. | “Your email address was updated.” only after exact new verified address is read back. Pending: “Enter the code sent to your new address. Your current email stays in use until verification is complete.” Never substitute signup confirmation. |
| Travel preferences / Home base | Saved address/city/country and preferred airport code/name. Missing home: “No home base saved”; airport: “No preference”. “Your usual starting point. You can choose another for any trip.” | “Edit home base”; shared address search and manual full address/city/country fallback; shared airport search/catalog/map and explicit airport selection. “Clear selected airport” and “I'll choose an airport later” set null in draft. Save changes/Cancel | “Your home base was saved.” Preserve existing home validation and lookup errors. On draft home change, explicitly disclose airport clearing and require Save; home itself remains required. Map failure never erases the saved home. |
| Travel preferences / Citizenships | Country names from canonical codes, wrapping chips; zero: “No citizenships added”. “Add the countries you hold citizenship in. This is optional.” | “Edit citizenships”; shared country search, selected list and per-country remove buttons. “Clear citizenships”; up to 10, zero allowed. Save changes/Cancel | “Your citizenships were saved.” Search empty: “No matching countries. Try another name or country code.” Limit: “You can save up to 10 citizenships.” |
| Travel preferences / Food & accessibility | Separate labeled food/accessibility values, each “Not provided” when empty; retain line breaks. | “Edit food & accessibility”; “Food preferences & allergies” and “Accessibility needs”, each optional multiline text, max 1000 characters. “Share as much or as little as you like. Clear a field to remove it.” Save changes/Cancel | “Your food and accessibility preferences were saved.” Empty strings explicitly remove existing values; do not silently omit them from writes. |
| Travel preferences / Your interests | Curated labels and custom interests as wrapping chips; zero: “No interests selected”. | “Edit your interests”; canonical catalog, selected pressed state, custom input max 60 characters, “Add interest”, per-item remove, “Clear all interests”. “Choose any that feel like you. There's no minimum.” Save changes/Cancel | “Your interests were saved.” Counts: “No interests selected”, “1 interest selected”, “{n} interests selected”. Duplicate: “That interest is already selected.” Preserve existing maximums/normalization; no progress meter or onboarding minimum. |
| Security / Password | “Password is set” only when supported by account capability; no fabricated last-changed date. “Update the password you use to sign in.” | “Change password”; current password, new password, confirm new password; autocomplete current-password/new-password; show actual safe server password-policy text. “Save password”/Cancel; optional reveal controls have explicit labels. | “Your password was changed.” only on acknowledged provider operation. Mismatch: “Your new passwords don't match.” Wrong current password: “Your current password is incorrect.” Clear secret fields after submission outcome; never replay an uncertain change automatically. |
| Security / Two-factor authentication | Canonical “On · Authenticator app”, “Off”, or “Status unavailable”. Unknown is never Off. | Off: “Set up authenticator”; On: “Replace authenticator”, “Turn off authenticator”. Require fresh verification, existing factor challenge when applicable, enrollment QR/manual key and “Authenticator code”; “Verify authenticator”/Cancel. No immediately effective toggle. | “Your authenticator is on.” only after verification, activation and canonical readback; disable success: “Your authenticator is off.” Partial result: shared unknown-result message with Check account status. Policy block: “Authenticator changes are unavailable right now.” |
| Security / Recovery codes | Safe server status/count: “No recovery codes available”, “1 code remaining”, “{n} codes remaining”; unknown: “Status unavailable”. Never list old plaintext codes. “Manage your backup sign-in codes.” | “Generate recovery codes” or “Replace recovery codes”, fresh verification and replacement confirmation. One-time disclosure only after server commit; “Copy codes”, “I've saved my codes”. If capability requires MFA: “Set up an authenticator before generating recovery codes.” with “Set up authenticator”. | “New recovery codes were generated. Save them now; you won't be able to view them again.” Copy success only after clipboard succeeds; failure: “Couldn't copy the codes. Select and copy them manually.” Lost response: reconcile status and offer explicit new rotation, never automatic rotation or plaintext recovery. |

Unknown capability failures are specific to their setting; preference editing remains available when identity/security operations are unavailable. Cancellation after sending an email closes the editor but must not claim the sent code was revoked. Pending intent is reconciled on reload. Display “Verification pending” and “Continue verification” only when the server says the current session can resume that exact intent.

## Editing and Interaction Contract

1. Read state and edit state occupy the same detail region. Selecting a setting alone performs no mutation. Edit clones that section's last acknowledged values; entering edit mode focuses its heading or first field. Save commits only that section. Cancel restores its saved summary; dirty Cancel uses the discard confirmation.
2. Keep one active editor. Guard desktop selection, mobile selection, My plans, browser back/forward and in-app route changes when the draft differs from the saved state. Hold the intended destination until confirmed; “Keep editing” restores focus and selection. Native unload protection covers reload/close where browsers support it. An unchanged editor leaves without warning.
3. While submitting, disable duplicate submission and mutation controls, expose `aria-busy`, keep values visible and show pending text. Do not offer a Cancel that implies an in-flight server write was undone. Preserve the submitted ordinary draft until the outcome is reconciled. Saved summaries and success messages only use acknowledged canonical response/readback.
4. On ordinary validation/network failure retain draft and focus useful error feedback. Safe identical preference retry retains its event identifier and submitted revision; editing payload creates a fresh attempt. On conflict fetch latest saved data without replacing the draft. Present current saved values and “Your unsaved changes”; require explicit review and a new Save against the refreshed revision. No automatic merge or overwrite.
5. If an ordinary result is uncertain, Check saved details/replay reconciliation resolves the original attempt before another write. If it succeeded, show the canonical saved value once. For credentials, factors and code rotation, use status reconciliation and an explicit new operation; never blind retries.
6. Ordinary drafts stay in current page memory only. No account data, passwords, codes, QR secrets or email values in local/session storage, URLs, logs or diagnostic panels. At auth expiry stop requests, clear sensitive forms and pending proofs, hide private account content and show Sign in. Ordinary memory drafts may resume only after the same verified identity returns, with fresh revision review; clear them on sign-out, identity change or page teardown. Do not promise recovery after reload.
7. Fresh verification belongs to the existing signed-in session; it must not invoke sign-out/sign-in replacement. Only server-advertised steps advance the editor. Password/current TOTP errors remain generic or approved safe field messages. Clear verification secrets after each outcome, cancellation, setting exit, expiry and unmount.
8. Enrollment secrets/recovery codes are a dedicated transient disclosure, not ordinary profile values. QR has a textual setup alternative; codes can be selected by keyboard. Before closing unsaved one-time codes, show “Have you saved your recovery codes?” with “Go back” and “Close codes”; closing clears them. Never capture real secret material in screenshots.
9. All buttons/fields have visible labels or explicit accessible names; remove controls include the item name. Selected navigation uses `aria-current`; chips/theme controls use pressed state. Use native keyboard behavior for the grouped selector and proper combobox semantics for search. Do not intercept ordinary arrow keys globally.
10. Keep a visible 3px focus ring; logical tab order is header, section selection, detail, actions. Selection announces/focuses the detail heading without trapping focus. Validation associates messages using `aria-describedby`/`aria-invalid` and focuses the first invalid field; save status uses a polite live region. Confirmation dialogs trap focus, label title/body, initially focus the safe action, support Escape as Keep editing/Cancel, and restore focus on close. Reduced-motion users get no decorative animation.

## UI Considerations

Applicable state considerations resolved: 12 covered, 0 backstop, 0 unresolved. “Covered” denotes explicit implementation requirements, not executed production verification. Copy is defined above.

| Category | Element(s) | Status | Resolution / Reason |
|---|---|---|---|
| empty | Optional preferences and missing names/home | ✅ covered | Render table-specific empty labels and real edit actions; preserve explicit clear values; required home/name validation remains enforced. |
| loading | Initial account/profile read | ✅ covered | Keep header/navigation usable; selected detail shows stable skeleton and “Loading account details…” status. No editable demo defaults or empty-state flash. |
| loading | Places, airport catalog and submissions | ✅ covered | Retain selected values; show current operation status, disable duplicate submits and ignore obsolete lookup responses. |
| error | Account/profile fetch | ✅ covered | Show local load-error row with Retry; distinguish unavailable setting from empty saved value and allow independently loaded sections. |
| error | Save, stale revision and unknown result | ✅ covered | Apply draft retention, reconciliation and explicit conflict-review requirements before another write; use copy contract rows. |
| error | Auth, capability and verification | ✅ covered | Fail closed with specific blocked/expiry/invalid-code/throttle states; no counterfeit success, factor status or email activation. |
| populated | Home, citizenships, needs, interests, identity | ✅ covered | Display canonical values and real controls in C detail panel; saved response updates corresponding summary only. |
| partial | Missing optional fields, legacy profile or failed map restore | ✅ covered | Render each available value independently; unknown/legacy values remain reviewable; label manual/unverified map state and retain textual home. |
| overflow | Country/airport results, chips and navigation | ✅ covered | Wrap chips and navigation text; bounded result containers scroll with visible keyboard focus; page and editor grow vertically without clipping. |
| zero-one-many | Citizenship, interest and code counts | ✅ covered | Explicit zero/singular/plural labels; one item retains full hit targets; maximum valid lists wrap and remain removable. |
| long-text | Names, email, address, needs and custom interests | ✅ covered | `min-width:0`, `overflow-wrap:anywhere`, multiline needs and fluid columns; no fixed-height truncation of saved values or error text. |
| partial | Provider operation succeeded but local response incomplete | ✅ covered | Preserve honest pending/unknown status, Check account status and server reconciliation; no success claims or automatic repeat of sensitive operations. |

## Registry Safety

| Registry | Blocks used | Safety gate |
|---|---|---|
| None | None | Not applicable: no shadcn or third-party registry components added. |

## Evidence and Delivery Gates

Planning evidence already produced with Chrome DevTools for selected C: [desktop light](../../../artifacts/testing/2026-10-05-account-prototypes/plan/c-light.png), [desktop dark](../../../artifacts/testing/2026-10-05-account-prototypes/plan/c-dark.png), [mobile light](../../../artifacts/testing/2026-10-05-account-prototypes/plan/c-light-mobile.png), [mobile dark](../../../artifacts/testing/2026-10-05-account-prototypes/plan/c-dark-mobile.png), [inline editor](../../../artifacts/testing/2026-10-05-account-prototypes/plan/c-dark-home-editor.png), [prototype verification](../../../artifacts/testing/2026-10-05-account-prototypes/verification.md). Prototype evidence proves the selected visual direction and simulated interactions only. This contract inspected the light/dark desktop and mobile-light captures; production checks remain execution deliverables.

Follow `docs/skills/travella-testing/SKILL.md` before execution and delivery: authenticated example-account Chrome checks, all nine setting states, keyboard/dirty guards, desktop/mobile both themes, save/readback/reload for ordinary preferences, prior selected Plan return, console/network review and inspected screenshots. Exercise HTTP handlers against a test database for persistence, clearing, ownership and concurrency. Preserve unrelated fields and onboarding completion; verify future suggestions observe clear values without mutating existing Plans. Store sanitized execution evidence under `artifacts/testing/<date>-account-settings/`.

Current safe email initiation is blocked by deployment configuration per RESEARCH; test the unavailable view and safe conditional flow with isolated fixtures. Do not alter the shared example account's email/password/MFA or change AWS settings for verification. Secret-changing provider fixtures and unverified live recovery limitations must be reported separately from browser and CRUD results. No production verification is claimed by this UI-SPEC.

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS
- [ ] Dimension 2 Visuals: PASS
- [ ] Dimension 3 Color: PASS
- [ ] Dimension 4 Typography: PASS
- [ ] Dimension 5 Spacing: PASS
- [ ] Dimension 6 Registry Safety: PASS
- [ ] Dimension 7 Inventory Provenance: PASS (not applicable with Tool: none)

**Approval:** pending
