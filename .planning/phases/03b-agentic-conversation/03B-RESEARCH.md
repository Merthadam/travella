# Phase 03B corrective research — 2026-10-01

## Scope and decision fidelity

This research supports corrective plans 03B-07 onward. The amended [CONTEXT](03B-CONTEXT.md) decisions D-01–D-08 govern. The user has selected the Anthropic Python Messages SDK with LangGraph, PostgreSQL for agent-owned checkpoints, and AgentCore only for long-term memory (application access remains disabled). Browser UI, requirements/workspace confirmation, bookings, and public AWS deployment are outside this backend slice. The 2026-09-28 verification report is a historical gap list; summaries 03B-03–06 report subsequent protocol and candidate fixes, which still require integration re-verification.

## Existing implementation and gaps

- `services/agent/graph.py` currently has entry, fixed-question, research, map-resolution, and projection nodes. It routes by message length and delegates research/map calls without a versioned system prompt or conversation history. D-01/02/03 require a conversation stage and a research stage, with routing based on typed turn context and model output rather than length.
- `services/agent/claude.py` invokes `AsyncAnthropic.beta.messages.create` for individual MCP tools; `app.py` calls it through the graph and validates candidate actions against `PlanCandidateStore`. This exercises real SDK request construction but is an exact-tool-call transport pattern, not yet a conversational synthesis loop. D-06 calls for one bounded tool owner and Claude-authored cited assessments.
- `services/crud/models.py` creates one `Conversation` per Plan, with no message table. `PlanningBrief` stores a flat payload without entry provenance, inactive history, or tentative status. `services/crud/api.py` exposes Plan/Brief reads and Brief PATCH with token-derived ownership and revision checks. Add narrow message/context contracts through CRUD; do not let checkpoints become authoritative Plan records. Existing PostgreSQL migrations end at `0006_json_object_constraints.py`.
- `services/agent/state.py` holds process-local candidates and receipts; it does not restore after restart. D-04/07 require PostgreSQL LangGraph checkpoints plus durable Plan-scoped event ordering, last complete shortlist, and rejection state. A new traveler event must supersede incomplete research without publishing it.
- `services/mcps` has mounted authenticated FastMCP targets and a Gateway provisioner, but the live interceptor ownership callback remains fail-closed until a real private CRUD reader is wired. D-08 requires that connection and protocol tests; offline control-plane tests alone do not prove a live AWS Gateway.

## Framework and API findings

### Anthropic Messages and MCP connector

