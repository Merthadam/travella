---
phase: "18"
slug: focused-flights-and-accommodation-agents
status: verified
threats_open: 0
asvs_level: 1
created: "2026-10-28"
---

# Shared workspace threat verification

Scope: planned follow-up register18-06–18-12 at the current implementation. This is ASVS1 mitigation-presence verification, not a penetration test or retrospective acceptance of earlier phases. The register was authored at planning time; all23registered mitigations are present, so the skill's L1 short-circuit applies without a deeper auditor run.

Public requests still use independently validated identity and existing CRUD authorization. Browser recovery scopes are random partition identifiers, not credentials or resource authorization. Temporary views never grant durable mutation authority. Exact manual choices use existing proof/challenge/revision/lease checks and explicit confirmation.

| Threat ID | Category | Component | Severity | Disposition | Mitigation and checked evidence | Status |
| --- | --- | --- | --- | --- | --- | --- |
| T-18-06-01 | Tampering | controller completions | high | mitigate | Scope/generation/revision checks before result application and before awaiting cancellation. Evidence: useTravelWorkspace.js scope/revision/generation reducer; TravelWorkspace.test.jsx | closed |
| T-18-06-02 | Information disclosure | controller scope | high | mitigate | Separate instance per authorized owner/Plan/topic; no inventory persistence; reuse registry authorization. Evidence: useTravelWorkspace.js scope/revision/generation reducer; TravelWorkspace.test.jsx | closed |
| T-18-06-03 | Denial of service | manual controls | medium | mitigate | Existing query bounds and explicit Search; view controls do not invoke provider work. Evidence: useTravelWorkspace.js scope/revision/generation reducer; TravelWorkspace.test.jsx | closed |
| T-18-07-01 | Spoofing/Elevation | specialist_service | high | mitigate | Token owner, topic and registry validation precede evidence access; typed bounded context. Evidence: specialist_service.py post-commit signed completion and registry check; request_context.py; test_travel_workspace_journey.py | closed |
| T-18-07-02 | Tampering | completion/reducer | high | mitigate | Matching input digest, signed proof, current generation and full browser revision/run fences. Evidence: specialist_service.py post-commit signed completion and registry check; request_context.py; test_travel_workspace_journey.py | closed |
| T-18-07-03 | Information disclosure | graph/CRUD | high | mitigate | Request-local input/output collectors with finally reset; digest-only persistence and explicit checkpoint assertions. Evidence: specialist_service.py post-commit signed completion and registry check; request_context.py; test_travel_workspace_journey.py | closed |
| T-18-07-04 | Denial of service | public context | medium | mitigate | 32KiB context, bounded IDs/selected lists, existing turn deadlines and provider bounds. Evidence: specialist_service.py post-commit signed completion and registry check; request_context.py; test_travel_workspace_journey.py | closed |
| T-18-08-01 | Elevation/Tampering | update_workspace_view | high | mitigate | Strict operation allowlist, registry membership, topic validation and no durable actions at registration and dispatch. Evidence: travel_workspace.py allowlist and action limit; canvas_travel_tools.py provider budgets; reducer Undo; specialist tool tests | closed |
| T-18-08-02 | Denial of service | worker loop | high | mitigate | 12 local actions, shared ten/three/six provider budgets,96KiB evidence and finite deadline; adversarial exhaustion tests. Evidence: travel_workspace.py allowlist and action limit; canvas_travel_tools.py provider budgets; reducer Undo; specialist tool tests | closed |
| T-18-08-03 | Tampering | Undo/controller | high | mitigate | Restore only latest accepted inverse at matching revision; increment revision; no choice mutation path. Evidence: travel_workspace.py allowlist and action limit; canvas_travel_tools.py provider budgets; reducer Undo; specialist tool tests | closed |
| T-18-08-04 | Information disclosure | evidence/logging | medium | mitigate | Bounded projection; sanitized topic/count/failure metadata only; injected provider text stays evidence. Evidence: travel_workspace.py allowlist and action limit; canvas_travel_tools.py provider budgets; reducer Undo; specialist tool tests | closed |
| T-18-09-01 | Information disclosure/Tampering | logo URLs and CarrierMark | high | mitigate | Documented observed HTTPS origins only, bounded URL policy, no-referrer, no inline SVG; unsafe fixtures rejected. Evidence: CarrierMark.jsx safe HTTPS origin/no-referrer/fallback; normalized carrier schemas; provider/card tests | closed |
| T-18-09-02 | Spoofing | carrier/source labels | medium | mitigate | Preserve discrete supplier identity; separate provider labels; fallback retains names and codeshares. Evidence: CarrierMark.jsx safe HTTPS origin/no-referrer/fallback; normalized carrier schemas; provider/card tests | closed |
| T-18-09-03 | Tampering | price/room facts | high | mitigate | Retain exact party/date/currency and observation times; unknown property/room facts stay unknown; no fabricated source links. Evidence: CarrierMark.jsx safe HTTPS origin/no-referrer/fallback; normalized carrier schemas; provider/card tests | closed |
| T-18-10-01 | Tampering/Elevation | reviewExactTravelOption | high | mitigate | Resolve exact authorized registry reference; existing proof/challenge/revision/lease; real DB negative tests. Evidence: reviewExactTravelOption and TravelRegistry.resolve; actual topic CRUD tests; exact-reference comparison IDs after bb92e75 | closed |
| T-18-10-02 | Spoofing | comparison identities | high | mitigate | Full reference tuples and exact room ID; scope/freshness labels; never price-string identity. Evidence: reviewExactTravelOption and TravelRegistry.resolve; actual topic CRUD tests; exact-reference comparison IDs after bb92e75 | closed |
| T-18-10-03 | Repudiation | saved choice | medium | mitigate | Explicit confirmation and current receipt/readback; preserve unbooked/readiness semantics. Evidence: reviewExactTravelOption and TravelRegistry.resolve; actual topic CRUD tests; exact-reference comparison IDs after bb92e75 | closed |
| T-18-11-01 | Information disclosure | recovery | high | mitigate | Owner/session namespace, clear/forget hooks, strict bounded whitelist and no inventory/credentials. Evidence: canvasViewState.js strict32KiB/60-record scope; AccountApp clearing; auth opaque recovery scope; deferred race and auth HTTP tests | closed |
| T-18-11-02 | Tampering | lifecycle races | high | mitigate | Synchronous revocation, run/epoch/brief guards and deferred commit/cancel tests. Evidence: canvasViewState.js strict32KiB/60-record scope; AccountApp clearing; auth opaque recovery scope; deferred race and auth HTTP tests | closed |
| T-18-11-03 | Denial of service | recovery/cancellation | medium | mitigate | Bounded records/retries; read-only controls remain usable independently of cancellation. Evidence: canvasViewState.js strict32KiB/60-record scope; AccountApp clearing; auth opaque recovery scope; deferred race and auth HTTP tests | closed |
| T-18-12-01 | Information disclosure | browser/HTTP reports | high | mitigate | Private credentials, sanitized metadata/screenshots, no raw tokens/provider payloads or unrelated personal data. Evidence: Sanitized verification reports and inspected screenshots; explicit live/fixture/UAT distinctions; test-owned Plan only | closed |
| T-18-12-02 | Tampering/Repudiation | verification verdicts | high | mitigate | Exact executed command/request plus readback, inspected screenshots and separate live/fixture/UAT status. Evidence: Sanitized verification reports and inspected screenshots; explicit live/fixture/UAT distinctions; test-owned Plan only | closed |
| T-18-12-03 | Elevation | acceptance exercises | high | mitigate | Search/inspection and exact research-choice scope only; no payment/booking calls or shared-data cleanup. Evidence: Sanitized verification reports and inspected screenshots; explicit live/fixture/UAT distinctions; test-owned Plan only | closed |

## Accepted risks

None introduced or accepted. Native zoom, broader browser concurrency, model-quality matrix and traveler UAT remain verification/acceptance gaps, not silently accepted security risks. The independently reproduced onboarding-route404 test failure remains disclosed.

## Audit trail

28October2026:23planned threats inspected against implementation and targeted/current-prior regression evidence. Source inspection included server registry owner/Plan/topic checks, post-commit generation projection, strict schemas, bounded tools, Undo, auth recovery allocation under account guard, account clearing, and observed-logo origin policy. Actual authorization and durable readback tests passed. No booking/payment action was performed.

The later raw-manual-registry parser fix is constrained to empty presentation metadata; actual criteria, references and authorization remain strict and have negative regressions. Phase acceptance remains open independently of this mitigation-presence result.
