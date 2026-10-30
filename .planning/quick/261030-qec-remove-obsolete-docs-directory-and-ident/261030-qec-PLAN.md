---
status: complete
created: 2026-10-30
---
# Remove obsolete docs and inspect backend refactoring candidates

User explicitly confirmed deletion of the entire docs/ directory. Execute inline with GSD quick.

1. Move the mandatory testing skill unchanged to .agents/skills/travella-testing and update AGENTS.md. Remove the rest of docs/ and repair current references in README.md, scripts/README.md, services/mcps/README.md and the services environment example. Retain historical planning and test evidence outside docs/.
2. Verify the directory is absent, the skill content is unchanged, current references resolve and git diff passes whitespace checks. This is documentation/instruction cleanup: no runtime changes, browser or CRUD verification required.
3. Read current backend code and report a short prioritized list of concrete refactoring candidates without implementing unapproved refactors. Commit deletion and GSD records.
