---
phase: "02"
slug: "draft-plans-durable-lifecycle"
status: draft
shadcn_initialized: false
preset: none
created: "2026-09-27"
---

# Phase 2 — UI Design Contract

Visual and interaction contract for My plans, Recently deleted, and the Draft Plan lifecycle. This document is a planning prerequisite, not evidence of an implemented or user-approved visual design.

## Sources and Authority

- Locked behavior: `02-CONTEXT.md` D-01–D-12; `.planning/REQUIREMENTS.md` PLAN-01–PLAN-08, TRUST-01, TRUST-02, TRUST-05; Phase 2 of `.planning/ROADMAP.md`.
- Product and service baseline: `docs/user-stories/plan-lifecycle/README.md` and `docs/planning/mvp-phase-1-service-contracts.md`, especially authenticated entry, atomic creation, read-only open, last-view preference, deletion, and recovery. The older document's journey-stage numbers are not roadmap phase numbers.
- Existing implementation inspected: `frontend/src/styles.css`, `AccountApp.jsx`, `api.js`, `AccountApp.test.jsx`, and `frontend/package.json`.
- Visual reference inspected: `docs/planning/draft-plan-ui.jpg`. Carry forward the two-column card direction, rounded white surfaces, quiet metadata, and Recently deleted entry. The image's prototype commentary, destination photography, connectors navigation, itinerary, and manual builder do not establish Phase 2 functionality.
- Supporting context: `docs/screens/README.md`, `docs/screens/figma-make-context.md`, Phase 1 `01-CONTEXT.md` and `01-VERIFICATION.md`. Phase 1 live Cognito verification is still blocked; this contract neither resolves it nor authorizes provisioning.
- No Phase 2 RESEARCH.md existed at initial inspection. Transport/schema details belong to the technical research and plan. UI defaults below are derived implementation choices within the locked behavior, not additional traveler decisions.

## Design System

| Property | Value |
|----------|-------|
| Tool | none |
| Preset | not applicable |
| Component library | none; existing React and plain CSS with native HTML controls |
| Icon library | none; text actions, with optional inline decorative SVG hidden from assistive technology |
| Font | Inter, system-ui, sans-serif, inherited from existing CSS; no new font download required |
| Initialization gate | Existing React/Vite app has no components.json, Tailwind configuration, or component package. Continue the established plain-CSS stack under the planning scope; no installation or migration. |
| Source status | Palette and font inherited; phase-specific dimensions, typography consolidation, layouts, and copy below are reversible derived defaults. |

Scope new styling to the private lifecycle shell and its dialogs. Preserve the existing account access flow and controls. The private shell expands beyond the existing 560px account form without turning the auth form into a dashboard. There is no installed design-system component inventory to enumerate.

## Spacing Scale

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Badge inset, adjacent metadata |
| sm | 8px | Label-to-field, inline actions |
| md | 16px | Card content gaps, mobile page gutters |
| lg | 24px | Card/dialog padding, grid gap |
| xl | 32px | Desktop page gutters and section gaps |
| 2xl | 48px | Empty-state internal padding and major content breaks |
| 3xl | 64px | Header minimum height, desktop page top/bottom rhythm |

Exceptions: minimum pointer target 44px by 44px, derived for touch and keyboard usability; compact control padding 12px where required. Both remain multiples of 4. Structural 1px borders and the existing 3px focus outline are not spacing tokens. Use 16px card radius, 12px input radius, and the existing pill-shaped buttons. Avoid fixed card heights and fixed dialog heights.

## Typography

Exactly four font sizes and two weights in the Phase 2 surfaces:

| Role | Size | Weight | Line Height |
|------|------|--------|-------------|
| Body | 16px | 400 | 1.5 |
| Label / metadata | 14px | 400 for metadata; 600 for field labels, badge, and buttons | 1.5 |
| Heading | 20px | 600 | 1.2 |
| Display / page title | 28px | 600 | 1.2 |

