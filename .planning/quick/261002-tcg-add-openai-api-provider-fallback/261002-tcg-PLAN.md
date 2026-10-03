---
quick_id: 261002-tcg
status: ready
user_setup:
  - service: OpenAI API
    why: Direct provider mode needs an OpenAI API key and API billing enabled.
    env_vars:
      - name: OPENAI_API_KEY
        source: OpenAI Platform API Keys; inject into the server runtime, never commit it.
    dashboard_config:
      - task: Create or select an OpenAI API key and confirm API billing/model access.
estimate:
  tokens: 14000
  raw_tokens: 14000
  tasks: 2
  confidence: low
must_haves:
  truths:
    - Bedrock remains the default model provider; setting AGENT_MODEL_PROVIDER=openai selects the direct OpenAI API explicitly.
    - Direct OpenAI conversation calls use the Responses API and the configured OpenAI model ID.
    - Provider selection and model health metadata are truthful without returning credentials.
    - MCP research, map, and source tools remain LangGraph/AgentCore Gateway-owned; provider errors never trigger an implicit provider switch.
    - The OpenAI API key never reaches browser configuration or logs; in single-container local mode it is present in the app container environment, then limited to the agent child process, while standard Compose scopes it to the agent container. The root .env may receive an empty paste-ready variable block without being read.
  artifacts:
    - services/agent/claude/messages.py
    - services/agent/claude/adapter.py
    - services/agent/app.py
    - services/agent/tests/test_model_provider.py
    - compose.local-single.yaml
    - compose.yaml
    - scripts/README.md
  key_links:
    - AGENT_MODEL_PROVIDER selects one provider before request execution and health reports that selected provider.
    - The Bedrock client uses Anthropic Messages; the OpenAI client uses Responses with the same conversation context and validated decision contract.
    - Standard Compose forwards OPENAI_API_KEY only to the agent container; local combined Compose limits use to the agent child process, with the app container itself as the trust boundary.
---

# Add a direct OpenAI API provider fallback

## Goal

Allow an operator to choose OpenAI's direct Responses API for the agent while preserving Amazon Bedrock as the default provider.

## User decisions and boundaries

- Provider selection is explicit: `AGENT_MODEL_PROVIDER=openai`; default remains Bedrock.
- Keep Bedrock selectable and do not retry through another provider when the selected provider fails.
- Supply `OPENAI_API_KEY` server-side. Do not reveal it in health responses, browser configuration, logs, or errors.
- Do not read the repository `.env` contents. Compose may consume an operator-provided runtime variable, and the root `.env` may only be appended with the requested empty provider block.
- User now requests a paste-ready project-root `.env` block. Append only the provider setting, empty key slot, and model ID without reading existing contents; never place the key in `frontend/.env.local`.
- LangGraph remains the only owner of tool orchestration. The model adapter calls OpenAI `responses.create` for conversation text without passing tools or enabling provider-side MCP actions; LangGraph nodes continue to use the existing AgentCore Gateway for research, map resolution, and sources.

## Discovery

The existing `anthropic` dependency provides `AsyncAnthropicBedrock`; add the official `openai` Python SDK for direct OpenAI calls. OpenAI recommends the Responses API for new text-generation applications. Its structured-output mode can enforce the conversation decision schema. Keep OpenAI-hosted tools disabled so existing LangGraph/MCP ownership remains unchanged. Set `store=false` because LangGraph/PostgreSQL own conversation state.

