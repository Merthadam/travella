---
quick_id: 261005-tlx
status: complete
code_commit: 33d03d9
---

# Low effort and compact replies

- Shared Claude Agent SDK options now explicitly use `effort="low"` for routing, research, and final replies. Thinking remains model-managed; no disabled-thinking override.
- Conversation and research synthesis share a helpful, informative, compact style: answer first, useful specifics, usually 80–160 words, concise paragraphs/bullets, no filler, and essential caveats/citations retained.
- Reply prompt ceiling is 1700 characters, below the existing 1800-character stream guard. This is advisory, not an output-token enforcement change.
- Kept the selected model, graph, state contracts, tools, and budgets.

## Delivery

- Diff whitespace check passed.
- Existing Cognito precheck and local startup completed; launcher sign-in/session/sign-out succeeded.
- Both changed source files match the rebuilt app container by SHA-256.
- Available at http://localhost:5174; volumes preserved.
- No automated tests added/run and no paid Claude calls made. Live model acceptance, reply quality, and actual cost reduction remain unmeasured.

SDK reference: https://code.claude.com/docs/en/agent-sdk/python (effort option).
