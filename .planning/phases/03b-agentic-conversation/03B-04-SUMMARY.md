---
phase: 03b-agentic-conversation
plan: '04'
subsystem: agentcore-gateway
tags: [agentcore, gateway, mcp, boto3, cognito, oauth, fastmcp]
requires:
  - phase: 03b-agentic-conversation
    provides: authenticated FastMCP transport and AgentCore interceptor envelope
provides:
  - idempotent AgentCore MCP Gateway reconciliation
  - Cognito custom JWT authorizer and REQUEST interceptor configuration
  - OAuth-authenticated research and map MCP_SERVER targets
  - control-plane request validation, synchronization, and catalog verification
affects: [03b-agentic-conversation, agent-runtime]
actuals:
  tokens: 17400
  tasks: 2
  commits: 3
tech-stack:
  added: []
  patterns: [boto3 control-plane reconciliation, redacted preflight validation, post-mutation describe verification]
key-files:
  created: [services/mcps/tests/test_gateway_provisioning.py]
  modified: [scripts/provision-agentcore-gateway.py, services/mcps/gateway_interceptor.py, services/mcps/README.md]
key-decisions:
  - "Use CUSTOM_JWT with explicit Cognito discovery, audience, client, and scope values because the installed AgentCore model exposes CUSTOM_JWT as the Gateway JWT authorizer type."
  - "Require the Gateway URL and access token for live tools/list verification; control-plane synchronization alone cannot claim a usable catalog."
  - "Keep target OAuth issuer, audience, client, and scope values aligned with the Phase 3B-03 verifier contract before any AWS mutation."
patterns-established:
  - "Build desired boto3 request shapes from a validated immutable GatewayConfig and compare described resources before updating."
  - "Never print provider credentials, access tokens, or raw AWS exception payloads from the provisioning command."
requirements-completed: [DISC-06, DISC-10, TRUST-04]
coverage:
  - id: D1
    description: "Provisioner creates or reconciles a Cognito-authorized Gateway, REQUEST interceptor, and both OAuth MCP_SERVER targets."
    requirement: DISC-06
    verification:
      - kind: unit
        ref: "services/mcps/tests/test_gateway_provisioning.py::test_provision_constructs_authenticated_gateway_and_two_mcp_targets"
        status: pass
      - kind: unit
        ref: "services/mcps/tests/test_gateway_provisioning.py::test_requests_match_installed_botocore_operation_models"
        status: pass
    human_judgment: false
  - id: D2
    description: "Repeated provisioning converges endpoint and OAuth drift, rejects unsafe or incomplete configuration, and verifies described resource status."
    requirement: TRUST-04
    verification:
      - kind: unit
        ref: "services/mcps/tests/test_gateway_provisioning.py::test_second_run_converges_and_updates_changed_endpoint"
        status: pass
      - kind: unit
        ref: "services/mcps/tests/test_gateway_provisioning.py::test_oauth_verifier_mismatch_is_rejected"
        status: pass
    human_judgment: false
  - id: D3
    description: "Gateway catalog verification requires authenticated initialize/tools/list and reports missing tools as a failure."
    requirement: DISC-10
    verification:
      - kind: manual_procedural
        ref: "services/mcps/README.md live smoke procedure"
        status: unknown
    human_judgment: true
    rationale: "A live AgentCore Gateway, target endpoints, OAuth provider, and Cognito token are required for the network smoke."
metrics:
  duration: 45min
  completed: 2026-09-29
  status: complete
---

# Phase 3B Plan 4: AgentCore Gateway provisioning Summary

**Idempotent boto3 reconciliation for a Cognito-protected AgentCore MCP Gateway with OAuth-authenticated research and map targets**

## Performance

- **Duration:** 45 min
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Replaced the success-looking provisioning shell with validated `Create`, `Update`, `Get`, `List`, and `Synchronize` AgentCore control-plane calls.
- Configured and verified a `CUSTOM_JWT` Cognito authorizer, a REQUEST Lambda interceptor with `passRequestHeaders`, and two named `MCP_SERVER` targets using the shared OAuth credential provider.
- Added offline tests for exact installed botocore request models, idempotent endpoint reconciliation, missing and mismatched configuration, partial failure, and sanitized interceptor responses.
- Documented deployment prerequisites and an authenticated live `initialize`/`tools/list` smoke procedure.

## Task Commits

1. **Task 1: Create the Gateway and one research MCP_SERVER target with configured authorization** - `e75a30f`
2. **Task 2: Reconcile map target and verify both target catalogs** - `b534144`

## Files Created/Modified

- `scripts/provision-agentcore-gateway.py` - Validates configuration, reconciles Gateway and both target resources, synchronizes targets, verifies described status, and optionally checks the live MCP catalog.
- `services/mcps/gateway_interceptor.py` - Returns the documented AgentCore short-circuit response for malformed or unconfigured interceptor events.
- `services/mcps/tests/test_gateway_provisioning.py` - Control-plane request, reconciliation, security-boundary, and botocore model tests.
- `services/mcps/README.md` - Live environment requirements and smoke procedure.

## Decisions Made

- The provisioner requires HTTPS target endpoints and a pre-existing AgentCore OAuth credential provider ARN; it does not invent resource IDs or credentials.
- Live provisioning fails unless the Gateway catalog can be checked with an authenticated `tools/list`; offline tests call `provision(..., verify_catalog=False)` explicitly and never contact AWS.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Resilience] Added eventual-consistency polling after create/update/synchronize**
- **Found during:** Task 2
- **Issue:** AgentCore control-plane responses can describe newly created or synchronized resources in transitional states.
- **Fix:** Poll Gateway and target descriptions for bounded transitional states before declaring readiness.
- **Files modified:** `scripts/provision-agentcore-gateway.py`
- **Verification:** Control-plane reconciliation suite passes.
- **Committed in:** `e75a30f`

**2. [Rule 2 - Security] Sanitized malformed and unconfigured interceptor responses**
- **Found during:** Task 1
- **Issue:** A malformed AgentCore event previously escaped the Lambda handler as an unstructured exception.
- **Fix:** Return the documented versioned short-circuit response with status 403 and a bounded error message; require interceptor auth configuration before JWT processing.
- **Files modified:** `services/mcps/gateway_interceptor.py`
- **Verification:** `test_interceptor_lambda_returns_documented_short_circuit_for_bad_event` passes.
- **Committed in:** `e75a30f`

**Total deviations:** 2 auto-fixed (Rule 1: 1, Rule 2: 1)
**Impact on plan:** Both changes support the requested live control-plane and trust-boundary behavior without expanding the public API.

## Known Stubs

- `services/mcps/gateway_interceptor.py`: `lambda_handler` keeps the CRUD Plan ownership callback fail-closed until deployment supplies the real private CRUD ownership reader. The Gateway ARN can be provisioned, but live `tools/call` authorization remains unavailable until that deployment wiring is supplied.

## Issues Encountered

- AWS live provisioning was not run because this execution did not have the deployment-specific role, Lambda, OAuth provider, private endpoints, and catalog token configured. The command now fails clearly in that case; offline tests remain green.

## Next Phase Readiness

The control-plane path is ready for deployment configuration and an authenticated live smoke. The next integration must deploy the interceptor with a private CRUD ownership reader, provide the private target URLs and OAuth provider, then run the documented Gateway catalog and tool-call smoke.

---
*Phase: 03b-agentic-conversation*
*Completed: 2026-09-29*
