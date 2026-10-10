# Research conversation cleanup — verification

Date: 2026-10-10. Cleanup commit: `bcc8493`.

## Delivered scope

The user chose **first clean up the existing UI, then three alternatives**. The production change is a contained, automatically growing composer with an integrated send/stop button, a single focus treatment, visible accessible reply status, stable header spacing, and a mobile transcript that scrolls above the composer. Existing generation actions remain until the user selects a journey design.

The alternatives are development-only, use sample Milan content, and simulate every conversation/canvas action in memory. No alternative has been selected or promoted into production.

## Environment and evidence method

- Canonical app: `http://localhost:5174`, rebuilt from this checkout using `bash scripts/start-local-ready.sh` after the required Cognito precheck.
- Example account authenticated through the real sign-in form. The launcher also passed sign-in → session check → sign-out in its separate temporary session. Credentials were read privately and are not included in evidence.
- Chrome DevTools MCP was exercised through a separate `--isolated --headless --no-usage-statistics` instance because the default MCP browser profile was already in use. This is the same Chrome DevTools tooling, not a substitute browser.
- Final SHA-256 comparisons matched the container's PlanConversation, composer CSS, prototype JSX/CSS, and package.json to this checkout.
- One new test Plan was created for the live reply and retained to host the review links. No pre-existing Plan was modified. No generated canvas was saved.
- Supplied before screenshots are preserved. [Rendered design sketch](plan/composer-sketch.png) was captured and inspected before production implementation.

## Executed checks

| Check | Observed result |
| --- | --- |
| `cd frontend && npm test -- --run src/features/plans/components/PlanConversation.test.jsx src/plansApi.test.js` | 7 tests passed. Covers waiting, receiving, slow response, stop, retry, source allow-list, Enter/Shift+Enter, and stream parsing. Test fixture now supplies the existing research-context/A2UI contract. |
| `cd frontend && npm run build` | Passed. Existing bundle-size warning remains. |
| `git diff --check` | Passed. |
| Authenticated live chat | Sent one research-only Milan question. Waiting and delayed feedback appeared, the response completed, the composer unlocked, and the exact transcript survived reload. This establishes live service integration, not provider result accuracy. |
| Controlled SSE in the authenticated application | Browser-local stream fixture exercised waiting → partial text → stopped, then interruption → Retry → completion. Visible status changed correctly; partial content remained and controls unlocked. No fixture messages reached the backend. |
| Keyboard and resizing | Enter sent once; Shift+Enter inserted a newline without sending; multiline input grew; no textarea outline competed with its container focus treatment. |
| Responsive appearance | Desktop 1440×1000, mobile 390×844, narrow 320×740. Light/dark screenshots inspected. No horizontal overflow. Transcript bottom stayed above composer top. Mobile send target measured at least 44px. |
| Real canvas navigation | Open plan canvas loaded without an agent generation request. Back triggered the existing unsaved-draft confirmation; Leave canvas returned to the conversation. |
| Prototype A/B/C | Each exercised on desktop/mobile: forward transition, simulated draft generation, return to research, and sample chat. C additionally exercised review/confirmation. |
| Prototype switching | Arrow keys and buttons switch variants; input arrow keys do not switch; URL variant persists through reload. |
| Prototype mutation isolation | Browser instrumentation observed zero write requests from prototype actions. |
| Console/network | No change-related console errors in final exercised pages. Only the existing Lit development warning. Auth, profile, Plan, context, canvas, capabilities and inspected map requests returned 200. Simulated interruption was deliberately injected in memory. |

The first mobile pass exposed the existing sticky composer overlapping long content; the bounded transcript layout fixes it, and geometry assertions plus new screenshots passed afterward. Browser startup and navigation raced the rebuild twice; verification was rerun after readiness and reauthentication.

## Existing test limitation

`cd frontend && npm test -- --run src/PlansApp.test.jsx` reports **7 failures / 3 passes**, with seven `api.researchContext is not a function` errors in old fixtures. The same command against an isolated copy of unchanged HEAD `201fd74` produced the **same 7 failures / 3 passes and errors**. These are pre-existing test-fixture failures; the broader suite is not green. No backend CRUD code changed, so backend CRUD delivery gates do not apply.

## Screenshots

Clean composer screenshots use a controlled sample conversation to avoid copying unrelated example-account profile information into evidence. They show the real component and CSS. The live send/wait screenshot separately documents the real request.

- Before: [conversation](plan/before-conversation.png), [composer](plan/before-composer.png), [authenticated empty state](plan/before-live.png).
- Planned cleanup: [sketch](plan/composer-sketch.png).
- Cleanup: [dark desktop](implementation/clean-composer-dark-desktop.png), [dark mobile](implementation/clean-composer-dark-mobile.png), [light desktop](implementation/clean-composer-light-desktop.png), [light mobile](implementation/clean-composer-light-mobile.png).
- Live request: [waiting](implementation/composer-waiting-desktop.png).
- Controlled states: [waiting](implementation/composer-waiting-simulated.png), [streaming](implementation/composer-streaming-simulated.png), [interruption](implementation/composer-interrupted-simulated.png), [multiline dark mobile](implementation/composer-dark-mobile-verified.png), [canvas leave confirmation](implementation/canvas-leave-confirmation.png).

## Interactive alternatives

Use the bottom switcher or left/right arrow keys. The previews share the existing authenticated Plan route and header. Start separately if needed with `cd frontend && npm run prototype:research` (port 5180); the canonical running app already serves the links below.

| Alternative | Tradeoff | Preview | Screenshots |
| --- | --- | --- | --- |
| A — Top stepper | Smallest change; a persistent two-step indicator and one forward action. | [Open A](http://localhost:5174/plans/9a027000-39b6-4822-8475-6e6d9f62609a?prototype=research-flow&variant=A) | [Desktop](plan/alternative-a-desktop.png), [mobile](plan/alternative-a-mobile.png), [light](plan/alternative-a-light.png), [canvas](plan/alternative-a-canvas.png) |
| B — Journey rail | Keeps stages and trip notes together; takes more horizontal space. | [Open B](http://localhost:5174/plans/9a027000-39b6-4822-8475-6e6d9f62609a?prototype=research-flow&variant=B) | [Desktop](plan/alternative-b-desktop.png), [mobile](plan/alternative-b-mobile.png), [light](plan/alternative-b-light.png), [canvas](plan/alternative-b-canvas.png) |
| C — Review before canvas | Makes the handoff deliberate through a notes review; adds a step. | [Open C](http://localhost:5174/plans/9a027000-39b6-4822-8475-6e6d9f62609a?prototype=research-flow&variant=C) | [Desktop](plan/alternative-c-desktop.png), [mobile](plan/alternative-c-mobile.png), [light](plan/alternative-c-light.png), [review](plan/alternative-c-review-mobile.png), [canvas](plan/alternative-c-canvas.png) |

All final design and implementation screenshots were visually inspected. Scrollable mobile panels intentionally show only the visible portion of the transcript; the composer and switcher occupy separate layout space and do not overlap it.

## Decision and capture

Selection pending. Recommendation: A for the first iteration, with C's review checkpoint if stronger confirmation is desired. Prototype source is preserved on `prototype/research-flow-alternatives-261010-j1q`; after the user chooses, implement the selected behavior properly and remove the losing previews/switcher from the production path. No PR or external publication was made.
