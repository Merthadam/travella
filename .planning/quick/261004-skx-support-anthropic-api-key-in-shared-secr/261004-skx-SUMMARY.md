---
quick_id: 261004-skx
description: Support Anthropic API key in shared Secrets Manager
status: complete
---

# Summary

Added `ANTHROPIC_API_KEY` to the existing root secret allowlist and documented the hidden-prompt command in the local scripts README and Travella local startup skill. The helper can now update the existing shared `travella/local-development` JSON secret without displaying the key.

The user added the value manually. AWS Secrets Manager presence was confirmed without reading or printing the value.

`git diff --check` passed. No tests were run.
