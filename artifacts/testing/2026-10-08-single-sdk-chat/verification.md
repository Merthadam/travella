# Single SDK chat loop — verification

2026-10-08. Backend agent refactor; no frontend layout or CRUD schema/handler changes.

## Executed

- `uv run --no-sync ruff check services/agent services/auth/api.py services/auth/agent_client.py`: passed.
- `uv run --no-sync python -m compileall -q services/agent services/auth`: passed.
- Imported agent composition, chat, both canvas workers and auth composition: passed.
- `git diff --check`: passed.
- Local Cognito discovery precheck: existing pool/client validated without changing AWS resources.
- `bash scripts/start-local-ready.sh`: final rebuild passed; sign-in → session → sign-out passed. First rebuild found a stale import in graph/nodes/__init__.py; removed it and rebuilt successfully.
- Compared local/container SHA-256 for chat client, runtime, streaming adapter, graph builder and auth API: all matched.

## Live authenticated requests

Used the supplied example account and isolated new Plans at http://localhost:5174. No credentials, tokens or raw profile context recorded. Two live model turns were made; exact spend was not measured. No automated tests added or run.

### Ordinary chat and context update

Asked for a short general-knowledge Austrian city suggestion and stated “2 travelers.”

- HTTP 200, terminal `complete`.
- 49 actual answer chunks; first at 5.6s, last at 6.56s, total 7.04s.
- No structured state JSON appeared in the visible text. No source links were returned.
- Subsequent GET research-context returned travelers=2 and locked=false.
- This verifies a persisted state edit, but source_count=0 alone is not a measured tool-call count.

### Explicit web research

Asked to search the official Salzburg tourism site, read one relevant page, and recommend one relaxed attraction with a citation.

- HTTP 200, terminal `complete`.
- 81 answer chunks; first at 21.76s, last at 22.31s, total 22.82s.
- One accepted source, host `www.salzburg.info`. Accepted source IDs must come from the successful WebFetch observer.
- No state JSON leaked. Saved assistant content matched the streamed answer. Context was unlocked afterward.

Both newly created Plans were soft-deleted through the challenge/confirmation API; both final cleanup requests returned 200. The first cleanup initially returned 415 because the manual request omitted JSON content type; corrected with an empty JSON body. Temporary auth sessions were signed out. No existing Plan or profile was edited.

## Limits

- Automated regression suites were not run. Tests exclusive to removed onboarding/MCP/router behavior were retired; retained fixtures/imports were adjusted to the current interfaces.
- Browser visual acceptance was not performed; frontend files are unchanged.
- Cancellation/disconnect, evidence reuse across separate requests, cloud AgentCore deployment and paid canvas generation were not exercised in this refactor. Their orchestration/persistence contracts remain, and canvas imports resolved.
- Actual cost savings were not measured. One SDK invocation can contain multiple model turns.
- Evidence reuse is process-local and does not survive restart.

The rebuilt local stack remains available at http://localhost:5174.