Card titles and dialog headings use Heading. Page headings and the open Plan title use Display. Form values and confirmation values use Body. Use sentence case. Do not inherit the account screen's responsive 32–48px h1 or 700-weight rules into Phase 2. Render arbitrary titles as escaped text; no HTML/Markdown interpretation. Use `overflow-wrap: anywhere` for long names and values. Do not truncate exact names in confirmation or conflict comparison.

## Color

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | #f4f7f6 | Private page background and breathing room, inherited |
| Secondary (30%) | #ffffff | Cards, dialog, header, Conversation shell, inherited |
| Accent (10% maximum) | #146b5e | Primary New plan / Apply name / Restore plan actions, current navigation indication, inherited |
| Destructive | #9c342d | Delete plan control and destructive confirmation only |
| Primary text | #18333a | Headings, names, body, inherited |
| Secondary text | #5c706e | Supporting copy, activity/deadline labels, inherited |
| Border | #b4c9c5 | Card/field boundaries, inherited |
| Error foreground / background | #9c342d / #fff0ee | Semantic validation or request failures, inherited |
| Focus indicator | #4c9c8f | Existing 3px outline with 3px offset on all focusable controls |

The 60/30/10 split describes composition, not a requirement to paint exactly 10% green. Accent is reserved for the named primary actions and active navigation; it is not applied to every link, every card, or decorative backgrounds. Secondary navigation and Rename are neutral text/outlined actions. Draft status is a small neutral badge, not a success signal. Errors and destructive intent are always stated in text as well as color. Retain adequate contrast when disabling controls; never dim an entire card's explanatory text.

## Screen and Interaction Contracts

### Shared private shell

Use a full-width white header with a 1px lower border. Its content and page main content share a centered maximum width of 1120px. At widths of 768px and above, use 32px horizontal gutters and two equal grid columns with a 24px gap. Below 768px use one column, 16px gutters, and vertically stacked heading/actions when needed. Header content wraps; no horizontal page scrolling at 320px or at 200% zoom. The main content begins 32px below the header.

Header contains the Travella wordmark, My plans navigation, and the existing account security/sign-out controls. Do not introduce profile names, email display, connectors, search, tabs for completed trips, or a new account-management experience. Provide a keyboard-visible skip link to main content. Each screen has one h1; move focus there after navigation once its authorized content is ready. Mark the active navigation link with `aria-current="page"`.

### My plans

Heading row: My plans, supporting most-recent-activity explanation, and one primary New plan button. Keep New plan in the same location for zero, one, or many Plans. In the empty state, the body points to this button instead of adding a duplicate primary CTA.

Render a semantic list of white Plan cards in backend-provided activity order; do not sort by title or conflate a content revision with an open event. Each card contains, in order: Draft plan badge; title as an Open plan link; destination summary when supplied or No destination yet; Last active timestamp; and visible Rename / Delete controls. Use card padding 24px. Separate the title link from action buttons: never nest buttons in a clickable card or require hover to reveal actions. Distinguish duplicate titles through activity metadata and individually associated action labels; the opaque Plan ID is not displayed.

No destination image is required. This phase has no authoritative media source; omit image bands rather than inventing travel imagery or fetching destination photographs. Do not render empty image placeholders. Do not invent requirements readiness, dates, traveler counts, or trip prices.

The full-width Recently deleted entry follows the grid or empty state, separated by 32px. It includes explanatory recovery copy and a View recently deleted link. Show a count only when the server supplies an authoritative total; use 1 plan versus N plans. A failed or unloaded count is omitted, never shown as zero. The entry remains available when no Plans are active.

If the response has `nextCursor`, show a neutral Load more plans button after the cards, before Recently deleted. Retain already loaded authorized cards on next-page failure, show a local error, and retry the failed cursor without duplicates. Full refresh replaces the accumulated list with a fresh ordered snapshot; do not merge old pages into a new ordering. Search/filter controls and infinite scrolling are unnecessary in this phase.

