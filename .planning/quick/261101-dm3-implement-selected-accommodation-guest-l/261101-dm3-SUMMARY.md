# Selected accommodation guest layout A implemented

User decision: “lets add that somehow to proto A and lets implement it.” This selects continuous-form A with optional per-room requests, superseding the previous pending selection. Prototype refinement committed separately as `7b01442`; production code rewritten using existing checkout/theme components in `be5e319`.

Added booking contact name/email, explicit booking-for choice, one main guest per room, visible optional 500-character requests and exact review before test consent. Requests map to LiteAPI guest remarks; contact remains distinct from guests. Blank requests omitted, invalid input rejected before dispatch, safe correction allowed only for proven public validation rejection, and uncertain-outcome recovery preserved. No separate arrival control; preferences can be written in requests. Original redundant summary-card removal preserved.

Verification: 61 focused frontend tests, 79 backend tests, final build, canonical Docker source/auth checks, and authenticated Chrome DevTools desktop/narrow-viewport journey passed. One actual two-room LiteAPI sandbox booking submitted both requests once. Confirmation saved/downloaded and recovered after reload. Dedicated Plan deleted and absence verified. Provider room-assignment inconsistency remains explicitly labeled; requests are not guaranteed or retained in durable confirmation data.

Evidence: `artifacts/testing/2026-11-01-stay-guest-details/verification.md`. Live app: http://localhost:5174/plans. Prototype: http://localhost:5199/plans?prototype=stay-guests&variant=A. Local servers retained for review; owned isolated browser closed. No merge/push/deployment. Broader phase acceptance unchanged.
