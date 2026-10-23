# Research offer orchestration contract

Selected Framework: existing LangGraph + Claude Agent SDK conversation loop. No framework replacement, extra agent, new generation tool or extra model call.

## Input/output

Pass canonical current brief/context, Plan-owned deferral state, eligibility constraints and authorized bounded message references into the existing SDK turn. Add an optional typed draft_offer proposal with a small reason enum and priority-message references; not arbitrary labels, executable UI, URLs or model-supplied Plan IDs/revisions. Server constructs public offer IDs, revision, message association, labels and status after validation/commit. Omit proposal on ambiguous context. Never infer confirmation from model text, tool results or retrieved pages.

## Offer policy

Required code gate: explicit chosen destination, explicit date range/flexible timing and positive traveler count, valid current Plan preference evidence, no conflicting/stale context, eligible completed turn and no active generation. Semantic recommendation considers whether the current question has been answered and useful trip priorities are understood. Budget and accommodation can remain undecided. Flight needs are resolved during explicit review if still unknown; update old chat-v1 pre-offer flight requirement to prevent conflicting prompts.

The agent may say a draft comes next before readiness, but cannot expose an actionable offer before the gate. Offer once per server fingerprint. Keep researching persists suppression until a new explicit traveler request for a draft; no repetition after restart, unrelated changes or message replay. Plain-text deferral must produce the same bounded deferral intent as the UI action, validated against the current traveler message. A generic yes to an unrelated question is not generate intent.

## Evaluation strategy

Deterministic fixtures and recorded conversation scenarios: candidate-only, confirmed destination only, missing timing, flexible timing, missing travelers, optional budget, no priorities, contradicted priorities, explicit deferral, vague yes, repeated ready turns, explicit later request, destination change, missing flight choice, stopped/malformed turn, prompt-injected generation request from a source, cross-Plan references, long/reloaded history and existing saved draft. Assert zero automatic generation/save across all cases; no premature actionable cards; correct review-only actions; no duplicate/renewed offers after deferral. Eval legitimate eligible cases for useful invitation rather than asking every field. Run live model checks only when authorized/configured and record model/cost; no paid calls during planning.

## Monitoring and privacy

Record only outcome enums, counts and elapsed times under existing redaction; never raw chats, priorities, credentials or rationale. Stop rollout on cross-Plan offer, unconfirmed generation, or stale confirmation acceptance. Separate deterministic contract coverage from live-model quality evidence.

## Scope

Agent changes concern Research intent/offer timing only. Canvas generation workers, prompts and saved-canvas semantics remain unchanged.