### Create and open the Conversation shell

New plan is the exact traveler confirmation for creating one empty Draft Plan and one linked Conversation. Do not add a destination form, choice screen, or creation dialog. Set the initiating button to Creating plan… immediately; disable duplicate initiation. Open the linked Conversation only after the atomic success projection. The derived initial automatic title is Untitled plan. Failed pre-commit creation must not add a phantom card.

The Plan shell contains Back to My plans, its saved title, Draft plan badge, Rename / Delete actions, a Conversation heading, and the empty Conversation explanation. No composer, fake messages, typing indicators, Start research button, workspace tab, map, or agent call is added in Phase 2. The blank shell makes the persisted Conversation identity resumable without pretending conversational research exists.

Open reads the current authorized Plan without mutation. A deliberate successful open separately records activity through the authorized operation established by research (D-09); list polling, prefetch, focus refresh, and passive GET do not count as opens. Content changes and explicit opens move the Plan up according to the server's activity ordering. If activity recording fails while the Plan read succeeds, keep the valid shell visible and offer a scoped retry; do not claim the order was updated.

Resolve the server's saved resume target against currently implemented valid views. In this phase Conversation is the usable fallback for unavailable Planning Canvas. Show a quiet fallback notice only when an unavailable saved view caused the fallback. Preserve last-view preference through its separate authorized operation when an actual view choice exists; do not implement a fake Canvas or rewrite durable preferences from a passive GET.

### Rename and exact apply

Rename opens a native modal dialog (maximum width 560px, viewport gutters 16px, padding 24px) with heading Rename plan, the current saved name, labeled Plan name input, normalized exact-name preview, Cancel, and primary Apply name. Pre-fill the current name. The initial focus is the input with the current text selected. Clicking outside does not apply. Escape and Cancel discard this draft and return focus to the initiating control.

Derived input contract, shared with technical planning: normalize Unicode to NFC, trim outer whitespace, reject blank names, control characters and names longer than 120 Unicode code points after normalization. Do not silently truncate. Native HTML `maxlength=120` counts UTF-16 units and is insufficient for this contract; validation/counting must handle supplementary Unicode characters. Show a character count and preview the actual normalized value that Apply name will authorize. On invalid submission, retain entered text, announce the inline error, and focus the field. Do not submit invalid input or save on blur/Enter outside the explicit form submission.

Apply name is the confirmation for exactly the displayed value and current revision; bind any server challenge internally without adding a second confirmation dialog. Lock the submitted value while pending, label the action Applying name…, and update the card/header only from an authoritative response. A successful manual rename establishes manual provenance even when the traveler deliberately keeps the existing automatic text.

On revision conflict, retain the unsaved input in this signed-in session. Keep the dialog open and show an inline comparison in order: Latest saved name (read-only current projection), Your name (editable retained draft), and Will be saved as (normalized exact preview). Announce the conflict once, focus the comparison heading, and require another explicit Apply name against the latest revision. Refetch or challenge expiry must never automatically apply the draft. Cancel adopts current saved state without mutating it. If a fresh projection cannot be loaded, retain the draft, disable Apply name, and offer Retry. If the Plan is now deleted, cease rename and use the authorized deleted-Plan recovery state; a missing/foreign Plan uses the generic unavailable state.

The D-12 retained rename draft is memory-only and is discarded, with all private projections/challenges, on involuntary re-authentication or sign-out. It is never restored from browser storage or a URL.

### Delete confirmation

Delete opens a dialog showing the full current Plan name, consequences, seven-day recovery explanation, Cancel, and Delete plan. The initial focus is Cancel. The deletion challenge must be bound to that exact Plan and current revision. Before commit, state the seven-day period; do not promise a browser-calculated future deadline. Only the committed response supplies the actual recovery deadline.

