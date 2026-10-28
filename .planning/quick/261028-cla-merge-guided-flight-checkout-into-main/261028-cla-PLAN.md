---
task: 261028-cla
status: planned
---
# Merge guided flight checkout into main

1. Integrate fetched origin/main into feature/guided-flight-checkout, preserving the trip briefing changes and checkout behavior. Resolve only conflicts observed in the live merge index. Preserve the unrelated dirty local main worktree.
2. Verify the combined tree with focused flight, canvas and trip briefing regression tests and the frontend build. Reuse recorded checkout browser evidence where implementation is unchanged; rerun affected browser paths if conflict resolution alters production behavior.
3. Publish the reviewed branch through a GitHub PR, merge as authorized by the user, and verify origin/main contains the shipped checkout and integration commits. Record the outcome in GSD state and summary.
