---
phase: 18
status: findings
reviewed_commit: 6ea7341
diff_base: 608da14
depth: standard
---

# Shared workspace review

The GSD reviewer examined the follow-up diff and confirmed three correctness defects. Its first run hit the account usage limit; a resumed run supplied the reproductions below but did not finish writing its artifact before interruption. The orchestrator records the findings here. A complete clean-review verdict is not claimed.

1. **High — same-property exact-room comparison fails backend validation.** `selected()` deduplicates by option ID, so two room rates of one property raise `travel_option_unknown` after `TravelDiscussion` accepts the references. Removing only that guard still fails `Comparison.unique`, because normalized `ResearchOption.id` is the same property ID. Preserve full search/option/room identity through validation and normalized comparison IDs. Reviewer reproduced both failures with actual Python models.
2. **High — ordinary sidechat does not receive displayed exact-room comparison.** `TravelSearch.compareRoom` updates only local `comparison`; `workspace.view.comparison_refs` remains stale or empty. A follow-up about “the second option” can refer to different evidence from the visible main comparison. Keep exact ordered references synchronized through a bounded structured context, with server ownership validation and no provider payload pasted into chat.
3. **High — first authoritative brief can cancel manual choice.** If history is initially unavailable, the exact-review receipt first supplies `brief.digest`. The `relevantBrief` effect increments the operation epoch while `prepareTravelChoice` awaits, silently dropping the valid challenge. Reviewer mounted actual bundled `TravelWorkspace` with delayed prepare: one prepare call, no confirmation, no error. Initial hydration must preserve the operation while genuine trip-detail changes still revoke it.

## Resolution

All three reported defects have focused fixes and regressions:

- Finding1: `bb92e75` uses full exact-reference comparison IDs, preserves separate rates and leaves durable evidence UUID authority unchanged.85 worker/tool/HTTP/CRUD checks passed, including choose/replace/remove and a new database connection.
- Finding2: `490997b` forwards displayed ordered references through the existing independently authorized structured discussion context. Closing the comparison clears it; ordinary composer text is untouched.
- Finding3: `490997b` distinguishes first brief hydration from changed known digest or saved trip facts. Deferred preparation now shows confirmation; genuine changes still revoke it.109 focused frontend tests passed.

Final combined frontend regression:236passed,12conditional fixture skips. Final combined Python regression:705passed,6isolated-PostgreSQL skips,1 independently reproduced baseline onboarding404failure. Specialist prose follow-up22passed after final prompt edit. Browser verification is recorded separately. The interrupted broad review is not represented as an exhaustive clean audit.

## Additional browser finding — raw manual registry metadata

Fresh room registry HTTP200 responses carry empty draft_facts. Direct Canvas parsing rejected five required metadata fields before displaying comparison or historical details. The browser reproduced this; it was not an expiry error. `4a283d0` adds a shared parser that normalizes only explicitly empty manual metadata to neutral unavailable fields, retaining strict real criteria, scope and exact references.108focused tests passed, including malformed/nonempty metadata and foreign-plan rejection; final authenticated browser rerun passed: both exact room references reached ordinary sidechat, the live reply compared both offers, and the second offer opened its correct explicit confirmation.
