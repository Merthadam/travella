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
| Framework | pytest for Python; Vitest + Testing Library for React |
| Config file | `pyproject.toml`, `frontend/vite.config.js` |
| Quick Python command | `uv run --locked pytest -q` |
| Quick React command | `npm test --prefix frontend` |
| Full local command | `bash scripts/check.sh` |
| Estimated runtime | ~5 seconds with dependencies cached |

## Sampling Rate

- After every task: run the affected quick suite; fix failures before committing.
- After every plan wave: run `bash scripts/check.sh`; investigate and fix any failure before advancing.
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

- [x] Python/FastAPI + React selected; uv manages Python dependencies and locked test tools.
- [x] Fake provider injected into the real HTTP application for offline tests.
- [x] Actual RSA signature tests plus issuer/client/expiry/token-use/subject rejection.
- [x] React DOM integration tests cover refresh failure and MFA challenge states.
- [ ] Real browser end-to-end tests and complete remaining requirement coverage.

## Current Evidence — 2026-09-26

- `uv run --locked pytest -q`: **44 passed**. One upstream Starlette/httpx deprecation warning.
- `npm test --prefix frontend`: **7 passed** (jsdom, not a real browser).
- `uv run --locked ruff check services`: passed.
- `uv run --locked ruff format --check services`: passed.
- `npm run build --prefix frontend`: passed.
- `npm audit --prefix frontend`: zero reported vulnerabilities after updating Vitest.
- Live local proxy smoke: `/health` reports unconfigured Cognito, sign-in returns
  HTTP 503 with a safe message and no credentials echoed.
- No live AWS tests or independent subagent review were performed. No requirement
  is marked complete based on these partial checks.

Remaining gaps: TOTP enrollment and recovery codes, actual private-resource ownership enforcement, safe resource
resumption, real browser review, and live Cognito verification. The task map above
is the target contract; it does not imply these behaviors already pass.

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
