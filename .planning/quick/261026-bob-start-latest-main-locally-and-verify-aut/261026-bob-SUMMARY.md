---
status: complete
---
# Local main startup

Started origin/main application source c7d8906 from the initially clean highly-rook worktree at http://localhost:5174. Preserved the dirty primary main checkout and all database volumes.

Existing Cognito pool/client validated. Standard Compose build succeeded. Initial startup found database revision 0012 absent from main (head 0011). Inspected the existing additive migration at commit 0922051; copied only services/crud/migrations/versions/0012_topic_conversations.py into the stopped app container and restarted it. No downgrade, revision stamp, database reset, or application-source edit performed. This local container compatibility file is lost if Compose recreates the container; repeat the same migration-file copy before starting a recreated main container against this database until main includes 0012.

App health and example-account sign-in/session/sign-out passed. SHA-256 comparisons matched PlanningCanvas.jsx, styles.css, and services/crud/api.py. Model execution was not tested. Existing unrelated stacks remained running.
