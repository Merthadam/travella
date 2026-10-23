# London flight search debugging

Status: verified.

Reported: Budapest to London, October 23–26 2026, one adult. User explicitly requested retry or alteration. Assistant reported a provider error and incorrectly said alternative airports/dates were prohibited.

Reproduction: live connector BUD–LON failed with provider_response_invalid in 1.6 seconds. Identical BUD–LHR returned 100 options in 13.3 seconds. A second LHR response passed all 100 results through the agent preview validator. LON is not in the actual-airport catalog; LHR is. Original failed tool arguments are not retained, so the original request's precise airport/code cannot be proven retrospectively.

Changes: Canvas typed tools reject unknown/metropolitan codes before any rate search and explain how to resolve an actual airport in the same turn. Agent preserves allow-listed provider error codes without private error text. Prompt distinguishes traveler-authorized retries/alternatives from automatic repeated requests. Flight call timeout raised from 45 seconds to at most 120 seconds, still bounded by the existing turn deadline with five seconds reserved for the reply. No silent date/Plan changes or new retry loops.

Tests: 248 passed across test_canvas_semantic_travel.py, test_canvas_travel.py and test_research_flights.py. Includes correctable LON/NYC/unknown codes, sanitized provider errors, explicit new-turn retry, same-turn retry blocking, timeout bounds and existing actual SSE→React journeys. Existing LangGraph deprecation warnings only.


Runtime verification: travella-local skill precheck validated the existing Cognito configuration. Rebuilt only travella-research-preview (http://localhost:5175, auth 8004, agent 8104); authentication sign-in/session/sign-out smoke passed. Four changed runtime file hashes matched. Original 5174 stack and all volumes preserved.

Live model/browser verification: authenticated example-user isolated Chrome session, test-created Plan 270adb47-fb97-451e-8a78-ddfbc8e83b4f. Exact dates October 23–26, 2026 and one traveler seeded through existing Canvas API. Prompt requested Budapest–London, explicitly one adult, pricing country Hungary, any London airport, keeping dates. Actual SDK chose Heathrow, explained the choice and rendered three A2UI cards from 91 bounded results. Connector probes returned 100; the agent's existing payload-size bound reduced its independently requested response to 91 and labeled truncation. No inventory was fabricated. Screenshot: implementation/heathrow-chat-results.jpg.

Browser console has no errors (existing Lit dev-mode warning only); Plan, capabilities and both chat streams returned HTTP 200. Morning/evening preference matching remains a limitation: the current model tool summary exposes prices and labels, while full times live in card details, so the model honestly directed the tester to inspect times. This fix does not add time-of-day filtering.

Source commit: 3d9e7ff.


Follow-up live model check: “Yes, try Gatwick instead, keeping the same dates and passenger.” No repeated intake questions or tool-unavailable refusal. The SDK searched BUD–LGW and rendered three previews from 81 bounded options, preserving October 23–26 and one adult. Screenshot: implementation/gatwick-followup-results.jpg. View all flights opened the manual page preloaded with BUD, LGW, dates, Hungary and all 81 results, ten on the first page. Saved Plan revision remained 2 throughout both searches and navigation.

Scope limitation: original failed tool arguments were not persisted; the city-code reproduction is confirmed, but attributing that exact code to the original failure remains an inference. The live provider is sandbox inventory; no booking or charge was attempted. No frontend source or backend CRUD behavior changed. Existing tests passed; no requested verification remains blocked.

Cleanup: deleted only the test-created Plan through the UI; subsequent GET view=deleted returned HTTP 200 and lifecycle=deleted. User Plans untouched.
