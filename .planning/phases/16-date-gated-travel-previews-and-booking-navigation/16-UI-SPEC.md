---
phase: "16"
slug: "date-gated-travel-previews-and-booking-navigation"
status: approved
shadcn_initialized: false
preset: none
created: "2026-10-16"
reviewed_at: "2026-10-16"
---

# Phase 16 — UI Design Contract

Canonical visual and interaction contract for Planning Canvas travel previews and the dedicated results-only page. Sources: `16-CONTEXT.md` decisions D-01 through D-07, `16-REQUIREMENTS.md`, `16-RESEARCH.md`, and the existing frontend code. Research confirms the existing transport and transient snapshot approach; its proposed ten-minute UI lifetime is a local freshness policy, not a provider guarantee.

## Scope and journey

1. In **Planning Canvas → Plan chat**, the traveler requests flights or stays. Initial trip chat is unchanged. Hide unavailable modes using the existing travel-capability boundary.
2. Resolve mode-specific requirements before making a provider request. Use explicit current Canvas dates, or exact dates the traveler supplies for this search. If any date or year is missing/ambiguous, ask a focused clarification in chat. Never invent dates or silently save search dates to the Plan.
3. Show a loading status in the relevant assistant reply, then **up to three actual observed options**, in provider order, as a validated read-only A2UI surface. Do not pad a short result set, invent facts, or render model-authored price/provider facts.
4. A single **View all flights** or **View all stays** action opens the matching full result collection in a dedicated results-only view. The action does not issue a fresh provider search or select, save, book, or prebook an option.
5. **Back to plan chat** restores the same Canvas draft, open editor, chat history, scroll position and composer text, with focus returned to the originating View all control. Mobile returns to the Plan chat tab. Existing unrelated Canvas-card travel browsing and sandbox checkout remain separate.

No booking/payment/passenger-name form, supplier redirect, saved-option action, separate booking LangGraph flow, or generic model-authored navigation URL enters this new journey. No success wording may imply a booked or saved option.

## Design System

| Property | Value |
|----------|-------|
| Tool | Manual existing Travella design system with local A2UI catalogs |
| Preset | Not applicable; no components.json exists |
| Component library | Existing local React components, `@a2ui/react` and `@a2ui/web_core`; dependency declarations pin 0.12.0 |
| Icon library | Existing local `Icon` SVG primitive; plane, bed, arrow, calendar, close |
| Font | `--ds-font`: Inter, ui-sans-serif, system fallback; `--ds-display`: Georgia, Times New Roman, serif for page title |
| Token sources | `frontend/src/design-system/tokens.css` and `frontend/src/features/appearance/appearance.css` |
| Component sources | `frontend/src/design-system/components.css`, `a2ui/ActivitySuggestions.jsx`, `features/plans/components/canvas-conversation.css`, `features/plans/travel/travel-search.css` |
| shadcn gate | Existing custom design system detected; D-02 explicitly selects existing A2UI styling. Do not initialize or migrate to shadcn, or re-ask the settled decision. |

Reuse existing class and token semantics. The following typography/spacing defaults apply to the **new travel surfaces only**; do not restyle existing Canvas/activity cards globally. The live app appearance tokens override standalone design-system fallbacks, so new UI must follow account light/dark preferences.

## Component Inventory

Enumerated by `node -e 'const fs=require("fs"),m=require("./frontend/node_modules/@a2ui/react/v0_9/index.cjs"),p=JSON.parse(fs.readFileSync("frontend/node_modules/@a2ui/react/package.json")); const c=Object.entries(m).filter(([k,v])=>k==="A2uiSurface"||typeof v?.render==="function").map(([k])=>k);console.log(JSON.stringify({package:p.name,version:p.version,count:c.length,components:c}));'` — 19 components — @a2ui/react@0.12.0 — 2026-10-16.

The following is a **non-exhaustive** list of source-verified local components, not a closed allowlist. `rg -n '^(export (function|const)|const views)' frontend/src/design-system/a2ui/catalog.jsx frontend/src/design-system/a2ui/ActivitySuggestions.jsx frontend/src/design-system/components/primitives.jsx` reproduces local source discovery. The Canvas catalog contains its root plus seven locally bound components; ActivitySuggestions has a separate one-component catalog. Installed package enumeration became available after the orchestrator restored dependencies. It found the A2uiSurface renderer plus 18 catalog implementations: AudioPlayer, Button, Card, CheckBox, ChoicePicker, Column, DateTimeInput, Divider, Icon, Image, List, Modal, Row, Slider, Tabs, Text, TextField and Video. These package primitives are available but do not replace the selected local Travella catalog or authorize new model-generated component types.

