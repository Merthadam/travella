# Parallel manual travel and sidechat verification

User correction: preserve the booking-style manual interface and add independent per-topic sidechat in parallel. Earlier prototype decline honored. GSD quick261026-b8g; Phase18 backend remains unchanged.

## Change

Manual TravelSearch is immediately visible with destination/airport lookup, dates/party, filters, sorting, comparison, details and existing sandbox controls. The specialist conversation sits on the right and can collapse without unmounting either workflow. Mobile defaults to Browse; topic chat remains one tap away. Manual result “Discuss with assistant” prepares a bounded message with name/route/dates/displayed price, no private offer token, and requires explicit Send. Existing separate histories, safe choices and recommendation cards remain.

## Automated checks

- `npm --prefix frontend test -- src/features/plans/travel/TravelConversation.test.jsx src/features/plans/travel/TravelSearch.test.jsx src/features/plans/travel/CanvasTravelJourney.test.jsx src/features/plans/components/PlanningCanvas.test.jsx`:50passed;1conditional Python-SSE fixture test skipped in this standalone command.
- `uv run --locked pytest -q services/agent/tests/test_canvas_travel.py -k actual_sse_to_react`:8passed,189deselected. These supply the real Python SSE fixture and execute the previously conditional React journey. No required cross-layer check remains skipped.
- Production build passed; existing bundle-size warning remains. `git diff --check` passed.
- Updated old tests that clicked Adjust search to assert the now-immediate manual controls; draft, navigation and sandbox confirmation assertions retained.

## Browser evidence

Chrome DevTools, example-account authentication, test-owned Lisbon Plan0355fb3e-acb1-438b-9177-ccccb1da588c. Desktop1440×1000; mobile390×844. Planning desktop/mobile outlines captured and inspected before implementation; previous UI preserved in plan/before.png.

- Manual stay lookup selected Portugal/Lisbon and HU nationality, saved12–17May2027 dates and2adults. Explicit search returned28stays. Room details loaded20offers for the first hotel, without using chat. Lower-total sorting and EUR700filter reduced results to2stays.
- Collapsing chat retained10visible result cards. Discuss with assistant reopened chat with a draft naming the manually browsed hotel/dates/price; it did not send an SDK request or remove results.
- Existing separate Flights history restored alongside its manual search form. Browser source hashes matched the four changed runtime modules/styles.

## Environment incident

The shared travella-local-single stack was independently replaced from another worktree(highly-rook) during checks. Its older app image exited because it could not locate migration0012 in the existing database. This caused connection-refused airport/session requests and earlier reloads. Restored from this locrian-peacock checkout with `bash scripts/start-local-ready.sh`; health/auth checks passed. Database volume preserved. No rollback of the migration was performed.

Final flight/mobile and clean-network results follow below. No model, reservation, payment or mock-booking transaction was invoked by this correction’s browser checks; existing sandbox flows were covered by the component regressions.

## Final observed results

- Manual Budapest(BUD)→Lisbon(LIS) return search,12–17May2027,2adults,HU/EUR:100flights returned. The first direct fare was EUR802.94; View flight displayed bothlegs, baggage, fare terms and the existing sandbox action. No checkout was started.
- Switching Flights→Stays→Flights retained all100results and the unsent flight question. No accommodation transcript appeared in the Flights discussion.
- After mobile reload, Browse flights was the initial visible pane; the chat composer was hidden. Entering BUD, switching to chat, entering an unsent preference and returning to browsing preserved bothvalues. Width390px matched the viewport with no horizontal overflow. Separate saved history restored after reload.
- Clean-navigation console inspection showed no errors, only existing Lit development and GoogleMaps marker warnings. The earlier connection-refused errors were traced to the unrelated replacement of the shared stack, not concealed as provider failures.
- Final mobile adjustment hides the duplicate desktop toggle and returns close-chat focus to Browse on mobile;44focused tests passed again afterward.

Evidence: plan/desktop.png, plan/mobile.png and preserved plan/before.png; implementation/stays-desktop.png and flights-desktop.png show actual sandbox manual results with the independent sidechat. Final mobile screenshots are captured after the last build. Screenshots are visually inspected for overlap and readability. Earlier full Phase18 live-quality and user acceptance gaps remain open; this frontend correction does not close them.

Final mobile screenshots implementation/mobile-browse.png and mobile-chat.png were inspected: form labels, sticky mode controls and full composer are readable; no horizontal overflow. Duplicate toggle is hidden; close-chat returns keyboard focus to Browse flights. Final4runtime source hashes match. Post-rebuild initial auth/session returned500, then explicit sign-in/session and all Plan/topic reads returned200; no feature-related network failure remained. Temporary credential-bearing login helper was removed.
