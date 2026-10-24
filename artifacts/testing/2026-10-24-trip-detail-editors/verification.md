# Focused trip detail editors — verification

2026-10-24 · Source `5262676` · branch `feat/single-canvas-workspace`.

## Design

User requested a friendlier replacement for the expanding essentials form, including travelers and budget. This refines the approved canvas implementation. Dates, travelers and budget now have independent summary controls, each opening only its relevant fields in a compact anchored dialog. Mobile uses a bottom sheet. Header geometry remains unchanged. Date summaries use readable date ranges; travelers support a bounded stepper; budget retains the existing free-text/no-fixed-budget capabilities.

- [User-provided before state](plan/before.png)
- [Rendered design sketch](plan/editor-sketch.jpg)
- [Dates desktop](implementation/dates-desktop.jpg)
- [Travelers desktop](implementation/travelers-desktop.jpg)
- [Budget desktop](implementation/budget-desktop.jpg)
- [Dates mobile](implementation/dates-mobile.jpg)
- [Travelers mobile](implementation/travelers-mobile.jpg)
- [Budget mobile, light theme](implementation/budget-mobile-light.jpg)

All implementation captures used Chrome DevTools and were visually inspected. The first mobile check exposed native date inputs overflowing when side by side; they now stack. Final mobile dialog clientWidth and scrollWidth both equal 372 px at a 390 px viewport. Date sheet bounds: x=8, right=382, bottom=836 within 390 × 844. No horizontal overflow. Desktop checked at 1440 × 1000.

## Automated verification

```sh
npm test --prefix frontend -- src/design-system/components/CompactTripEssentials.test.jsx src/features/plans/components/PlanningCanvas.test.jsx src/features/plans/travel/CanvasTravelJourney.test.jsx
npm run build --prefix frontend
git diff --check
```

**28 passed, 1 skipped**, three test files passed. The existing Python SSE fixture test requires `TRAVELLA_CANVAS_SSE_FIXTURE` and remains skipped. Build and whitespace checks passed. Existing Vite bundle-size warning remains.

New coverage checks targeted date changes, invalid date order, preserving newer unrelated essentials, stepper bounds, cancellation, Escape, no-fixed-budget/flexible-date valid payloads, and focus restoration. Existing tests now use an open preference editor for the background chat/travel draft-preservation journey, since these focused detail dialogs intentionally block background interaction. Legacy full-card essentials continue using the existing editor.

## Authenticated browser and persistence

Canonical app: http://localhost:5174. Used the existing authenticated example-account session. Rebuilt with `scripts/start-local-ready.sh` after the read-only local Cognito precheck. Startup authentication readiness passed; final container hashes match CompactTripEssentials.jsx and compact-trip-essentials.css.

Created only `be28d5c5-7f44-4643-93b4-f4e9ae5c395f` (“Detail editor verification”) through real API create/rename confirmation, then set explicit Lisbon requirements for setup.

Observed in Chrome DevTools:

1. Opening dates does not stretch the header: height 102 px before and after. Dialog contains dates, flexible option and date note only. Travelers/budget fields are absent.
2. Updated date note through the form, increased travelers with the actual plus control from 2 to 3, and changed budget to €2,200. Each Update action changed only the canvas draft. Clicked Save plan and observed Saved.
3. Changed the native end-date day from 16 to 18 with keyboard ArrowUp twice. The browser input and summary both updated. The tool's generic date-fill call did not change the controlled date; keyboard interaction verified the real native input path.
4. Saved again, reloaded through mobile emulation and explicitly reloaded the final rebuilt app. Real API readback and visible summary agreed: 12–18 Nov 2026, 3 travelers, €2,200; date note “A relaxed week in Lisbon”. Save state was Saved. Travel card details remain synchronized by the existing canvas logic.
5. Escape closes the dialog and returns focus to the opening detail control. No update occurs on cancellation. Native modal semantics keep background interaction out of the editing flow.
6. Mobile flexible-date toggle hides exact dates while retaining the note; Escape preserves the saved exact range. No-fixed-budget toggle hides the amount; Escape preserves €2,200. All three sheets and light/dark rendering were exercised.

No backend implementation changed. Durable edits still pass through the normal revision/challenge save flow; opening or cancelling editors does not persist content.

## Console/network and cleanup

A transient 503 canvas read occurred in the earlier browser after the local service rebuild; Retry loading recovered. Final fresh-page session/profile/plan/canvas/context/conversation/capabilities requests all returned 200. No final console errors; existing Lit development warning only. Some stale browser-element handles were retried after fresh snapshots.

Deleted only the test-created plan through prepare/commit. Deleted-view read returned lifecycle `deleted`, active-view read returned 404. Returned the browser to My plans and restored dark appearance. Seven-day recovery applies. No supplier transaction, push or merge.
