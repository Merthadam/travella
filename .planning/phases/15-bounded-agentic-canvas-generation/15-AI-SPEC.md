# Canvas generation AI contract

Selected Framework: Existing LangGraph (Python) + Claude Agent SDK 0.2.163, running within the existing AgentCore deployment boundary.
Status: proposed execution contract, based on accepted behavior. No new framework or credential selection required.

## Responsibility split

LangGraph prepares a versioned context snapshot, assembles deterministic components, invokes two focused workers, controls one review/revision path for each, and publishes allowlisted results. CRUD exclusively saves approved canvas snapshots. SDK sessions are disposable and never own Plan persistence. AG-UI carries state/events; A2UI renders registered components.

Worker A: themes/preferences. Input is canonical current context + relevant read-only profile + conversation evidence. Tools disabled in generation, review and revision.
Worker B: findings and websites together. Input includes chosen destination, accepted themes and source evidence. Generation may search/read missing or stale information. Review is tool-free. Revision may use remaining targeted research allowance. Findings and websites share the same observed evidence registry.

## Bounded loop

Per worker group:
1. Generate structured candidate.
2. Validate schema, source ids and bounds in code.
3. Review once with the candidate and same input snapshot. Return {verdict: accept|revise, issues:[{component_id,item_id,code,instruction}]} with max 8 concise issues; no hidden reasoning.
4. If revise, make exactly one revision and run code validation again. No second review.
5. Publish a validated supported subset or a component-level unavailable result. Never label unsupported facts as supported.

If the initial candidate is parseable but fails schema validation, pass its bounded data plus validation errors to the one review; use the single revision for both structural and semantic repair. If no usable candidate was returned, stop with an unavailable result. Never silently skip review and publish a repaired candidate. If review fails or budget is exhausted before required review completes, do not publish that newly generated candidate as reviewed; preserve the previous valid draft and show Retry. After semantic revision, unresolved flagged items are removed or visibly uncertain according to code-enforced disposition. A matching quote establishes traceability, not factual entailment.

Do not wrap ClaudeResearchWorker.run() in this loop: it already performs research selection plus a second answer call. Reuse its lower-level isolated runtime and evidence observer to avoid duplicating generation. Track SDK schema retries inside the aggregate budget.

## Input preparation

- Snapshot is tied to plan_id, plan_revision, context_revision, history cutoff and generation_id; identifiers stay outside model prompt unless necessary for typed source references.
- Obtain Plan context/profile through existing authorized server readers. Include active values and explicit deletion/supersession information.
- Add an authorized sequence-cursor history read for generation, with one fixed upper sequence. Read a bounded complete span up to 60,000 prompt characters/500 messages. Do not silently trim early messages; return coverage_incomplete before model work if the complete relevant span cannot fit. Do not claim full recall from the last 12 messages.
- Role-tagged assistant messages can resolve what a traveler explicitly accepted; assistant suggestions alone are not preference evidence. Support a confirmation with both suggestion and acceptance source references. Current corrections and inactive-field tombstones win over older evidence; current Plan-specific instruction wins over saved preference.
- No arbitrary full graph/checkpoint, exact home address, credentials, user id or unrelated memory in prompts. Memory remains read-only.
- Sources and retrieved content are data, not instructions. Review uses the same source pack, never external prompt instructions.

## Output contract

Extend existing strict schemas, matching frontend/src/design-system/schemas.js. Code assigns stable component ids and safe binding paths. Theme items use kinds theme/pace/priority/must_do/avoid, max 20 items and 160-character text. Review source refs stay private; browser sees compact source labels.
Findings reference only observer-issued read evidence ids. Code derives titles/URLs from registry; the model cannot mint citation URLs. Useful links must be validated public HTTPS resources with an explained purpose. Current rules/schedules require fresh authoritative sources; stable advice may reuse sufficient evidence. Record researchedAt/freshness and supported/uncertain/conflicting/unavailable meaning. Private source excerpts never enter A2UI messages.

## Limits and cost

Engineering defaults, to tune after requested live evaluation:
- Low effort for every worker/reviewer. No automatic stronger-model escalation.
- Themes: aggregate $0.10 configured ceiling and 45-second deadline across generate/review/revise, not per call. Existing global lower ceilings still apply.
- Findings+links: aggregate $0.25 configured ceiling and 90-second deadline; at most 2 searches and 4 successful/attempted reads across generation and revision. Keep failed attempts counted.
- Full generation ceiling $0.35, deadline 120 seconds. Stop before a new stage if no remaining allowance. Provider billing may overshoot a configured ceiling by an in-flight call; report observed usage rather than promise exact enforcement.
- At most three SDK invocations per group; each structured invocation retains its own bounded protocol turns, included in aggregate cost. At most one semantic review and one revision, even after transport or schema failure.
- Reuse sufficient evidence; explicit Retry starts a new generation, never an invisible retry loop. Retry only requested component groups. No model call for deterministic mappings.

## Evaluation strategy

Manual acceptance cases to run during authorized implementation verification, not during planning; no automated test suite unless requested:
- Preference from an early message, correction later, explicit removal, saved preference overridden, assistant suggestion not accepted, explicit acceptance via reply, empty context, long history with disclosed coverage limit.
- Findings from read pages, failed page read, stale time-sensitive source, disagreement with both sources, irrelevant website, malicious page instructions, forged source id and invalid URL.
- Review accepts (2 SDK calls), review requests revision (3), schema repair uses the one revision allowance, reviewer timeout, exhausted aggregate budget, cancel during each stage.
- No wrong-traveler data, no unsupported booked claim, zero writes before Save plan, edits survive partial-generation failure, unknown types rejected.
Measure latency, billed usage, tool count, stage count and item/source fidelity with synthetic or example-account context. Release requires all structural limits to hold and manual review finding no invented personal preferences or unsupported factual claims. This is a focused acceptance sample, not a statistical guarantee.

## Observability

Log generation id, component group, stage, elapsed time, counts, token/cost totals and sanitized error code. Never log prompt bodies, source quotes, raw pages, keys or sensitive profile fields. Report review status and remaining uncertainty to the UI without internal reasoning. Cancel drops obsolete emissions and closes SDK subprocesses.
