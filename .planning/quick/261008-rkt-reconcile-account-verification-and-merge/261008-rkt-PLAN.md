---
phase: quick-261008-rkt
plan: "01"
---
# Reconcile account verification and merge

User requested merging the completed account settings branch into main. Execute inline through GSD quick and ship.

1. Check remote ancestry and phase/security gates; preserve unrelated untracked files and the separate local main checkout.
2. Inspect post-verification changes against the completed design/appearance evidence, rerun focused frontend and real account HTTP/SQL tests and build, and refresh the verification coverage with explicit limits.
3. Create a PR with evidence, record shipment, and merge the verified head into remote main without bypassing GitHub checks or rewriting history.

Acceptance: GitHub reports the PR merged and origin/main contains the verified branch. No live credentials, database records or shared stacks are changed.