- [OpenAI Python SDK](https://github.com/openai/openai-python)
- [OpenAI Responses API text-generation guidance](https://developers.openai.com/api/docs/guides/text)
- [OpenAI Responses API migration guidance](https://developers.openai.com/api/docs/guides/migrate-to-responses)
- [OpenAI structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs)
- [GPT-5.4 Mini model details](https://developers.openai.com/api/docs/models/gpt-5.4-mini)
- The direct API model defaults to `gpt-5.4-mini`, with `OPENAI_MODEL_ID` allowing an operator to select another enabled model. Bedrock continues to use `BEDROCK_MODEL_ID`.

## Source coverage audit

| Source | Item | Plan coverage |
|---|---|---|
| Goal | Add direct OpenAI API while Bedrock remains default | Tasks 1–2 |
| User decision | Explicit provider switch; no automatic fallback | Task 1 |
| User decision | Server-only key; no `.env` inspection or editing | Tasks 1–2 |
| User decision | Preserve LangGraph-owned MCP tool orchestration | Task 1 |
| Research | Use OpenAI Responses API `responses.create` and structured output | Task 1 |
| Existing state | Health currently hardcodes Bedrock; local and standard Compose need matching configuration | Tasks 1–2 |

## Direct OpenAI API coverage

| capability | decision | reason |
|---|---|---|
| Responses API `responses.create` for conversational turns | INTEGRATE | OpenAI recommends this API for new text-generation applications. |
| Structured JSON Schema output | INTEGRATE | Enforce the existing `decision`, `assistant_text`, and `question` contract. |
| Response storage | OPT-OUT | `store=false`; LangGraph/PostgreSQL own conversation state. |
| Streaming and background responses | OPT-OUT | Current graph path returns complete turn events; neither feature is needed for this fallback. |
| OpenAI-hosted tools and remote MCP | OPT-OUT | LangGraph and the authenticated AgentCore Gateway remain the sole tool owners. |

## Tasks

### 1. Wire explicit model-provider selection through the conversation adapter

Files: `services/agent/claude/messages.py`, `services/agent/claude/adapter.py`, `services/agent/app.py`, `services/agent/tests/test_model_provider.py`, `services/agent/tests/test_agent_api.py`, `services/agent/tests/test_agent_turn.py`

- Add a validated provider setting with Bedrock as the default and `openai` as the direct API choice. Reject unknown values and fail clearly if direct OpenAI is selected without a non-empty server-side `OPENAI_API_KEY`; never include key contents in exceptions.
- Build `AsyncAnthropicBedrock` for the default provider and `AsyncOpenAI` for the direct provider. Select `BEDROCK_MODEL_ID` or `OPENAI_MODEL_ID` accordingly. Use Responses API input/instructions, strict structured JSON output, `store=false`, and `max_output_tokens` for direct conversations.
- Keep the direct request limited to the existing conversation inputs; do not pass provider-native `tools` or add a provider-side tool execution loop. Keep research/map/source calls routed through the existing LangGraph adapter and AgentCore Gateway.
- Make `/health` report the selected provider and model ID from the configured adapter; it must not return key values or credential-derived headers. Preserve the current Bedrock-default health behavior and existing Bedrock credential support.
- Add mocked-client tests proving each provider constructs the correct SDK client and model/request, direct API key is absent from health output, invalid/missing configuration fails safely, Bedrock remains the default, and no direct request includes tools. Preserve existing gateway and conversation tests.

Verify:

```text
uv run --locked pytest -q services/agent/tests/test_model_provider.py services/agent/tests/test_agent_api.py services/agent/tests/test_agent_turn.py
```

Done when both providers are explicitly selectable, Bedrock remains default, the health endpoint is truthful and credential-free, and tool ownership remains unchanged.

### 2. Pass provider configuration to the agent container and document local setup

Files: `compose.local-single.yaml`, `compose.yaml`, `scripts/README.md`

- Forward `AGENT_MODEL_PROVIDER` with a Bedrock default and `OPENAI_MODEL_ID` in both Compose paths. Standard Compose injects `OPENAI_API_KEY` only into the agent container. The combined local app container receives the key in its environment and the launcher passes it only to the agent child before starting auth, CRUD, and Vite; document that the container is the local trust boundary. Avoid exposing OpenAI variables to frontend build/runtime configuration.
- Add `AGENT_MODEL_PROVIDER=openai`, `OPENAI_API_KEY=`, and `OPENAI_MODEL_ID=gpt-5.4-mini` as a paste-ready block to the ignored project-root `.env` without reading its existing contents. Do not edit the frontend `.env.local` file.
- Document how to choose `openai`, obtain/inject an OpenAI API key through the operator's local environment, select a model, and return to Bedrock by unsetting the provider override. State that live API calls require API billing and model access and that provider errors do not trigger automatic fallback.
- Do not place credentials in tracked files or image build arguments. Keep `.env` contents unread and unchanged.

Verify:

```text
OPENAI_API_KEY=test AGENT_MODEL_PROVIDER=openai docker compose --env-file /dev/null -f compose.local-single.yaml config --quiet
OPENAI_API_KEY=test AGENT_MODEL_PROVIDER=openai docker compose --env-file /dev/null -f compose.yaml config --quiet
```

Done when both Compose configurations validate without displaying interpolated values and the runtime guide covers the direct-provider setup and return to the Bedrock default.

## Threat model

| Threat | Severity | Disposition | Mitigation |
|---|---|---|---|
| OpenAI API key leaks through health, browser configuration, logs, or build metadata | high | mitigate | Keep it out of health, logging, frontend variables, and image build arguments; pass it only to the agent in the separate-service setup; document the combined local container as its trust boundary and clear it before launching sibling services; test that health output contains no key. |
| Invalid or changed provider configuration sends requests to an unintended provider or causes hidden billing | medium | mitigate | Accept only the documented provider values, use Bedrock as the explicit default, report selected provider in health, and never automatically fail over. |
| Model is given direct authority to invoke research or map tools outside LangGraph controls | medium | mitigate | Do not pass OpenAI tool definitions or enable provider-hosted MCP; leave tool dispatch exclusively in existing LangGraph nodes and authenticated Gateway calls. |

## Verification

- Run the focused agent tests listed in Task 1.
- Validate both Compose files with `/dev/null` as the Compose env file and a dummy key; never print resolved configuration.
- Confirm health contains provider/model metadata but no OpenAI or Bedrock credentials.
- A live direct call is conditional on the operator enabling OpenAI API billing and supplying a valid key; mocked tests prove the client path without requiring a secret.
