# Start latest main locally

Source: live clean worktree HEAD and fetched origin/main both c7d8906. Primary main checkout has uncommitted changes; preserve it.

1. Validate existing Cognito configuration using the local startup skill; keep secret output suppressed.
2. Rebuild and launch the standard local Compose stack, preserving database volumes.
3. Verify health and one sign-in/session/sign-out cycle, compare representative source hashes, and provide the canonical URL.

No application source changes are planned.
