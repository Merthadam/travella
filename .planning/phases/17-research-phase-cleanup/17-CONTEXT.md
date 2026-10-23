# Phase 17: Research phase cleanup

Captured 2026-10-23 from the user's design discussion and accepted prototype C. Planning only; do not execute automatically.

<domain>
Research step of an existing Plan, including its agent-guided transition into the existing draft-generation flow. Desktop is the current design/verification target. Existing Draft plan canvas rendering, editing, generation workers, saving, provider search and booking are outside the cleanup scope.
</domain>

<decisions>
### Scope and appearance
- **D-01:** Change only Research and its explicit handoff; leave the Draft plan canvas unchanged. Desktop only for this iteration.
- **D-02:** Keep a quiet full-width Research → Draft plan state bar. Remove separate header blocks, outer seams and prominent top-level Generate controls.
- **D-03:** Retain the existing real editable A2UI Trip Brief. Show a green completion-count circle that can be dragged; click opens the brief in front of the conversation. Opening, closing and moving it must not move agent text or composer.
- **D-04:** Keep brief data/readiness/manual draft access inside the brief, with a natural contextual offer in chat. Keep the conversation compact; no reserved sidebar or empty height when brief is closed.
### Agent timing and traveler control
- **D-05:** After destination confirmation, explain that a draft comes next while continuing useful research. A destination alone must not trigger generation or the readiness offer.
- **D-06:** Once there is enough useful trip context, offer Review & create draft and Keep researching inline. Readiness is not a requirement to complete every brief field or reach 6/6.
- **D-07:** Respect continued research and deferral; do not repeatedly push the same offer.
- **D-08:** Review current details and explicitly confirm before generation. Keep explicit flight choice and separate Save plan semantics. Agent prose or an offer alone never generates or saves a Plan.
### Quality and selection
- **D-09:** Preserve auth, Plan isolation, revision/idempotency rules, cancellation and stale-event protection. A stale offer cannot silently generate from changed details.
- **D-10:** Prototype C's draggable overlay is the selected visual direction. Rewrite production components; keep throwaway mocks, inspector and variant switcher out of production. Verify real desktop behavior and document evidence.
</decisions>

<discretion>
Implementation defaults, not extra user claims: start the circle near the lower-right of the research workspace; remember position only for the mounted Plan, clamp on viewport resize; support keyboard movement and Escape. A click on Keep researching suppresses proactive re-offers for that Plan until the traveler explicitly asks for a draft; manual brief access stays available. Ordinary unrelated edits do not reset suppression.

Proposed readiness baseline: confirmed single destination, dates or explicit flexible timing, positive traveler count, and traveler-grounded trip priorities/context. Budget, accommodation and flight decisions may remain open at offer time. Flights must be explicitly resolved in review before generation. Current chat prompt's stricter pre-offer flight rule is superseded by this accepted review-first flow. Validate this through eval cases, not a hardcoded priorities=true flag.
</discretion>

<specifics>
Prototype source: branch prototype/full-width-state-bar-20261023, commit 1c3e236; planning baseline 8f0a2f6.
Visual evidence: artifacts/testing/2026-10-23-floating-brief/verification.md and plan/*.png.
The inline offer itself is a newly agreed interaction, not an already verified prototype feature; include its planned visual sketch and implementation capture in delivery.
</specifics>

<deferred>
Mobile redesign, canvas redesign, generation quality/provider improvements, saved-options/bookings, production deployment, and unrelated baseline failures. Phase 15 acceptance remains pending independently; do not mark it complete here.
</deferred>
