---
phase: "01"
slug: "account-access"
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-09-26"
---

# Phase 01 — Validation Strategy

## Test Infrastructure

| Property | Value |
|---|---|
| Framework | To be selected in Wave 0; use the repository's chosen TypeScript/Python test runner |
| Config file | Wave 0 creates the test configuration |
| Quick run command | `npm test -- --runInBand` (replace with the selected runner's non-watch command during Wave 0) |
| Full suite command | `npm test -- --runInBand` |
| Estimated runtime | < 60 seconds locally once the skeleton exists |

## Sampling Rate

- After every task commit: run the quick suite.
- After every plan wave: run the full suite plus auth contract tests.
- Before `$gsd-verify-work`: run browser E2E and security-negative suites.

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Secure behavior | Test type |
|---|---|---:|---|---|---|
| 01-01-01 | 01 | 1 | AUTH-08 | Invalid/expired tokens and foreign resource access are rejected | contract/integration |
| 01-01-02 | 01 | 1 | AUTH-03, AUTH-07 | Refresh is bounded to 30 days; sign-out clears current browser session | unit/E2E |
| 01-02-01 | 02 | 2 | AUTH-01, AUTH-02 | Registration and verification gate private routes | browser E2E |
| 01-02-02 | 02 | 2 | AUTH-04, AUTH-06 | MFA/recovery-code and reset flows never bypass configured MFA | integration/E2E |
| 01-03-01 | 03 | 3 | AUTH-05, AUTH-06 | Recovery is neutral and reset invalidates sessions | contract/security |
| 01-03-02 | 03 | 3 | AUTH-03, AUTH-08 | Reauth return is internal, re-authorized, and token-derived | security/E2E |

## Wave 0 Requirements

- Select the application framework and test runner.
- Create a deterministic Cognito adapter boundary with a fake provider for unit tests.
- Create test fixtures for valid, expired, wrong-audience, wrong-token-use, and foreign-subject tokens.
- Create a browser-test harness capable of simulating refresh failure and MFA challenge states.

## Manual-Only Verifications

| Behavior | Requirement | Why manual | Test instructions |
|---|---|---|---|
| Desktop-first calm stepper and small-screen fallback | AUTH-01–AUTH-07 | Visual usability is not fully captured by protocol tests | Walk registration, recovery, MFA, and refresh-failure flows at desktop and narrow viewport widths; confirm one primary action and visible error summary per step. |
| Recovery-code copy/download and once-only disclosure | AUTH-04 | Clipboard/download affordance needs browser review | Enroll MFA, copy/download codes, reload/back-navigate, and confirm codes are not shown again. |

## Validation Sign-Off

- [ ] All tasks have automated verification or Wave 0 dependencies.
- [ ] No watch-mode commands are used.
- [ ] Security-negative tests cover enumeration, token leakage, owner spoofing, open redirects, and code reuse.
- [ ] `nyquist_compliant: true` after execution and validation.
