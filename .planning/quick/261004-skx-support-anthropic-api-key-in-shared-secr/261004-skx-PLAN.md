---
quick_id: 261004-skx
description: Support Anthropic API key in shared Secrets Manager
status: complete
---

# Support Anthropic API key in shared Secrets Manager

## Goal

Allow the existing hidden-prompt credential command to store an Anthropic API key in the shared `travella/local-development` Secrets Manager JSON secret without printing the key.

## Tasks

1. Add `ANTHROPIC_API_KEY` to the root secret allowlist and document the hidden-prompt command.
2. Review the patch for unintended secret output or exposure. Do not inject the key into application containers until the Claude Agent SDK phase wires its provider.

## Acceptance

- The helper accepts `ANTHROPIC_API_KEY` as a root setting and its existing `set` command prompts with hidden input.
- The shared secret is unchanged until the user enters a key.
- The key value is never printed or committed.