| Component | Import/source path | Use |
|-----------|--------------------|-----|
| Icon, Card, EditButton | `frontend/src/design-system/components/primitives.jsx` | Existing icon and surface treatment; do not include an edit action on a read-only preview |
| PlanningCanvas root and bound sections | `frontend/src/design-system/a2ui/catalog.jsx` | Retain existing Canvas layout and action boundary |
| TripEssentials | `frontend/src/design-system/components/TripEssentials.jsx` | Source of explicit current dates; no automatic edits from search |
| FlightsEntry, AccommodationEntry | `frontend/src/design-system/components/TravelEntry.jsx` | Existing unrelated travel entry points; preserve behavior |
| ActivitySuggestions | `frontend/src/design-system/a2ui/ActivitySuggestions.jsx` | Pattern for strict schema, separate ephemeral surface, surface-bound actions and renderer error fallback |
| CanvasConversation | `frontend/src/features/plans/components/CanvasConversation.jsx` | Chat host, loading/interruption status and composer preservation |
| TravelSearch | `frontend/src/features/plans/travel/TravelSearch.jsx` | Reuse safe normalized result presentation where suitable; isolate this journey from checkout actions |
| New travel-preview A2UI surface | To be implemented alongside ActivitySuggestions | Validated mode, criteria summary, three observed previews and one allowlisted View all action |
| New results-only view | To be implemented under `features/plans/travel/` | Read-only matching collection and Back to plan chat; no checkout fallback |

## Spacing Scale

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Related metadata lines |
| sm | 8px | Card stack, icon/text gaps, label gaps |
| md | 16px | Preview padding, mobile page gutters, result-list gaps |
| lg | 24px | Desktop result card padding, chat inset and sections |
| xl | 32px | Desktop results-page outer padding |
| 2xl | 48px | Major page section separation when needed |
| 3xl | 64px | Maximum page-bottom breathing room |

Defaults chosen within D-07 discretion. No spacing exceptions. Existing shared radius values (18px outer card, 12px preview, 9px button) and 1px borders are visual shape tokens, not spacing. All new controls have a minimum 44×44px target; the mobile full-width View all button is at least 48px high.

## Typography

Exactly four sizes and two weights for new surfaces:

| Role | Size | Weight | Line Height |
|------|------|--------|-------------|
| Metadata, helper copy, button label | 14px | 400; button label 600 | 1.5 |
| Body, preview title, price | 16px | 400; title and price 600 | 1.5 |
| Section heading | 20px | 600 | 1.2 |
| Results-page title | 28px | 400, `--ds-display` | 1.2 |

Existing surrounding Canvas typography is inherited. Do not shrink notices, dates, price basis or error text below 14px to fit. Wrap text instead. Text-entry controls remain at least 16px on mobile. Weights are 400 and 600; no additional weight is introduced by the new surfaces.

## Color

| Role | Light theme | Dark theme | Usage |
|------|-------------|------------|-------|
| Dominant (60%) | `--ds-paper` → #eef3f8 | #0c1725 | Results-page background and surrounding workspace |
| Secondary (30%) | `--ds-surface` → #ffffff; `--ds-soft` → #f3f7fa | #142235 / #1c2e43 | Chat panel, preview cards, loading placeholders, supporting sections |
| Accent (10% maximum) | `--ds-action` #254e3d; `--ds-green` #146b5e | #9ef1d8 | View all CTA and return-link text only |
| On accent | `--ds-on-action` #ffffff | #123b32 | Primary button text |
| Text / muted | `--ds-ink` #17263a / `--ds-muted` #5b718c | #eaf2fb / #a9bace | Content / supporting metadata |
| Border | `--ds-line` #d5e0eb | #33475d | Card and section separation |
| Warning | `--ds-warning` #725f39 / `--ds-warning-bg` #fffbf0 | #f0d392 / #332f24 | Sandbox, expired or changed-criteria notice with text label |
| Destructive | `--ds-danger` inherited | Inherited | No destructive actions in this phase; errors use semantic alert text, never a destructive CTA |

