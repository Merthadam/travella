# Focused navigation prototypes — verification

Date: 2026-10-16. Source: `prototype/plan-navigation-20261016`, based on main `0812adc`.

Scope: three throwaway choices for Research / Canvas navigation and a quieter generation entry. Existing conversation and A2UI Trip Brief are reused. No production design selected. All sample conversation, brief edits and generation operate in memory; generated sample components are read-only. Main remains on port 5174.

Run: `npm --prefix frontend run prototype:navigation` (uses the existing local stack proxy on 8003). Preview: `http://localhost:5177/plans?prototype=plan-navigation&variant=A` (B/C supported). Bottom arrows cycle variants; Preview controls exposes memory state, reset and simulated failure. Reload resets the sample data and retains the chosen variant.

## Browser verification

Used installed Chrome DevTools MCP CLI with an isolated headless browser, via its existing daemon. Captures were written to the allowed temporary directory and copied here. Authenticated example account verified by `/auth/account` returning 200 and an exact expected-account match, without exposing account content. `/auth/session` returned 200.

- A: simple view tabs and small toolbar text action. Review opens and cancels back to research.
- B: view selector and invitation inside the conversation. Review opens/cancels; selector switches back from Canvas. A2UI destination edit changes memory only.
- C: view tabs; preparation starts inside the empty Canvas. Selecting Canvas does not generate or open confirmation.
- Actual confirmation dialog requires flight choice, Escape cancels, explicit confirmation yields loading and then a sample draft.
- Simulated failure retains the brief; Try again reopens review and can be cancelled.
- Arrow switcher updates URL. ArrowRight inside the textarea does not switch variants; keyboard switching outside inputs works. B survives reload.
- All three captured at 1440×1000 and mobile 390×844. No horizontal overflow. Existing mobile Trip Brief remains in its scrollable upper region. Full-page screenshots place the fixed prototype switcher at the viewport bottom; it can overlap scrolled content, and is not part of the proposed product UI.
- Console: no application errors; existing Lit development-mode warning only.
- Network during brief edits/confirmation/error/retry: no POST/PATCH/PUT/DELETE requests, no failed application requests. Only normal auth/profile/Plans reads and development assets. See browser-checks.txt and browser-network.txt.
- Captures visually inspected. Early captures that caught authentication loading during viewport reload were replaced after readiness checks.

## Evidence

| State | Screenshot |
| --- | --- |
| Existing stage/action controls using sample content | [Baseline](plan/baseline-desktop.png) |
| A toolbar | [Desktop](plan/a-desktop.png) · [Mobile](plan/a-mobile.png) |
| B conversation invitation | [Desktop](plan/b-desktop.png) · [Mobile](plan/b-mobile.png) |
| C canvas setup | [Desktop](plan/c-desktop.png) · [Mobile](plan/c-mobile.png) · [Empty canvas](plan/c-empty-canvas.png) |
| Confirmation | [Review](plan/generation-review.png) |
| Simulated generation | [Loading](plan/generation-loading.png) · [Draft](plan/generated-draft.png) · [Error](plan/generation-error.png) |

## Automated checks and limits

`npm --prefix frontend test -- src/features/plans/components/PlanConversation.test.jsx src/features/plans/components/CanvasGenerationReview.test.jsx`: 13 passed, 2 files.

`npm --prefix frontend run build`: passed. Existing warning about bundle chunks above 500 kB remains. `git diff --check`: passed.

No backend CRUD changed. No provider requests or durable saves exercised because these are intentionally simulated prototypes. Broader stability is not complete: the preceding baseline full-suite run had 134 passes and 6 failures in AccountApp/TripBrief tests; this task neither fixes those failures nor claims the app is bug-free. Await the user's prototype choice before rewriting production UI.
