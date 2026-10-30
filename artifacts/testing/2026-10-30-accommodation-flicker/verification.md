# Accommodation transition flicker

Date: 2026-10-30

## Journey and acceptance criteria

Open a saved Plan, choose Explore accommodation, and restore its saved discussion. The first painted frame containing the loaded transcript must already have the intended scroll position. A reader who scrolls up must retain that position when messages change. Returning to the canvas and reopening accommodation must remain stable.

Keep the existing layout. The settled accommodation screenshot is the intended visual state; no new screen or interaction is introduced. The optional prototype choice was offered; work continued with the existing layout after no selection arrived.

## Reproduction

Used Chrome DevTools MCP in an isolated headless browser and authenticated with the supplied example account. The default MCP browser profile was busy; a separate isolated MCP process resolved that blocker without stopping any existing browser.

Read an existing verification Plan's canvas and saved accommodation discussion. No Plan contents, saved choices, or provider bookings were changed. Opening the Plan uses the application's normal activity update.

At 1440×900 on a fresh accommodation open, frame sampling showed:

| Time after click | History loaded | Scroll top | Maximum scroll |
| --- | --- | --- | --- |
| 21 ms | No | 0 | 0 |
| 619 ms | Yes | 0 | 2724 |
| 649 ms | Yes | 2724 | 2724 |

One visible frame exposed the top of the loaded history before moving to its latest message. Resizing while the workspace was hidden also exposed a position jump; reopening at an unchanged size was sometimes already stable.

Root cause: `TravelConversation` restored transcript scrolling in `useEffect`, after paint. The fix uses `useLayoutEffect` and retains the near-bottom guard.

## Automated checks

- Added a regression check that samples history in the parent's layout phase after hydration and reopening. It fails with the original passive effect (`0` instead of `1200`) and passes with the fix.
- Added a regression check that new messages preserve the scroll position of someone reading older messages.
- `npm test -- src/features/plans/travel/TravelConversation.test.jsx src/features/plans/travel/TravelWorkspace.test.jsx`: 83 passed.
- `npm run build`: passed; existing large-chunk advisory remains.
- `git diff --check`: passed.

## Browser and deployment checks

- Rebuilt with `bash scripts/start-local-ready.sh` after the required Cognito precheck. Service health, example-account sign-in, session check, and temporary sign-out passed; existing database volumes were preserved.
- SHA-256 checks confirmed the running Compose app contains the changed conversation component and tests, plus the unchanged workspace stylesheet.
- Fresh desktop open at 1440×900: loading appeared at 31 ms; the first loaded frame at 389 ms already had scrollTop 2724 / maximum 2724. **Zero loaded visible frames at the wrong position**, compared with one before the fix.
- Scrolled history to 200 px, returned to canvas, reopened accommodation, and allowed the history refresh to finish: scrollTop remained 200 px.
- At 390×844, accommodation search opened normally. Opening the mobile chat produced its first visible frame at scrollTop 2817 / maximum 2817, with **zero frames at the wrong position**.
- Inspected the desktop and mobile screenshots: readable text, no overlapping controls, intended independent panes and mobile scrolling. Loading search UI was also inspected. Error and empty-history behavior is covered by the related automated suite; browser fault injection was not performed.
- Chrome DevTools reported no console errors. Browser resource timing showed no failed same-origin `/v1/` requests during the verified desktop journey.
- No backend CRUD implementation changed; no persistence test is required for this presentation-only timing fix.

## Evidence

- [Before canvas](plan/before-canvas.png)
- [Intended accommodation layout](plan/intended-accommodation-layout.png)
- [Before transition recording](plan/before-transition.mp4)
- [Desktop accommodation after fix](implementation/desktop-accommodation.png)
- [First-open recording after fix](implementation/first-open.mp4)
- [Mobile accommodation search](implementation/mobile-search.png)
- [Mobile accommodation chat](implementation/mobile-chat.png)

The recording covers a reopen after viewport resizing. The first-open timing table above is the separate frame-sampling reproduction.
