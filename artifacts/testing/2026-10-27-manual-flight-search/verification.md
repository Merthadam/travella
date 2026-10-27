# Milan all-airports flight search

## Change

The connector recognizes MIL as MXP, LIN, or BGY at each return-flight endpoint. Individual airport searches still match exactly; date and segment-continuity checks remain in force. Sandbox verification and prebook reject a change to the selected offer's actual origin/destination airports.

Scope is the confirmed Milan defect. Other metropolitan codes are not added by this patch. No frontend, durable CRUD handler, or schema source changes.

## Verification

- `uv run --locked pytest services/mcps/tests/test_liteapi.py services/mcps/tests/test_flight_checkout.py services/mcps/tests/test_travel_security.py services/agent/tests/test_travel_api.py services/auth/tests/test_travel_proxy.py -q`: **55 passed** (existing dependency deprecation warnings only).
- Added regression coverage for MIL as origin/destination, all three airports, differing outbound/return Milan airports, unrelated airports at every endpoint, exact-airport selections, wrong dates, and sandbox verification retaining the selected airports.
- `git diff --check`: passed.
- Rebuilt `travella-local-single` from this worktree. SHA-256 comparisons of both changed runtime modules matched in the app and travel-mcp containers.
- Local authentication checker: sign-in, session check and temporary sign-out passed. App container is healthy.
- Authenticated POST through `http://localhost:5174` for BUD–MIL, 2026-10-28 through 2026-10-30, two adults, HU, EUR, economy: **HTTP 200, ready, 100 results in 3.8 seconds**. Previously HTTP 502. Asserted all four route endpoints and both departure dates for every result. Temporary session signed out.
- No Plan writes or live booking actions performed. Sandbox verification behavior was tested with isolated fixtures.

## Local environment note

Rebuild exposed an existing shared-database mismatch: another checkout had already applied revision 0012 while main has source through 0011. Confirmed the database revision was 0012, inspected the additive `0012_topic_conversations.py` migration from `locrian-peacock`, and copied that existing migration into the stopped local app container before restarting it. Database revision remained 0012; no downgrade, stamping, or volume deletion occurred.

That migration file is a local runtime compatibility repair, not part of the committed flight fix. Recreating this container from main before migration 0012 is merged will require restoring the same migration file again (or using an isolated database). Source: `../locrian-peacock/services/crud/migrations/versions/0012_topic_conversations.py`; runtime destination: `/app/services/crud/migrations/versions/0012_topic_conversations.py`.

## Browser limitation

Chrome DevTools MCP remains blocked by an already-running profile. No completed browser verification or screenshot evidence is claimed. This change is restricted to the private connector; the frontend/CRUD-change gates do not apply. The live authenticated HTTP path, provider results, and connector regressions above were executed successfully.
