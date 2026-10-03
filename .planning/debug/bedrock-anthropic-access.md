---
slug: bedrock-anthropic-access
status: checkpoint
trigger: "Nope, still don't work. Bedrock does not work in my account; maybe the free account is the reason."
created: 2026-10-02
updated: 2026-10-02
---

# Debug: Bedrock Anthropic access

## Symptoms

- **Expected:** A signed-in traveler can send a message in the plan Copilot and receive an assistant response from Claude through Amazon Bedrock.
- **Actual:** The browser reaches the Agent endpoint, which returns HTTP 200, but the Copilot shows a generic provider-unavailable message.
- **Errors:** A direct Anthropic Messages SDK request through Bedrock returns `FTUFormNotFilled`, saying Anthropic use-case details have not been submitted. After the user submitted the form, the same response said to retry in 15 minutes. The AWS account information API reports `AccountState: ACTIVE`. The user confirmed this is a Paid account plan with credits.
- **Timeline:** The issue remains after the AWS region was changed to `eu-north-1`; Google Maps works.
- **Reproduction:** Sign in locally, open Copilot for a plan, and send a message.

## Current Focus

- **hypothesis:** Anthropic invocation is blocked while the First Time Use form submission propagates. The user's Paid account plan with credits rules out the Free account plan as the cause of this request failure.
- **test:** Direct Claude invocation through Bedrock in `eu-north-1`, before and after the user's form submission, plus AWS account-state query.
- **expecting:** After the 15-minute propagation window, the Anthropic invocation should succeed if the account's form is accepted; otherwise AWS will return the remaining account-specific access reason.
- **next_action:** Run a live conversation call after the operator selects `AGENT_MODEL_PROVIDER=openai` and supplies `OPENAI_API_KEY` through the runtime. Bedrock remains default; its FTU gate can be retried separately. Do not inspect repository `.env` files.

## Evidence

- timestamp: 2026-10-02 — Cognito scope mismatch fixed; browser POST to Agent `/events` changes from 403 to 200.
- timestamp: 2026-10-02 — Local Bedrock profile and region resolve; direct SDK call returns `FTUFormNotFilled`.
- timestamp: 2026-10-02 — `aws account get-account-information` returns `AccountState: ACTIVE`; plan/billing status remains unknown.
- timestamp: 2026-10-02 — User confirms Paid account plan with credits; the Free account plan is not the explanation.
- timestamp: 2026-10-02 — User submits Anthropic use-case form; immediate retry still returns `FTUFormNotFilled` and says to retry in 15 minutes.
- timestamp: 2026-10-02 — User chooses to prepare a direct Anthropic API fallback while Bedrock access is pending. This requires separate Anthropic API credentials; the AWS Bedrock credentials are not interchangeable. No fallback code or provider switch has been applied.
- timestamp: 2026-10-02 — User redirects the fallback to OpenAI API credentials. The direct path now targets the OpenAI Responses API; it is a separate provider, not an OpenAI key used to authenticate Anthropic or Bedrock.
- timestamp: 2026-10-02 — OpenAI provider path is implemented with explicit selection, `store=false`, structured conversation output, and no provider-side tools. All 25 agent tests pass with `AGENT_MODEL_PROVIDER=openai`; both Compose configurations validate and the local app image builds. No live API request was made and no `.env` file was inspected.
- timestamp: 2026-10-02 — `list-gateways` in `eu-north-1` returns no AgentCore Gateway; health reports `gateway_configured: false`.
- timestamp: 2026-10-02 — Browser screenshot saved at `artifacts/testing/2026-10-02-agent-connectivity/implementation/copilot-bedrock-access-required.jpg`.

## Eliminated

- hypothesis: Google Maps configuration caused the Copilot failure.
  evidence: Maps requests return HTTP 200 and the map renders in the same browser session.
- hypothesis: Browser could not reach the Agent API.
  evidence: The authenticated browser event request returns HTTP 200 after aligning the required scope with Cognito's access-token scope.
- hypothesis: The local AWS profile or region was missing from the app container.
  evidence: The mounted AWS profile resolves credentials in the app container and the direct request reaches Bedrock in `eu-north-1`.
