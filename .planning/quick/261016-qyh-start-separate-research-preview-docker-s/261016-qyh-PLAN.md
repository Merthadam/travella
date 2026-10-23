# Separate Research preview stack

Start the current checkout as Compose project travella-research-preview with frontend 5175, auth 8004 and agent 8104. Use matching localhost:5175 origin. Existing travella-local-single stays running; volumes remain intact. The separate project gets its own database and provider volumes. No source changes.

Run existing Cognito precheck and readiness launcher with environment overrides; verify health, example-account authentication, source hashes and original stack uptime. Record completion in GSD state.