While deleting, label the action Deleting plan… and prevent duplicate submission. Do not remove the active card or replace the open shell until durable success is known. On success, return to My plans if necessary, remove the Plan from active results immediately, invalidate its open private content, and show the committed deadline in a persistent inline status with a Recently deleted link. Do not require a toast to carry the only recovery information.

A pre-commit failure leaves the Plan active. A transport timeout has unknown outcome: use the request-check copy and retry the same logical request, not a new deletion. A revision conflict invalidates the old confirmation, obtains the current projection, displays the current name and a conflict explanation, and requires fresh Delete plan confirmation. Challenge expiry similarly requires a refreshed review and a new explicit click; never auto-delete. No permanent-delete control is included.

### Recently deleted and restore

Use a separate Recently deleted page with Back to My plans and a one-column list of white cards. Each entry shows the full name, Deleted label, remaining recovery period, absolute server recovery deadline, and Restore plan. At desktop width, Restore plan may align right; below 768px it wraps below the information. Do not expose Rename, Open Conversation, or Delete again for deleted Plans.

Display deadlines using a semantic `time` element with the authoritative ISO timestamp and a localized absolute date/time including timezone. Show remaining whole days rounded down when at least one day remains, hours when under a day, and Less than 1 hour remaining below one hour. Never display 0 days remaining as if recovery were already unavailable. Derive remaining time from the server time/deadline contract; client time is presentation only. Refresh on focus and at an observed deadline. The server decides restore eligibility.

Restore plan directly authorizes restoration, with no additional dialog. Set Restoring plan… and prevent duplicates. Successful restore immediately opens the returned last valid view or Conversation fallback, preserving the original Plan/Conversation identity and latest consistent state. Invalidate active/deleted lists so back navigation shows the restored active Plan. Announce the restore in the opened shell. Do not stop at a success toast or list-only update.

If restoration succeeds but the follow-up open fails, distinguish this from restore failure: say the Plan was restored and offer Open plan / Back to My plans. Retrying open must not create or restore again. A failed uncommitted restore leaves the recoverable entry visible with Retry. An expiry or purge race removes the entry after authoritative rejection/refresh and announces that recovery has ended. Do not retain expired titles in a browser history list, countdown archive, or permanent-deletion audit UI.

### Recovery, freshness, and account boundary

Initial list/open load presents labeled loading text and non-interactive neutral skeletons, not an empty-data message. Use `aria-busy` on the affected region and announce concise status once. Retain only a complete previously authorized snapshot during a transient list-refresh failure; visibly mark it as potentially outdated and offer Retry. Disable Rename / Delete / Restore on that stale list until current state is fetched. Open may re-fetch an authorized current Plan. Never present mixed partial snapshot data as saved.

Retry of an indeterminate mutation reuses its request identity and exact payload. New intent after conflict or changed input uses a fresh reviewed request. Late responses from another screen, abandoned draft, older request generation, or previous session cannot replace current content. Delete/restore duplicate outcomes must be reconciled with current lifecycle state before navigation.

Deleted deep links show only an authorized deleted summary with the recovery deadline and Restore plan as the only lifecycle action, plus Back to My plans. Missing, expired, and foreign links use the same safe unavailable message without another traveler's name or existence. On involuntary re-authentication, clear private lists, title drafts, challenges, cached snapshots, and in-flight response ownership; keep only the safe internal return destination. After sign-in, reauthorize that destination, otherwise use My plans. Normal sign-out routes the next deliberate sign-in to My plans. Do not weaken existing MFA gating or expose Plan UI before a real authenticated session is established.

Automatic title compatibility (D-04/D-10): future context-derived title proposals can change an automatic title only when the related traveler confirmation shows the resulting name alongside the related change. One confirmation covers both; manual names remain authoritative. Phase 2 does not generate an intent or destination to exercise this contract and does not add a separate title suggestion workflow.

## Copywriting Contract

Placeholders below are escaped authorized values; they are not literal UI strings. Keep technical errors, revisions, IDs, and confirmation tokens out of traveler-facing copy.

