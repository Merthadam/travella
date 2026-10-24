---
status: complete
---
# Main local startup

Started the source at remote main afb065d04cfcc969056870671bb3060f26fc6395 from the clean prickle-script checkout. The original main checkout has unrelated changes and was preserved.

- Existing Cognito pool/client read-only discovery passed.
- Colima started; launcher rebuilt the local stack and preserved database volumes.
- App health and example-account sign-in, session check, and temporary sign-out passed.
- Container SHA-256 matches: frontend/src/AccountApp.jsx, frontend/src/styles.css, services/crud/api.py, services/agent/app.py.
- Opened http://localhost:5174 in Chrome and verified the Welcome back sign-in screen.
- Stack remains running. Model execution was not tested.

No application source changes.
