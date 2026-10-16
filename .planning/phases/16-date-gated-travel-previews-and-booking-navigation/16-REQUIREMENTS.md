# Phase 16 requirements

- TRAVEL-16-01: Only the Planning Canvas agent can use bounded, Plan-authorized flight/stay search tools through the existing private connector.
- TRAVEL-16-02: Searches require valid exact dates and other mode-specific inputs; missing/ambiguous requirements prompt clarification without provider calls or silent durable changes.
- TRAVEL-16-03: An allowlisted agent skill guides requirement collection, search, previews, and explicit navigation; checkout tools remain unavailable to the agent.
- TRAVEL-16-04: Validated A2UI previews show up to three observed options, provider, exact dates, honest price basis, sandbox/freshness notices and material terms; fabricated/model-authored provider facts cannot enter cards.
- TRAVEL-16-05: View all flights/stays opens the existing manual flight/accommodation page with matching full results and editable search criteria preloaded; back navigation preserves draft and chat, and stale/expired/reloaded searches recover honestly.
- TRAVEL-16-06: Loading, empty, failed, interrupted, superseded and changed-criteria states do not expose obsolete options as current or imply bookings/saved choices.
- TRAVEL-16-07: Tests, authenticated Chrome desktop/mobile interactions, inspected before/after evidence and regression checks verify the journey; any unavailable live-provider/model checks remain explicitly unverified.

### Latest acceptance clarification (2026-10-16)

TRAVEL-16-04 requires visible pictures in side-chat previews (observed hotel photos; honest flight imagery/fallback). TRAVEL-16-05 requires the existing manual flight/accommodation page, with criteria and same result set preloaded and editable/filterable/detail controls retained. A separate results-only page does not satisfy the user. No automatic search on navigation, checkout or durable Plan mutation.
