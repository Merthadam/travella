# Local Claude SDK startup

1. Accept ANTHROPIC_MODEL as a shared model alias; explicit AGENT_RESEARCH_MODEL takes precedence.
2. Rebuild existing local stack without deleting volumes.
3. Check health, example-account login, active research backend and source hashes.

User approved direct Anthropic for conversation routing because shared credentials now contain only Anthropic. Preserve explicit OpenAI/Bedrock selection; make local Compose default Anthropic.
