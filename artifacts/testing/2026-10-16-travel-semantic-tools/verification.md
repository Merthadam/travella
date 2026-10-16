# LLM-driven Canvas travel tools

## Defect and design correction
The reported bare-city follow-up “obertauern” dropped the active search because host regexes required a recognized keyword or labeled answer. The prior vocabulary patch did not fix this design. Host-authored questions and no-argument tools prevented the LLM from using its understanding of the conversation.

Source commit `c66dff4` removes the keyword/readiness gate from the **Canvas** path. The model always has the read-only travel tools, interprets bounded conversation/current draft, supplies typed arguments, and writes clarifications/answers. The server still validates required fields, ISO dates/ranges, date evidence, identity, bounded calls and observed provider selections. Search cannot save a Plan or book. Location lookup is independent of room/date completion. Known unambiguous locations may be normalized by the model; ambiguous ones require clarification.

Date semantics are now the LLM's responsibility. The host verifies typed exact dates and either equality with the current exact Canvas dates or verbatim date quotes from authenticated traveler turns. It does not attempt to parse natural language with regexes. This is intentionally distinct from a deterministic semantic proof of the model's interpretation.

The separate Research-only flight dispatch still uses its existing path; this change does not claim to replace that flow. No frontend layout or CRUD implementation changed.

## Automated verification
- `uv run --locked pytest services/agent/tests/test_canvas_travel.py services/agent/tests/test_canvas_semantic_travel.py services/agent/tests/test_research_flights.py services/agent/tests/test_agent_checkpoint.py -q`: **245 passed** in 19.95s.
- Includes 25 new independent structured-tool tests: bare city and natural room clarification, no-keyword tool calls, no-search conversation, stays and flights, invalid/missing criteria, forged/assistant date evidence, explicit search-only date override and early location lookup.
- Legacy provider/projection tests now generate scripted model arguments using their existing synthetic vocabulary. They are explicitly not claims about live model language understanding. Independent new tests bypass that parser, and browser checks below use the actual model.
- `uv run --locked pytest services/agent/tests/test_research_worker.py services/agent/tests/test_agent_turn.py services/agent/tests/test_agent_state.py services/agent/evals/test_canvas_travel_eval.py -q`: **49 passed** in 10.59s.
- Existing cancellation, late-generation discard, bounded snapshots, privacy/checkpoint and real SSE→React cases pass. `git diff --check` passed.

## Reproduction before rebuild
Authenticated Chrome DevTools using the configured example account in isolated context on5175. Created own test Plan `462550e0-ce14-4d6d-8c78-09098d406172` and saved Canvas through the application API/challenge: destination exactly “Obertauern” (not confirmed), dates2027-02-01 to2027-02-07, two travelers. Saved revision2. User's Plan and original5174 browser/stack untouched.

Actual browser conversation against old code:
1. “okay can you show me some accomodations in obertauern?” → fixed city/country question with required destination label.
2. “obertauern” → model asked for room/nationality in labeled form.
3. “yes we're both adults sharing one room and we're Hungarian” → same fixed city/country question again.

Captured and inspected `plan/repeated-city-question.jpg`: repeated question visible below the natural explicit answer. No provider result.

## Deployment
Read-only Cognito precheck passed. Rebuilt only `travella-research-preview` with ports5175/8004/8104 and matching localhost origin; both volumes retained and5174 stack kept running. Startup authentication smoke passed. SHA-256 matched checkout against running container for editor, semantic tool module, shared provider engine, prompt and Canvas skill. Reloaded only own test tab, retaining its saved Canvas/conversation.

## Live model verification
Continued the same broken conversation with the single word **“obertauern”**. No fixtures injected; actual SDK and configured LiteAPI sandbox. The LLM normalized Austria, reused the natural two-adults/one-room answer, nationality and exact Canvas dates, and called the search successfully. It wrote its own contextual answer rather than a host template. Returned one observed stay, Sporthotel Cinderella, for Feb1–7 2027; sandbox and inventory-limit labels remain visible.

- Inspected `implementation/natural-city-recovery.jpg`: model answer, exact dates and provider labels.
- Loaded hotel photo verified and inspected in `implementation/stay-photo.jpg`; no clipping/overlap in the visible card, normal chat scroll reveals remaining details.
- Clicked View all stays. Existing manual form preloaded Obertauern, AT, datesFeb1–7, nationalityHU, currencyEUR, one room/two adults and the same result. Inspected `implementation/preloaded-stays.jpg`. Navigation issued no new search request.
- Back to plan chat retained the preview. GET Canvas still revision2, destination exactly Obertauern, final=false, original dates and travelers. No durable confirmation/save/booking occurred.
- Relevant session/context/capability/agent requests200. No console errors; only existing Lit development warning.


Additional live date check: “Could we go next month instead? Look for somewhere to sleep then.” returned a model-written question asking for exact check-in/out dates, retaining the room/destination context. No new preview appeared; previous search was marked replaced. Next follow-up uses natural spoken date words to verify conversation-date tool input.


Follow-up “Actually, from March first to March seventh in 2027.” was interpreted by the real model as2027-03-01 through2027-03-07 and accepted through the conversation date-evidence tool contract. Search returned four sandbox stays, three displayed with loaded photos. The cards explicitly labeled dates as search-only. Inspected `implementation/natural-date-override.jpg`; original February Canvas dates visible alongside March search dates. GET Canvas still revision2, February dates, Obertauern final=false. All additional relevant requests200 and console clean except existing Lit warning.

No new responsive layout was introduced; full unrelated suites and production-provider booking were not exercised. This verifies the reported Canvas conversation/tool issue, not a claim that every possible model interpretation is deterministic.

Cleanup: deleted only own test Plan462550e0-ce14-4d6d-8c78-09098d406172 through the UI. GET view=deleted returned200 with lifecycle=deleted. User Plan and both database volumes preserved.
