# Search design study — throwaway prototype

Question: how should accommodation and return-flight search open from the Plan's A2UI cards?

Three variants live inside the authenticated `/plans` page, keeping the existing application header and account access. User requested these alternatives before choosing the production design. All offers, maps, reviews, prices, search responses and selections are illustrative; no provider calls, reservations or durable Plan writes happen here.

Start the configured local stack from the repository root:

```sh
npm run prototype:search --prefix frontend
```

This uses the isolated `travella-liteapi-preview` Docker project at port 5374 with its own test database. It requires the existing ignored local environment files and Docker; it does not fetch or display the LiteAPI key. Sign in with the usual example account.

| Variant | Approach | Preview |
| --- | --- | --- |
| A | Familiar filter sidebar and result list, with room/fare details | http://localhost:5374/plans?prototype=liteapi-search&variant=A&mode=accommodation |
| B | Accommodation map/list and flight departure timeline | http://localhost:5374/plans?prototype=liteapi-search&variant=B&mode=accommodation |
| C | Side-by-side comparison table | http://localhost:5374/plans?prototype=liteapi-search&variant=C&mode=accommodation |

Use the Stays/Flights tabs, bottom switcher, or left/right arrow keys. Arrow keys inside form controls and open dialogs keep their usual behavior. `mode=flights` opens flights directly. Variant and mode survive reload via the URL; sample selections intentionally reset. Back to plan exposes the actual flight/accommodation entry components with sample props.

Try sorting, filters, map pins, flight timelines, details, choosing a room/fare, and comparing two offers. Search for a city other than Rome to see the empty state. Expand **Preview controls & state** to simulate an error or inspect the current in-memory state. Edited criteria never imply fresh provider results: the sample dates and party size remain labeled.

Capture branch: `prototype/liteapi-search-layouts`. Decision: pending user selection. The implementation task and contract are in `.planning/quick/261009-14y-rebase-on-main-and-implement-liteapi-acc/261009-14y-PLAN.md`. Once chosen, build the winner against the private LiteAPI connector, record the decision, and remove the prototype imports, task, files and losing layouts from the implementation branch. Keep this capture branch as the design source.