| Element | Copy |
|---------|------|
| Primary CTA | New plan |
| My plans supporting text | Your draft plans, most recently opened or changed first. |
| Empty active heading | No plans yet |
| Empty active body | Choose New plan to save your first draft. |
| Initial title | Untitled plan |
| Missing destination | No destination yet |
| Activity | Last active {relative time}; expose exact localized timestamp with timezone on focus/accessible description |
| Recently deleted entry heading | Recently deleted; append · 1 plan or · {count} plans only with an authoritative total |
| Recently deleted entry body | Restore deleted plans for up to seven days. |
| Recently deleted entry action | View recently deleted |
| Empty deleted heading | No recently deleted plans |
| Empty deleted body | Plans you delete appear here for seven days. |
| List loading | Loading your plans… / Loading recently deleted plans… |
| List load error | We couldn’t load your plans. Try again. / We couldn’t load recently deleted plans. Try again. |
| Stale list notice | This list may be out of date. Retry to see your latest plans. |
| Next-page failure | We couldn’t load more plans. Your current list is still here. Try again. |
| Retry | Retry |
| Create known failure | We couldn’t create your plan. No plan was saved. Try again. |
| Mutation unknown outcome | We couldn’t confirm the result. Retry to check your request. |
| Open loading / failure | Opening plan… / We couldn’t open this plan. Try again or return to My plans. |
| Generic unavailable | This plan isn’t available. Return to My plans. |
| Conversation empty heading | Your draft is saved |
| Conversation empty body | This plan has its own Conversation. Conversation research isn’t available yet. You can rename your plan or return to My plans. |
| Saved-view fallback | Your previous view isn’t available. We opened Conversation instead. |
| Activity-write failure | Your plan is open, but we couldn’t update its place in My plans. Try again. |
| Rename heading / field / preview | Rename plan / Plan name / Will be saved as |
| Rename primary / pending | Apply name / Applying name… |
| Name validation | Enter a plan name. / Use 120 characters or fewer. / Remove unsupported control characters. |
| Name counter | {count} of 120 characters |
| Rename conflict | This plan changed since you opened it. Review the latest saved name and apply your name again. |
| Conflict labels | Latest saved name / Your name / Will be saved as |
| Rename error | We couldn’t rename this plan. Your entered name is still here. Try again. |
| Rename success | Plan name updated. |
| Delete heading | Delete plan? |
| Delete confirmation | Delete “{title}”? This removes the plan from My plans. You can restore it from Recently deleted for seven days. After that, its saved data will be permanently removed. |
| Delete actions | Cancel / Delete plan |
| Delete known failure | We couldn’t delete this plan. It is still in My plans. Try again. |
| Delete conflict | This plan changed. Review the current plan before confirming deletion again. |
| Expired confirmation | This confirmation expired. Review the current plan before trying again. |
| Delete success | Plan moved to Recently deleted. Restore it before {absolute recovery deadline}. |
| Recovery deadline | Restore before {absolute date, time, timezone} |
| Remaining recovery | {N} days remaining / 1 day remaining / {N} hours remaining / 1 hour remaining / Less than 1 hour remaining |
| Restore CTA / pending / success | Restore plan / Restoring plan… / Plan restored. |
| Restore failure | We couldn’t restore this plan. Try again before its recovery deadline. |
| Restore succeeded, open failed | Your plan was restored, but we couldn’t open it. Choose Open plan to try again. |
| Recovery ended | This plan’s recovery period has ended and it can no longer be restored. |
| Deleted deep link | This plan is in Recently deleted. Restore it before {absolute recovery deadline} to open it. |
| Back navigation | Back to My plans |

Known pre-commit failure copy is used only when confirmed by the server. A disconnected or timed-out request always uses the unknown-outcome copy until reconciliation proves its result. Error summaries use `role="alert"`; success/progress notices use `role="status"`. Deadline changes are not announced every second.

## Accessibility and Responsive Acceptance

