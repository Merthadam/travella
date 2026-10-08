---
phase: "13"
status: secured
asvs_level: 1
block_on: high
threats_open: 0
audited_head: e3905d7
---

# Phase 13 security verification

Independent gsd-security-auditor verified the five authored threat registers at ASVS level 1. All 23 implementation mitigations were found; this is a bounded mitigation audit, not a claim of exhaustive security assurance. Functional review CR-01 remains separately tracked until fixed.

| Threats | Status | Evidence |
|---|---|---|
| T-13-01, T-13-02 | CLOSED | Strict section schemas, independent token identity, subject lock, normalized receipt-before-revision; test_account_profile.py and PostgreSQL concurrency tests |
| T-13-03, T-13-04 | CLOSED | AccountApp route/expiry guards; AccountSettingsPage late-response, canonical acknowledgement, same-attempt reconciliation and retained-draft tests |
| T-13-05 | CLOSED | Separate account interest/onboarding policies and catalog/bounds/clear tests |
| T-13-06, T-13-07 | CLOSED | shared/traveler_profile.py allow-list; auth mirror excludes precise address; Agent canonical-clear tests and unchanged Plan snapshots |
| T-13-08 | CLOSED | HomeStep canceled lookup generations; bounded best-effort AgentClient profile mirror and failure tests |
| T-13-09 | CLOSED | account.py canonical subject verification, temporary-token revocation, session/purpose binding, expiry and consume_proof; test_account.py |
| T-13-10, T-13-11 | CLOSED | Fail-closed email capability before write; committed intent, exact verified provider readback, transactional local reconciliation and partial-failure tests |
| T-13-12, T-13-13, T-13-14 | CLOSED | Explicit account projection, no-store/sanitized errors, subject guard/event digest, competing intent checks, body/rate limits and expiry tests |
| T-13-15, T-13-16 | CLOSED | Guarded account and legacy signed-in mutation routes; VerifySoftwareToken then preference activation then canonical readback; bypass and partial-stage tests |
| T-13-17, T-13-18, T-13-19 | CLOSED | Atomic proof/hash/receipt transaction, one-time disclosure, transient UI cleanup, no password digest, single SDK attempt; recovery and uncertain-result tests |
| T-13-20 | CLOSED | Dedicated PostgreSQL URL/name guard before migration/cleanup; isolated independent-store concurrency tests |
| T-13-21 | CLOSED | Auditor opened all seven sanitized final screenshots; no visible credentials, tokens, setup secrets or recovery codes |
| T-13-22 | CLOSED | Revision-checked restoration, stale-write tests and executed restoration/Plan snapshot record |
| T-13-23 | CLOSED | Evidence separates actual SQL/Chrome, simulated transport, fixture-only sensitive success, live limitations and baseline failures |
| T-13-SC | CLOSED — accepted | Existing locked dependency reuse; unchanged lockfiles/dependency declarations. Only prototype npm script removed. |

## Accepted risks

T-13-SC (low): retain existing locked dependencies rather than introduce new packages for this feature. The five plans explicitly accepted this risk. The audited diff confirms no dependency additions or lockfile changes. No other risk is accepted by this record.

## Limits

No cloud configuration or shared-account credential/factor mutation was authorized or performed. Safe live email activation remains unavailable; signed-out recovery assurance and broader baseline test debt remain separate. Audit reused executed test evidence and inspected source assertions; it did not rerun the entire suite. CR-01 is a fail-closed availability defect, not an absent authorization control.

## Audit trail

2026-10-06: 24 unique planned threats, 23 verified implementation mitigations and one documented dependency-reuse acceptance; zero blocking/open threats. Root recorded the independent auditor's structured result.
