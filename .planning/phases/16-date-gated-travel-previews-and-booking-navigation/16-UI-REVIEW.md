# UI-SPEC Review — Phase 16

**Reviewed:** 2026-10-16  
**Status:** APPROVED WITH FLAGS  
**Overall verdict:** FLAG — planning may proceed; no blocking design issues.

Independent contract review against `16-UI-SPEC.md`, `16-CONTEXT.md`, `16-REQUIREMENTS.md`, project instructions, the mandatory Travella testing skill, and the seven `gsd-ui-checker` dimensions. The author of this review did not author the UI specification. No source changes, browser operations, or live-provider/model checks were performed in this review.

## Dimension Results

| Dimension | Verdict | Evidence |
|-----------|---------|----------|
| 1 — Copywriting | FLAG | Main actions are specific: View all flights, View all stays, Back to plan chat. Missing-input questions, empty/error copy, expiry and renderer recovery all provide a next step. One count instruction needs the refinement below. No generic forbidden CTA or missing recovery state was found. |
| 2 — Visuals | PASS | Layout and data hierarchy declare the assistant-message preview placement, shared criteria summary, vertical cards and following View all action. The results page declares its heading/criteria/notices/collection order. Four type roles distinguish title, body and metadata. Native labeled actions, decorative-icon hiding, focus restoration and small-screen reflow are specified. |
| 3 — Color | PASS | The 60/30/10 emphasis is explicit. Accent is restricted to three named actions, using existing green action/link tokens rather than a second decorative palette. Warning, destructive and focus colors have separate semantic roles; light/dark foregrounds are specified. No broad “all interactive elements” accent permission appears. |
| 4 — Typography | PASS | Exactly four sizes: 14, 16, 20 and 28px; exactly two weights: 400 and 600. Body line height is 1.5 and heading line height is 1.2. Notices retain a 14px minimum and mobile text input a 16px minimum. |
| 5 — Spacing | PASS | Declared layout spacing is 4, 8, 16, 24, 32, 48 and 64px. Radius, border and focus-ring measurements are explicitly shape/affordance dimensions, not layout spacing exceptions. Touch targets and responsive gutters are specified. |
| 6 — Registry Safety | PASS | Registry section explicitly names no external registries or blocks. Existing local components/manual design system are declared; no shadcn migration or unreviewed third-party import is authorized. The configured safety gate remains enabled. |
| 7 — Inventory Provenance | FLAG | The inventory is preceded by a genuine `Could not enumerate:` record explaining the missing installed A2UI package, with date and the failed inspection command. The source-verified table is explicitly non-exhaustive. This is an accepted FLAG under the checker contract, not a blocker. |

## Actionable recommendations

### C1 — Display the actual preview count

**Dimension:** 1 — Copywriting. **Severity:** FLAG, non-blocking.

**Evidence:** The Chat previews section instructs: `Showing 3 of {returned_count} results` whenever the count is known. The same contract correctly requires one or two cards when only one or two options were observed. A literal implementation could therefore display “Showing 3 of 1 results.”

**Required property:** Count copy must reflect the number of actual rendered previews, including singular/plural grammar.

**Example fix (non-binding):** Specify `Showing {preview_count} of {returned_count} results`, where `preview_count` is the validated rendered count, and use singular wording for one result. Omitting the redundant count when every returned result is already previewed also satisfies the property. Continue showing View all for every nonempty collection as the contract requires.

The otherwise explicit zero/one/many rules and the author’s `min(3, observed count)` instruction make this a localized wording refinement rather than an unimplementable design.

### P1 — Preserve the inventory's non-exhaustive status

**Dimension:** 7 — Inventory Provenance. **Severity:** FLAG, non-blocking.

**Evidence:** The Component Inventory records that installed `@a2ui/react` could not be enumerated because its package file was absent. It accurately distinguishes declared dependencies from resolved installed versions and supplies local-source provenance.

**Recommendation:** Keep the inventory explicitly non-exhaustive. If implementation starts using additional package components after dependencies are installed, enumerate the installed exports and record command, count, package version and date above the inventory. Do not turn the current source-derived list into a closed allowlist or require installing a different design system. The recorded command was reviewed as evidence text and was not executed by this checker.

## Requirement and state consistency

- D-01/D-04 scope is preserved: new capabilities belong to Planning Canvas; the new results path remains read-only; initial chat and unrelated sandbox checkout behavior are not redesigned.
- D-03/D-05 are represented: previews contain observed provider facts only, exact date requirements precede provider requests, and search-only dates do not mutate the Plan.
- TRAVEL-16-04 through TRAVEL-16-06 have concrete display behavior for price basis, unknown facts, taxes, sandbox/freshness, loading, empty, failure, interruption, supersession, criteria changes and expired/reloaded references.
- All eight consideration categories are covered: empty, loading, error, populated, partial, overflow, zero-one-many and long text. Optional image failure has an explicit dismissal/fallback reason.
- Keyboard navigation, focus return, browser Back, unsaved draft/chat/composer preservation, mobile reflow and light/dark rendering have implementable contracts. Browser/history behavior still requires runtime verification; contract completeness does not prove it works.

## Pending evidence and execution gates

The UI specification explicitly records that Chrome capture was pending because the researcher's DevTools profile was in use. The orchestrator owns the working browser session and screenshot task. That is **pending visual evidence**, not a missing design decision, and does not block this seven-dimension contract approval. This review does not claim that screenshots were captured or inspected.

Before verified delivery, complete the project's required plan captures and authenticated desktop/mobile implementation checks, inspect screenshots, exercise View all → Back and stale/error paths, inspect console/network activity, and record actual outcomes in `artifacts/testing/2026-10-16-travel-previews/verification.md`. Keep fixture-backed verification distinct from live model/provider verification.

## Structured return

**Phase:** 16 — Date-gated travel previews and booking navigation.  
**Status:** APPROVED.  
**Blocking issues:** 0.  
**Flags:** 2 — actual preview-count copy; honestly incomplete installed-package inventory.  
**Ready for planning:** Yes. The researcher/orchestrator may update UI-SPEC frontmatter to `status: approved` and record `reviewed_at`; this reviewer leaves UI-SPEC unchanged.
