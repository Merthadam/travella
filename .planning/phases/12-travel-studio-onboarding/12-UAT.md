---
status: testing
phase: 12-travel-studio-onboarding
source: [12-VERIFICATION.md]
started: 2026-10-05
updated: 2026-10-05
---

## Current Test

number: 1
name: Final-build fresh login
expected: |
  A fresh login succeeds and opens the appropriate onboarding/Plans route.
  Existing authenticated sessions continue working.
awaiting: user response

## Tests

### 1. Final-build fresh login
expected: Fresh login succeeds without password/account changes. Investigate the recorded intermittent401 with safe diagnostic evidence; travella-local forbids blindly retrying rejected credentials.
result: [pending]

### 2. City lookup recovery and async cases
expected: Failed city lookup can retry after network recovery; empty/stale responses do not show obsolete choices. First-load lookup and keyboard selection already passed.
result: [pending]

### 3. Visual, keyboard and reduced-motion acceptance
expected: Selected B design feels right; all controls remain keyboard operable and reduced-motion preference stops floating/transition motion. Desktop/mobile core paths and screenshots already passed.
result: [pending]

### 4. Memory failure and explicit-clear invariant
expected: A deterministic exercise proves a mirror failure does not undo saved preferences and stale memory cannot resurrect cleared values. No paid model call is required. Source review and projection checks already passed.
result: [pending]

### 5. Reload after intermediate optional Skip
expected: Save an optional Skip before completing the flow, reload, and resume the next unresolved step with previous preferences preserved. Ordinary reload and all-skip completion already passed separately.
result: [pending]

## Summary

total: 5
passed: 0
issues: 0
pending: 5
skipped: 0
blocked: 0

## Gaps

These are outstanding acceptance/evidence checks, not a claim that the implementation is absent. Full details and observed outcomes: `12-VERIFICATION.md` and `artifacts/testing/2026-10-05-travel-studio-onboarding/verification.md`.