Native links perform navigation; native buttons perform actions. Label repeated actions with their associated Plan title, using `aria-labelledby` or equivalent, while keeping short visible Rename/Delete labels. Every target is at least 44px by 44px. No hover-only actions or color-only meaning. Dialogs have accessible names and descriptions, contain keyboard focus, support Escape before submission, restore focus to the opener, and make background content inert. After an item disappears, focus the page heading or next logical list item rather than a removed button. Pending submission remains clearly announced; closing a pending dialog must not start or cancel an unseen mutation.

At 320px, 768px, and 1440px viewport widths and at 200% zoom, all names, deadlines, comparison values, controls, errors, and navigation remain available without horizontal page scroll. Native input content may scroll within the field, but its exact preview wraps below. Dialog content can scroll vertically within the viewport; action buttons remain reachable. Honor reduced-motion preferences; skeletons need no shimmer or animated transitions. Use contrast checks for body text, labels, focus indicators, and controls on the specified surfaces.

## UI Considerations

Applicable state considerations resolved: 25 covered, 3 backstop, 0 unresolved. Covered means a prescriptive acceptance contract to verify during implementation, not a claim that current source already passes. Backstop means required held-out/visual evidence; lack of evidence routes to human review, never a silent pass.

Element classification: active/deleted cards and paginated results are `list-collection`; rename is `form`; header, Recently deleted entry, back links, and resume routing are `nav`; lifecycle actions are `interactive-control`; headings, names, deadlines, confirmation text, comparisons, and shell explanation are `static-content`. No `media` elements are in scope: photos and image placeholders are deliberately absent because Phase 2 has no media data contract. All relevant taxonomy categories are resolved below; loading/error/empty are not invented for static text alone.

