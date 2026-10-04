---
status: complete
---
# Local rebuild freshness guidance

Updated the local startup skill to rebuild from the intended checkout, preserve worktree changes, verify representative non-secret source file hashes against the running app container, and distinguish loaded code from configured integrations.

Executed the Cognito precheck and authenticated startup launcher. Build and app health succeeded; example-account sign-in/session/sign-out passed. TripBrief.jsx, PlanConversation.jsx, and styles.css hashes matched the running container. Skill validation passed using the project Python environment.
