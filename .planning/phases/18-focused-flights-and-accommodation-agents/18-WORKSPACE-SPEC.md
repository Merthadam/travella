---
phase: 18
status: planning
updated: 2026-10-27
---

# Shared Flights and Stays workspace

## Outcome and authority

A traveler can search, narrow, compare and choose entirely in the main workspace, entirely with agent assistance up to explicit choice, or by alternating between both. The side chat explains and investigates the same options. Flights and Stays remain trip substages. This approved correction supersedes the chat-centric recommendation browser and “View all results” import step delivered in quick261026-ksg. Existing durable conversations, choices, brief and specialist runtime are reused.

Planning only. This document describes intended behavior, not implemented behavior. Implementation must preserve the earlier phase evidence and outstanding Phase 15/17/18 acceptance gaps.

## Interaction contract

1. Open Flights or Stays on the main search/results area. The existing Canvas chat dock is alongside it on desktop and one tap away on mobile. Opening performs no supplier search. Prefill from saved trip context; identify exploratory criteria that differ from saved dates/party.
2. Search manually, or send an explicit search request in topic chat. Missing essential inputs become a concise question or inline form requirement. Search results appear in the main list, with a count and applied filter chips. The agent may search and inspect further within the existing per-turn budget.
3. Manual controls and agent actions use the same supported criteria and result identity. Apartment type and amenity IDs come from provider catalogs. Room-level kitchen claims require room evidence. Sorting and view-only filters do not incur a supplier search; criteria requiring fresh inventory do.
4. Result cards offer Details, a Compare checkbox and Dismiss. A small Dismissed control restores items, and the latest dismissal has Undo. Agent dismissal must follow the user's stated constraints; uncertain matches remain visible with unknown facts. Saved preferred/shortlist records are not deleted or changed by dismissal.
5. Selecting two or three options reveals a Compare action. It opens a main-area factual comparison and starts a side-chat discussion using exact structured references. Main comparison is usable even if chat is unavailable; explain that the discussion could not start and allow retry. Checking boxes alone never sends. Keep the unsent composer draft. A fourth selection is disabled with a readable maximum-three hint.
6. “Find something like the second one, but cheaper” searches again. The agent grounds “second” against the current ordered comparison context supplied for that turn, not old transcript text. Old comparison evidence stays labeled historical when new inventory replaces it; new results are not falsely presented as equivalent offers.
7. Details and comparison offer Choose for trip. For stays, select an exact room/rate first; for flights, an exact return fare. Use existing host-authored review and explicit CRUD confirmation. Save to shortlist remains accessible in details without cluttering list cards. No choose action relies on the model to authorize or commit a selection.

## Shared state and ownership

Planning default: use one client workspace controller per owner/Plan/topic, with a typed, bounded Agent workspace action projection. Keep the current server-side research registry for normalized evidence and reference resolution. Do not add a second orchestration graph, service, database table or durable “search document” merely to synchronize two panes.

State distinguishes editable search form values, applied search criteria, local filters/sort, active search reference, result IDs, dismissed IDs, comparison references, details target, request generation and workspace version. The same controller drives manual UI and agent effects. The research registry, normalized provider observations and server-side authorization remain authoritative for option facts; client context is advisory and validated.

Manual field edits immediately advance the workspace version, even before Search is submitted. Filter/sort/dismiss/compare edits also advance it. Agent effects are bound to the originating owner/Plan/topic, shared-brief version, run ID and starting workspace version. Apply only a successful validated current-turn effect; never replay it merely because history was reloaded. Reject unsupported actions, invented IDs, oversized payloads and stale registry references.

Manual search and local controls stay usable while an agent is running. Editing or starting a manual search invalidates the pending agent's permission to replace that workspace. Supplier requests may finish, but late outcomes cannot repaint the current list. Existing Stop and Plan run lease govern cancellation and new chat turns. A brief notice may say “Your newer search was kept”; do not auto-merge incompatible searches. Pure scrolling does not invalidate a turn. Opening details is preserved if a new result set arrives; label detached details with their original search/freshness rather than closing them or rebinding their ID.

Keep completed results visible while refreshing; show “Updating results”. Stale/invalid exact evidence blocks acceptance. Opening details and selecting a room for review stay available during a chat turn; a durable confirmation must wait for the existing Plan lease/cancellation and latest revision to resolve, with an explicit waiting/retry state. A model failure or history-load failure by itself must not prevent the deterministic manual review/confirmation path once that lease is clear. Do not require a successful model reply or another chat send. An unavailable Agent/CRUD service is an honest service error, not a claim that manual confirmation succeeded. Failure leaves prior evidence visible with its original timestamp and a deliberate retry. Empty success shows zero matches with active constraints and edit/reset actions; never silently relax filters.

Reopen within the current browser tab restores workspace state per owner/Plan/topic using the existing Canvas recovery conventions. Persist only allowlisted bounded criteria/UI references, not raw supplier payloads or private checkout handles. Reload resolves stored search references through the authorized registry; expiry, eviction or restart yields an honest “Search again” state while durable conversation and preferred choices still load. Separate tabs have independent temporary workspace versions; durable choices remain revision checked across tabs.

## Card and comparison information

