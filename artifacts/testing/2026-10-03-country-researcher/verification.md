# Country Research Chat Planning Evidence

## Prototypes

Three interactive UI directions were explored and captured:

- [Clean Chat](plan/variant-a-clean-chat.png)
- [Research Replies](plan/variant-b-research-replies.png)
- [Research Thread](plan/variant-c-research-thread.png)

The user selected a pure full-screen chat direction and declined a context drawer. Prototype interactions were simulated; they did not call the real Agent, Tavily, CRUD, or user memory.

## Checks performed on the prototype

- Exercised each variant's in-chat interaction and citation affordance in Chrome DevTools.
- Checked a 390px viewport for horizontal overflow and confirmed no context/source side panels were present.
- Inspected console output after the prototype fixes; the final interaction pass was clean.

## Limits

These screenshots document the design baseline only. The production page, authenticated Plan route, real streaming transport, cancellation, persistence, and live API error states have not yet been implemented or verified.
