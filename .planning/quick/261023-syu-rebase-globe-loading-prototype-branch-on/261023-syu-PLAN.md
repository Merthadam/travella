# Rebase globe prototype branch

1. Fetch origin/main and preserve current branch tip a211884 in a backup ref.
2. Rebase the four existing branch commits onto origin/main 0456368, preserving upstream research changes and the saved B Full focus decision. Resolve only conflicts observed in the live index.
3. Verify ancestry and branch delta, run the frontend build if source integration changes, record the result, and leave the branch local. Production implementation remains deferred.