Flights: airline logo/name; outbound and return local departure/arrival dates/times and airport codes; each leg's stops/duration; baggage inclusion or unknown; total return price for the whole party and currency; cancellation/refund facts; provider source, observed time, sandbox and expiry labels. Keep full itineraries and operating-carrier/codeshare facts in details. Mixed-carrier routes identify both carriers; do not derive carrier identity from flight-number string slicing or a model guess.

Stays: photo or placeholder; property name/type; location; review score/count when observed; total stay price and party/night scope; cancellation/refundable facts; critical amenities with property-versus-room distinction; source and freshness. Unknown is different from false. Do not fabricate distances to activities; use actual coordinates/calculation or label unknown.

Comparison displays the same fields in two or three aligned columns on desktop and readable stacked sections on narrow screens. Show comparable date/party/currency scope; label incompatible or historical observations instead of ranking raw totals as equivalent. The side chat states the best checked fit and its tradeoff, not a claim to exhaust all inventory.

Airline logos use the observed supplier's `marketingLogo` / `operatingLogo` with its corresponding `marketingCode` / `operatingCode` and names, documented in the [LiteAPI flight rates response](https://docs.liteapi.travel/reference/post_flights-rates). Extend normalization and every strict projection that currently drops these fields. Verify actual image origins during the execution sample and apply the existing safe image conventions with a dedicated bounded origin policy. Relative URLs without a documented base, unknown/missing/error images use a neutral airplane symbol with the airline name preserved. Provider logo and airline logo are not interchangeable. Do not introduce an unverified public logo CDN, invent airline-code mappings or require a new branding service.

Source attribution stays separate from booking. Show provider/source text even without a deep link. Only use validated HTTPS provider/source links when actually supplied or verified; do not synthesize an exact-offer URL. Any existing external booking handoff remains governed by the saved-option server-generated verified-host contract.

## Agent capabilities and bounds

Retain topic-enforced read-only search/detail/review/room/fare tools and existing ten-call total, up-to-three rate searches, up-to-six inspections per turn. Expose a small host-validated workspace capability set: read current workspace context, search with supported criteria, apply view filters/sort, dismiss/restore current observations, and inspect/compare referenced options. Manual controls use the same semantics. These are logical capabilities, not a requirement for six new public MCP endpoints.

Host validation separates temporary research changes from durable Plan changes. The agent cannot choose, remove a saved choice, mutate trip facts, make payment, reserve or book. A natural-language hard requirement is not relaxed merely to produce results. Bound all ID lists and context sizes; user-facing explanations reveal facts and concise action summaries, not internal reasoning or tool logs. Reuse signed topic completion and AG-UI boundaries where suitable; settle exact wire paths in the research/implementation plans.

Delivery default: stream conversational progress, then apply one validated final workspace batch after successful topic completion. The batch has one Undo, and multiple provider calls within the turn do not repeatedly reshuffle the list. This is an implementation choice for simplicity, not a requirement for the user to approve each read-only call. Manual input during the turn suppresses that batch. Undo restores prior temporary search/view state, checks evidence freshness and advances the workspace version; it does not undo durable selections or rewind the transcript.

## Edge Coverage

| Edge | Verification | Acceptance |
|---|---|---|
| Manual form edit while agent searches | explicit | Newer typed values and results survive late agent completion; no phantom applied filters. |
| Manual search while agent searches | explicit | Manual search remains enabled; only its current generation updates the list. |
| Sort/dismiss/compare during turn | explicit | Pending agent cannot overwrite newer view choices; scroll alone does not invalidate. |
| Stop/topic switch/Plan switch | explicit | Obsolete effects never repaint another scope or replay on reload. |
| Provider failure/empty results | explicit | Old evidence remains labeled on failure; empty success keeps exact constraints and provides recovery. |
| Compare unavailable or expired evidence | explicit | Factual UI remains usable; expired acceptance is blocked; fresh search/retry is explicit. |
| Different dates/party/currency | explicit | Incompatible prices are visibly labeled and not presented as a like-for-like ranking. |
| Exact room versus cheapest property price | explicit | Discussion/review/confirmed choice all identify the same observed room and rate. |
| Dismiss saved option | explicit | Only temporary visibility changes; saved record/readiness unchanged; Undo restores visibility. |
| Missing/broken/mixed carrier logos | explicit | Names remain readable, mixed carriers identifiable, neutral fallback without broken-image glyph. |
| Mobile/chat collapsed/keyboard | explicit | Complete manual flow works, independent scroll/composer stays usable, selection and draft survive toggles. |
| Cross-owner/Plan/topic or forged references | explicit | Server rejects before evidence lookup/application; no cross-scope data disclosed. |
| Reload/registry expiry/restart | explicit | No automatic fresh supplier call or historic effect replay; saved history/choices survive, transient evidence honestly expires. |

## Prohibitions

| Prohibition | Required property |
|---|---|
| Chat-only primary search | Entire manual journey works with chat closed or unavailable. |
| Uncontrolled agent updates | Only validated current-scope/current-version effects change the temporary workspace. |
| Hidden durable changes | Saved Plan facts/choices require explicit existing confirmation. |
| Fabricated identity/source | Logos, source links, room facts and price scope derive from validated evidence. |
| Unbounded autonomy | Existing time/call/context bounds apply; no autonomous background loop after a turn ends. |
| False verification | Planning evidence is labeled as a sketch; production and live-quality acceptance remain unclaimed until executed. |