Use the installed `anthropic` Python SDK `AsyncAnthropic.beta.messages.create` with a versioned prompt in the top-level `system` field and bounded `messages` history. The MCP connector takes `mcp_servers` and an `mcp_toolset` entry, authenticates to a remote MCP Gateway with a bearer token, and returns MCP tool-use/result blocks alongside assistant text. The current docs show the `mcp-client-2025-11-20` beta and allowlisting. Parse SDK block types and `stop_reason`, require at most one approved tool/action at a time, impose call count/time/token budgets, and record only allowlisted normalized output. The server-side connector executes remote MCP tools; a second graph-side tool client loop would duplicate execution. [Anthropic MCP connector](https://platform.claude.com/docs/en/agents-and-tools/mcp-connector), [Messages API reference](https://platform.claude.com/docs/en/api/beta/messages/create).

### LangGraph persistence

`uv.lock` currently resolves `langgraph==0.6.11` and `langgraph-checkpoint==3.0.1`; `pyproject.toml` already includes `psycopg[binary]`. Pin `langgraph-checkpoint-postgres==3.0.4` for this line, verify with `uv lock --check`/import, and avoid unconstrained newest releases: the current upstream `checkpoint-postgres` package declares `langgraph-checkpoint>=4.1,<5`, which conflicts with the locked 3.0.1 generation. The Postgres saver supports async usage, needs one-time `.setup()` on an isolated agent schema/database, and uses `configurable.thread_id` for checkpoint identity. Supply a thread key derived from verified traveler and Plan, never trust one from a browser. Use a strict serializer/module allowlist for checkpoint deserialization; checkpoint rows are sensitive. [Postgres saver README](https://github.com/langchain-ai/langgraph/blob/main/libs/checkpoint-postgres/README.md), [LangGraph persistence](https://github.com/langchain-ai/docs/blob/main/src/oss/langgraph/persistence.mdx), [3.0.4 release](https://pypi.org/project/langgraph-checkpoint-postgres/3.0.4/), [current upstream dependency line](https://github.com/langchain-ai/langgraph/blob/main/libs/checkpoint-postgres/pyproject.toml).

### Why PostgreSQL checkpoints, not AgentCore checkpoints

PostgreSQL is already the CRUD deployment database class and has local migration/test infrastructure. Put checkpoints in agent-owned tables/schema and use CRUD HTTP for Plan/conversation/Brief data; sharing a database does not grant the agent direct write authority over CRUD tables. AgentCore's LangGraph checkpoint integration is a researched alternative, but AWS's current LangGraph integration uses the `langgraph-checkpoint-aws` package and its SDK optional integration declares LangGraph 1.x. Adopting it would force a graph dependency migration beyond this corrective phase, while the user reserved AgentCore for disabled long-term memory. [AWS LangGraph integration](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/memory-integrate-lang.html), [AWS SDK dependency declaration](https://github.com/aws/bedrock-agentcore-sdk-python/blob/main/pyproject.toml).

### AgentCore Gateway and private MCP

The Gateway aggregates MCP-server targets and needs a REQUEST interceptor for caller/Plan binding. Its MCP interceptor event is `interceptorInputVersion: 1.0` with `mcp.gatewayRequest.body`; transformed output is `interceptorOutputVersion: 1.0` with `mcp.transformedGatewayRequest.body`. `tools/call` arguments are under `params.arguments`. The target validates both Gateway OAuth service identity and the signed actor/Plan assertion. Gateway catalog synchronization follows tool changes. The deployable interceptor must use an authenticated private CRUD ownership read instead of the present fail-closed callback stub. [AWS interceptor payload](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/gateway-interceptors-types.html), [MCP-server targets](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/gateway-target-MCPservers.html), [interceptor security guidance](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/gateway-interceptors.html).

## Recommended contracts

1. A typed `TurnContext` contains the verified Plan/Conversation IDs, current CRUD revision, bounded recent messages, active Brief entries with origin/status, tentative agent proposals, last complete compact shortlist, rejection reasons, and generation. Exclude inactive Brief entries from ranking; retain them as historical context only. Prompt version is recorded with the turn.
2. Conversation messages are durable CRUD records keyed by Plan and event ID; write through authenticated HTTP handlers. A traveler message is recorded once before research. Assistant replies are recorded once only when their generation is current. Messages contain allowlisted text/role/status and no raw tool blocks or secrets.
3. The LangGraph checkpoint contains working state, compact research and receipt data, schema version, and the CRUD revision/digest it was based on. On resume, authorize Plan through CRUD first, compare revision/digest, rebase current manual Brief values, and mark unfinished runs interrupted. Never display a checkpoint as saved if its referenced CRUD snapshot is unavailable or newer. Deleted Plans block reads; purge removes agent-owned checkpoint rows after the seven-day recovery window.
4. Conversation stage decides whether one question or research is useful from prompt plus context. Research stage lets Claude select only the normalized research/map/source tools through the single MCP connector loop, validates returned evidence, and produces at most five cited assessments. Source inspection uses only current-run evidence IDs. No fallback to direct Tavily/Google calls.
5. Use real FastAPI/HTTP tests against an isolated migrated PostgreSQL database for CRUD and checkpoint integration. Exercise actual SDK argument construction and mounted FastMCP JSON-RPC route with deterministic model/provider fixtures. A live Gateway/Claude/Tavily/Google check remains separately identified until configured.

## Package Legitimacy Audit

| Package | Status | Evidence | Install decision |
|---|---|---|---|
| `langgraph-checkpoint-postgres==3.0.4` | [VERIFIED] | [PyPI release](https://pypi.org/project/langgraph-checkpoint-postgres/3.0.4/) links the verified LangChain repository; [upstream README](https://github.com/langchain-ai/langgraph/blob/main/libs/checkpoint-postgres/README.md) describes the saver. | Add exact pin and resolve against installed LangGraph/checkpoint generation before implementation. |
| `psycopg[binary]` | [EXISTING] | Already in `pyproject.toml` and `uv.lock`; PostgreSQL CRUD tests use it. | No new install decision. |
| `anthropic`, `langgraph`, `mcp`, `boto3` | [EXISTING] | Already declared and locked. | Keep current stack; verify API calls against installed SDK. |

No `[ASSUMED]` or `[SUS]` package install is planned.

## Bedrock connectivity update — 2026-10-01

- AWS CLI `bedrock-runtime converse` initially returned a response for `global.anthropic.claude-sonnet-4-5-20250929-v1:0` in `eu-north-1`; the base model ID failed because this model requires an inference profile. Subsequent identical CLI and boto3 Converse calls returned `404 Model use case details have not been submitted`, so live model access remains blocked pending the account form and a repeat successful call.
- `AsyncAnthropicBedrock` against the Bedrock Runtime endpoint also returned that 404. Keep the selected Anthropic Messages SDK via `AsyncAnthropicBedrock`, with `AWS_BEARER_TOKEN_BEDROCK` or the AWS credential chain; the FTU form is an account access prerequisite, not a reason to call Anthropic's API directly.
- The Bedrock model does not own remote MCP execution in this architecture. LangGraph's adapter calls the OAuth-protected AgentCore Gateway with the verified Cognito bearer token, then the graph validates normalized results. This preserves traveler/Plan authorization.
- Although Bedrock can connect to an AgentCore Gateway through server-side tools on the Responses API, AWS documents that path for IAM-authenticated gateways. It is not a fit for the existing traveler-token OAuth gateway contract.
- Live AgentCore Gateway discovery returned no gateways in `eu-north-1`, `eu-central-1`, or `eu-west-1`; code-level MCP integration can be verified locally, but live tool calls require gateway provisioning and targets.

## Risks and verification boundary

- The published user story has an older sentence saying checkpoint backing remains undecided and mentions NoSQL. The new D-04/user selection governs this corrective phase; use PostgreSQL and agent-owned tables.
- The original service contract sketches a CRUD `save_consistent_checkpoint` endpoint, but CRUD cannot own agent checkpoint tables under the new split. Use an agent checkpoint write plus a CRUD revision/digest read with conservative reconciliation; the plans must prove no false saved-progress claim under races.
- `PlanningBrief` currently cannot represent provenance or deleted-entry history. A migration and HTTP tests are required; storing these semantics only in a prompt or checkpoint would violate D-05.
- Live AWS, Claude and provider access has not been verified here. Offline integration tests can prove request shape and local protocol/security behavior, not deployed reachability or model quality.