Accent reserved for: View all flights, View all stays, Back to plan chat text. Focus uses `--ds-focus` (#167765 light / #63e6c1 dark), with a 3px outline and 3px offset. Warning/error states carry readable text, not color alone. The 60/30/10 split describes overall visual emphasis rather than a pixel quota.

## Layout and data hierarchy

### Chat previews

- Place the preview surface inside the originating assistant message, after a brief introduction. Keep chronological message order and the existing chat auto-scroll rule: scroll only if the traveler was already near the end.
- Reuse the existing desktop chat width (350–420px according to viewport). Stack all preview cards vertically with 8px gaps; no horizontal carousel and no selectable-card styling.
- Put a shared search summary above the list: route with airport codes for flights or city/country for stays; exact departure/return or check-in/check-out dates including year; traveler/room totals; provider name; searched-at time with timezone. Label distinct dates explicitly if they differ from current Canvas dates. They are search-only values.
- Show sandbox/test-inventory status whenever the provider marks sandbox, plus price/availability freshness notice. Do not infer live availability from a timestamp.
- Flight card: carrier(s), outbound and inbound dates/times, stops when observed, currency/amount with **Return total · {party}**, and material baggage/fare restrictions. Different local-date arrival days must remain visible. Unknown times/stops/baggage are not assumed.
- Stay card: property name, location, date range, observed room/occupancy basis, currency/amount with **Stay total · {nights} · {rooms} · {party}**, and material cancellation/meal/tax restrictions. A property-level lowest offer must be labeled **From {amount} for the stay** when it is not a specific room total.
- Never turn `party_return` into per-person/one-way pricing or `stay` into nightly pricing. Preserve estimated labels and excluded-tax notices; unavailable amounts render **Price unavailable**, not zero. Unknown refundable status renders **Cancellation terms unavailable**. Unknown included benefits remain unknown.
- New previews do not require imagery: retain a text-first comparison surface, avoiding placeholder stock photos or invented hotel/airline branding. Existing results imagery may be omitted; if reused, missing/failed images collapse without hiding content.
- One View all control follows the list. It is shown for any nonempty result set, including one to three results, with the exact mode-specific label. Show **Showing {preview_count} of {returned_count} results**, with `preview_count = min(3, observed_count)`, only when the total count is known; use **Showing 1 of 1 result** for the singular case. If provider truncation is reported, say **Showing available results; more may exist.** Do not claim exhaustive provider inventory.

### Results-only page

- Present within the existing authenticated Plan workspace as a dedicated screen, not a modal, supplier link or booking flow. Keep Plan and chat state mounted or equivalently preserved across this transition.
- Top order: Back to plan chat, **Flights for your trip** / **Stays for your trip**, exact criteria summary, provider/sandbox/freshness notices, result count, result collection.
- At desktop widths use a maximum 960px content column, 32px outer spacing and a two-column result grid. Below 760px use one column with 16px gutters. Cards remain read-only; complete observed material terms may wrap or use native disclosure with an explicit **Show details** / **Hide details** label.
- View all resolves a trusted Plan-owned search reference to the exact collection shown in chat. Do not put provider response bodies, checkout tokens, email addresses or raw search payloads in query strings, history state or model-provided URLs.
- Browser Back while this view is active must restore the originating chat without dropping the draft. A view implemented without adding a browser-history entry must intercept its own local transition consistently so browser Back does not unexpectedly leave a dirty Plan. Do not overwrite unrelated history entries.
- Navigate only on explicit traveler action. On entry, focus the results heading (`tabIndex=-1`); on return, focus the originating View all button, falling back to the Plan chat heading/composer if it is no longer present.

## Copywriting Contract

Placeholders below are filled from trusted current criteria/results. Use singular/plural counts correctly.

| Element | Copy |
|---------|------|
| Primary CTA, flights | View all flights |
| Primary CTA, stays | View all stays |
| Return navigation | Back to plan chat |
| Missing flight dates | What are your departure and return dates, including the year? |
| Missing stay dates | What are your check-in and check-out dates, including the year? |
| One date/year missing | Ask only for that missing departure, return, check-in, check-out or year; repeat the known value so the traveler can disambiguate |
| Invalid/reversed dates | Those dates don’t form a valid trip. What exact start and end dates should I use? |
| Search-only dates notice | These dates are for this search. Your plan dates are unchanged. |
| Loading | Searching flights… / Searching stays… |
| Partial result arrival | Checking options for your dates. |
| Ready intro | Here are {count} flight options to explore. / Here are {count} stay options to explore. Use “1 flight option” or “1 stay option” for one. |
| Empty heading | No flights found / No stays found |
| Empty body | Try different dates or airports in Plan chat. / Try different dates or a different destination in Plan chat. |
| Error | We couldn’t load flights. Try again from Plan chat. Your draft is unchanged. / Equivalent with “stays” |
| Retry action | Try again — reruns the same explicit search only while all criteria remain valid and current |
| Missing price/terms | Price unavailable / Baggage information unavailable / Cancellation terms unavailable |
| Sandbox | Sandbox · test inventory |
| Freshness | Prices and availability may change. |
| Checked time | Checked {date}, {time} {timezone} |
| Estimated price | Estimated {currency} {amount}, followed by the exact provider price basis |
| Excluded taxes | Additional taxes excluded: {observed items or amounts}; if the amount is unknown, say “amount unavailable” |
| No durable action | Nothing has been saved or booked. |
| Expired | These results have expired. Return to Plan chat to search again. Prices and availability may have changed. |
| Reload/reference unavailable | These results are no longer available. Return to Plan chat to search again. |
| Changed criteria | Your search details have changed. Search again for your current dates and travelers. |
| Superseded | A newer search replaced these results. |
| Interrupted | Search interrupted. No complete results are available. Try again from Plan chat. |
| Stopped | Search stopped. No complete results are available. |
| Renderer validation failure | These travel results couldn’t be displayed. Try again from Plan chat. Your draft is unchanged. |
| Results heading | Flights for your trip / Stays for your trip |
| Destructive confirmation | None: no destructive operation is introduced |

Avoid “Booked,” “Reserved,” “Added,” “Selected,” “Confirmed price,” “Best price,” or “Guaranteed” for research previews. Do not rename existing unrelated sandbox checkout copy in this phase.

## State and accessibility contract

- **Loading:** one polite status per search with `aria-busy`; three neutral skeleton blocks may reserve space. Do not show invented card names/prices or an enabled View all control. Render complete validated result batches atomically, not partially streamed provider facts.
- **Missing or invalid requirements:** focused chat clarification, no result surface and no provider request. Never overwrite confirmed Canvas values. Unknown nationality, airport, occupancy or other required inputs use the existing validation/clarification pattern.
- **Empty:** explanatory empty state and next step from Copywriting Contract; no View all button, no empty results-page navigation, no fake fallback inventory.
- **Failure:** inline recoverable alert with safe text and a retry affordance only when criteria are still valid. Never expose raw exception text, provider payloads or internal tool details.
- **Stopped/interrupted/superseded:** the affected incomplete or old search cannot become the active collection later. Show its status in chat. Disable/remove its View all action; a separate newer successful search remains usable. A retry is a new explicit action, not an automatic request.
- **Changed criteria:** compare relevant search criteria, not unrelated Canvas edits. If dates, route/destination, party/rooms or other search inputs change, do not present old options as matching the new criteria. Mark obsolete collection and disable navigation until an explicit fresh search. Preserve original criteria with historical messages.
- **Expiry/reload:** an expired reference, missing transient collection or unavailable ownership-authorized lookup renders documented recovery copy and Back to plan chat. No automatic provider call on mount, Back, refresh, expired result click, or restored history. Old prices cannot be silently displayed as current. Reloading cannot claim that unsaved Plan edits were persisted.
- **Authorization:** missing/foreign/deleted-Plan references disclose no result details. Use existing authentication/session-expiry handling and a generic unavailable result state where appropriate.
- **Keyboard:** use native buttons/links and ordered headings; no clickable generic divs or nested interactive controls. Tab order follows visual order. Keyboard activation performs the same explicit navigation as pointer activation. All decorative icons are `aria-hidden`.
- **Announcements:** announce result counts or search failure once; do not live-announce each price row. Errors use `role=alert`, routine transitions use polite `role=status`. Avoid moving keyboard focus during background search completion.
- **Mobile:** existing Canvas/Plan chat tabs remain; results occupy the screen. Text wraps, controls stay within viewport, no horizontal page scrolling at 320px width or 200% zoom. Preserve scroll within chat and reachable composer with safe-area padding. Do not place essential totals/notices only in hover tooltips.
- **Theme/motion:** all new colors resolve through existing tokens in light and dark. No required animation; skeletons may be static. Honor reduced motion and preserve visible keyboard focus.

## UI Considerations

Author-specified state coverage below is ready for the orchestrator’s post-checker probe; it is not a claim of executed production verification. Applicable state considerations resolved: 8 categories covered, 0 backstop, 0 unresolved.

| Category | Element(s) | Status | Resolution / Reason |
|----------|------------|--------|---------------------|
| empty | Preview and results collections, chat clarification | ✅ covered | Zero results use the empty copy and expose no View all action; missing inputs yield a question without a provider call |
| loading | Preview list, results navigation, retry | ✅ covered | One polite status and neutral placeholders; incomplete options and duplicate actions are not usable |
| error | Search, A2UI renderer, result-reference resolution | ✅ covered | Safe error/expiry copy and recovery path; invalid/foreign payloads disclose no result facts |
| populated | Preview and full-results collections | ✅ covered | Chat shows min(3, observed count); View all displays the matching complete validated collection with exact criteria and notices |
| partial | Incomplete criteria and optional provider facts | ✅ covered | Required fields gate search; optional unknown prices/terms are labeled; no partial provider batch is promoted to ready |
| overflow | Result collections, metadata, navigation | ✅ covered | Vertical scrolling, responsive one-column reflow, wrapping terms and full-width mobile CTA; no horizontal carousel |
| zero-one-many | Preview and results collections | ✅ covered | Zero uses empty state, one uses singular copy and one card, two/three render only those cards, larger sets show three plus View all and truthful count |
| long-text | Property/carrier names, notices, date labels, actions | ✅ covered | Wrap within min-width:0 containers with overflow-wrap:anywhere for unbroken strings; never ellipsize critical dates, totals or restrictions |

Media loading/error is dismissed for new chat cards because imagery is not required. Any reused results image must collapse cleanly on absence/error; textual facts remain available.

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| None | None; existing local components only | Not applicable — no shadcn installation, external blocks or third-party registry imports; checked 2026-10-16 |

## Evidence and delivery gates

- User declined alternative prototypes (D-02); do not ask again. A single preimplementation sketch is at `artifacts/testing/2026-10-16-travel-previews/plan/index.html`, with explicitly simulated flight/stay inventory and a state selector. It has no provider calls or real authentication.
- Plan capture targets: desktop 1440×1000 and mobile 390×844; chat and results page; stays and flights; missing-date and expired states. Exercise View all → Back and verify the unsent draft text remains. Inspect screenshots for clipping, overlap and readable dates/notices, plus console/network failures. Chrome DevTools captures are required by `docs/skills/travella-testing/SKILL.md`.
- The orchestrator captured and visually inspected Chrome DevTools evidence on 2026-10-16: `plan/desktop-chat.jpg`, `plan/desktop-results.jpg`, `plan/mobile-chat.jpg`, and `plan/mobile-results.jpg` under the task evidence directory. Browser exercise confirmed matching flight/stay results, Back preserving composer text, and no mobile horizontal overflow. The earlier researcher profile-in-use blocker was resolved by using the orchestrator’s browser instance. These are simulated design-sketch checks; production and additional edge-state verification remain execution gates, recorded separately in the task `verification.md`.
- Production verification remains an execution gate: authenticate with the example account using the local skill; exercise exact/missing dates, one/three/many results, both modes, full-result identity, Back/draft/chat preservation, mobile, theme/focus, empty/error/interruption/expiry/reload recovery and unchanged legacy sandbox entry path. Assert no provider request before complete exact criteria and no booking/Plan mutation from preview or navigation. Use isolated fixture responses where necessary and distinguish fixture evidence from live-provider/model evidence.
- Discovered frontend commands: `npm --prefix frontend test -- <relevant test paths>` and `npm --prefix frontend run build`. Canonical local app origin is `http://localhost:5174`, started/validated through `scripts/start-local-ready.sh` per `.agents/skills/travella-local/SKILL.md`. No application run or production test is claimed by this design artifact.

## Checker Sign-Off

- [x] Dimension 1 Copywriting: PASS — C1 actual-count refinement applied after review
- [x] Dimension 2 Visuals: PASS
- [x] Dimension 3 Color: PASS
- [x] Dimension 4 Typography: PASS
- [x] Dimension 5 Spacing: PASS
- [x] Dimension 6 Registry Safety: PASS
- [x] Dimension 7 Inventory Provenance: PASS — P1 resolved by installed-package enumeration; inventory remains non-exhaustive

**Approval:** approved 2026-10-16. Independent review: `16-UI-REVIEW.md` (zero blocking issues); its C1 count and P1 inventory refinements are resolved above. The review's pending-evidence note describes its review-time state; the evidence section above records subsequent orchestrator captures.
