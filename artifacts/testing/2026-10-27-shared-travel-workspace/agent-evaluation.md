# Shared workspace — model and provider evidence

Status: bounded samples executed; full live-quality acceptance remains pending. Deterministic fixtures are recorded separately in per-plan summaries.

## Provider metadata

On 2026-10-27, the existing local private MCP LiteAPI adapter performed a read-only BUD–LIS return search for 12–17 May 2027, two adults, economy, EUR. The sandbox returned 100 normalized offers. Raw response was inspected in memory only; recorded metadata was limited to field names and URL origins.

Observed fields: `marketingCode`, `marketingLogo`, `marketingName`, `operatingCode`, `operatingLogo`, `operatingName`. Observed logo origin: `https://assets.nuitee.flights`. After normalization changes, actual Chrome images for Nuitée Air, Lufthansa, Austrian and Brussels loaded successfully; mixed-carrier identity remained visible. See [carrier capture](implementation/live-carriers-step09.png).

No booking, payment or reservation request was made. The first adapter invocation used the wrong Python environment and stopped before provider invocation; the `/app/.venv/bin/python` retry succeeded.

## Live SDK samples

All samples used the actual authenticated browser, focused Claude SDK worker and existing Plan graph. These are bounded observations, not a comprehensive recommendation-quality score. Server tool-call metrics were unavailable in the safe logs; no exact call counts are inferred from browser requests.

| Sample | Intent and observed result | Verdict |
| --- | --- | --- |
| A — current flights | Lower-price BUD–LIS return, fixed dates/party. Worker disclosed that it reused existing evidence without fresh search or fare verification. Air France EUR633.98, Swiss/Austrian EUR692.40 and direct Nuitée Air EUR802.94 matched readback. Topic had two messages, three comparison options, no saved choice and no lock. | Grounded prices/tradeoffs; one unknown-baggage phrasing defect discovered |
| B — shared local view | Runtime6745718; current results only, direct both ways, lowest total, no search/save. Host-completed batch changed56→1 in main frontend. Undo restored56, original order and original timestamps. Reply accurately attributed prior Air France evidence. | Actual SDK→tool→commit→main-view→Undo passed |
| C — dirty draft precedence | Typed13May departure while evidence remained12May, then requested price sorting. Worker declined to mutate until edits submitted/discarded. Typed date, provider order,56results and original browser search count remained. It described only the10previewed options as examined. | Manual precedence and bounded grounding passed |
| D — accommodation | Runtime78d4d6d; loaded27Apartments, inspected exact rooms and saved EUR710.09 room. Requested current-results price sorting and room-amenity unknowns without search/save. Reply interrupted with sanitized ValueError; saved choice stayed intact. | Initial failure; successful bounded retry below |

Sample A said missing checked-bag evidence was treated as not included. Plan18-08 corrected the prompt/regression to require unknown/not confirmed; B/C used the corrected wording. Sample B exposed lost new composer text during a normal reply; plan18-10 corrected it, with final browser retest pending.

## Acceptance boundaries

The full AI-SPEC matrix (hard constraints, all tradeoff decisions, broader multi-turn adversarial/provider cases and suitability judged by the traveler) remains open. These samples do not close Phase15/17 acceptance gaps or imply any supplier booking. Sandbox inventory is labeled throughout.

## Resumed Stays sample — 28 October

Runtime6ea7341, actual authenticated Claude SDK with28current stays. Asked for current-results price sorting, one price tradeoff and unknown room amenities, with no search/save/replacement. Host batch selected price sort and exposed Undo. Reply compared Hotel Roma EUR515.16 with Jupiter Lisboa EUR729.68 and distinguished unknown private kitchen/quietness from property facts. Saved room remained EUR710.09, revision7, ready/unbooked. New unsent composer text and focus on the date field survived completion.

The initial ValueError did not recur; its specific cause remains unproven. Safe diagnostics were added without logging arbitrary exception values. This successful retry does not prove why the earlier sample failed. The response printed internal room IDs; fe3c78c adds a prose rule to use readable property/room names while keeping exact IDs in structured fields.22specialist tests passed after that prompt change.

## Final exact-room discussion sample

Runtime4a283d0: main comparison contained Double, Standard and Twin, Standard at Meliá Lisboa Aeroporto, eachEUR943.54 from separate observed rate searches. An ordinary composer send carried two exact room references through the existing structured discussion. Actual SDK response distinguished room names, stated actual bed configuration was unconfirmed, matched price/tax/cancellation facts, preserved quietness/room-amenity unknowns, and left the savedEUR710.09choice unchanged. It printed no internal room IDs. Readback contained both room references. This closes the reproduced exact-room discussion defect; full recommendation-quality coverage remains open.