| Category | Element(s) | Status | Resolution / Reason |
|----------|------------|--------|---------------------|
| empty | Active list | ✅ covered | A successful zero-item response renders Empty active heading/body and the existing New plan CTA; never show this while loading or failed. |
| empty | Deleted list | ✅ covered | A successful zero-item response renders Empty deleted heading/body, Back to My plans, and no Restore action. |
| empty | Rename form | ✅ covered | Clearing the field shows Name validation on apply, preserves focus/input, and sends no mutation. |
| loading | Initial active/deleted lists | ✅ covered | A delayed response renders List loading with aria-busy and non-interactive placeholders; no stale empty message or actionable skeleton. |
| loading | New plan / open / restore / navigation | ✅ covered | Pending labels announce the operation; duplicate initiation is blocked; create/restore navigate only after their authoritative result and authorized target resolution. |
| loading | Rename / delete / confirmation refresh | ✅ covered | Submitted exact value is locked; busy dialog prevents duplicate commits; confirmation refresh cannot silently apply the action. |
| loading | Load more plans | ✅ covered | Keep existing cards, announce loading more, and disable only the pending pagination control; no duplicate cursor request. |
| error | Initial list / paginated list | ✅ covered | Initial failure uses List load error with Retry; page failure uses Next-page failure after retained complete cards and retries the failed cursor. |
| error | Transient stale list | ✅ covered | Stale list notice and Retry remain visible; retained cards are marked non-authoritative and lifecycle mutations wait for fresh state. |
| error | Create / rename / delete / restore actions | ✅ covered | Known failures use their specific Copywriting rows, preserve the correct prior lifecycle state, and enable retry; unknown outcomes use the distinct request-check message and same-request retry. |
| error | Rename conflict | ✅ covered | Inject a changed server revision: retained draft and latest saved name both appear, no automatic resubmission occurs, and a fresh Apply name uses current state. |
| error | Delete conflict / expired confirmation | ✅ covered | Invalidate old review, obtain current projection, show relevant copy, and require a fresh explicit Delete plan; old challenge is unusable. |
| error | Open / deep links | ✅ covered | Unavailable/foreign/missing links reveal no unauthorized title; owned recoverable deleted links expose only deadline, Restore plan, and Back to My plans. |
| error | Activity / resume navigation | ✅ covered | Activity failure leaves a successfully authorized shell visible with scoped retry; invalid saved view uses Conversation fallback without manufacturing a Canvas. |
| error | Restore-open split / expiry | ✅ covered | A committed restore plus failed open uses its distinct message and Open plan; server expiry rejection removes the recoverable card and announces Recovery ended. |
| populated | Active cards | ✅ covered | Server-ordered authorized cards show title, Draft plan, destination or its honest fallback, activity, and independently keyboard-operable Open/Rename/Delete controls. |
| populated | Deleted cards | ✅ covered | Recoverable entries show title, absolute deadline, remaining time, and Restore plan; successful restore directly opens the original Plan/Conversation target. |
| partial | Card metadata / incomplete snapshots | ✅ covered | Missing optional destination uses Missing destination; absent optional count is omitted; incomplete required identity/revision/deadline blocks that action and offers reload instead of inventing saved values. |
| partial | Rename / current-state fetch | ✅ covered | Valid text remains when current-state loading fails, but Apply name is disabled until a complete authorized current projection is available. |
| partial | Collections / pagination | ✅ covered | A complete loaded page may be retained after later-page failure; never blend a new snapshot with old ordered pages or display partial atomic Plan creation. |
| overflow | Collections | ✅ covered | Lists extend in normal vertical document flow; nextCursor exposes Load more plans; neither list uses a fixed-height clipped card container. |
| overflow | Header / Recently deleted navigation | ✅ covered | At narrow widths navigation wraps with intact labels and focus targets, and the Recently deleted entry stays after the grid rather than overlapping it. |
| zero-one-many | Active/deleted collections and counts | ✅ covered | Verify zero, one, two, and many records; one active card occupies one normal grid column, and authoritative count copy uses singular/plural correctly. |
| long-text | Rename field and exact preview | ✅ covered | Test blank, 120-code-point Unicode, 121-code-point, normalization, and control-character cases; no silent truncation and preview matches the exact accepted payload. |
| error | All private surfaces after reauthentication | ✅ covered | Simulate refresh failure during rename/restore: private DOM and drafts clear, late responses are ignored, and reentry reloads only the reauthorized destination. |
| overflow | Confirmation / comparison / deadline static content | 🧪 backstop | Capture dialogs at 320px, 200% zoom, and a viewport shorter than dialog content; all exact values and actions remain reachable through vertical scrolling with no horizontal page scroll. |
| long-text | Card titles / nav / actions / shell headings | 🧪 backstop | Render long unbroken and multi-script names with 320px/768px/1440px widths; text wraps, actions remain separate focus targets, and no content overlaps or disappears. |
| long-text | Localized absolute deadline / error copy | 🧪 backstop | Use a verbose locale date/time with timezone and multi-line errors; inspect card/dialog reflow and verify the complete deadline is readable by keyboard and assistive technology. |

Additional behavior evidence required by the phase: explicit open/change updates server activity ordering through the separate authorized write; polling does not. Retry/double click cannot duplicate create or restore. Delete cancel makes no mutation. Delete success removes active content; pre-commit failure does not. Expired Plans cannot be restored even when a stale countdown appeared positive. Manual title provenance survives later automatic proposals. These are interaction/service integration checks, not pixel assertions.

## Registry Safety

Not applicable: Tool is none. No shadcn initialization, third-party registry, copied block, remote component, new icon package, or new font is included. Native semantic controls and existing React/CSS are the implementation base.

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS
- [ ] Dimension 2 Visuals: PASS
- [ ] Dimension 3 Color: PASS
- [ ] Dimension 4 Typography: PASS
- [ ] Dimension 5 Spacing: PASS
- [ ] Dimension 6 Registry Safety: PASS
- [ ] Dimension 7 Inventory Provenance: PASS (not applicable with Tool: none)

**Approval:** pending
