# Phase 1: Account Access - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-26
**Phase:** 1-Account Access
**Areas discussed:** Account screen flow, MFA enrollment and recovery, Session expiry and return, Error and privacy states

---

## Account screen flow

| Option | Description | Selected |
|--------|-------------|----------|
| Guided stepper | Linear, explicit progression through account tasks | ✓ |
| Dedicated focused screens | Separate task screens | |
| Single auth shell | One frame swapping tasks | |
| Registration details then verification | Collect all registration fields before email verification | ✓ |
| Verification before password setup | Verify email first | |
| Inline verification | Verify without a distinct transition | |
| Dedicated recovery path | Email → neutral confirmation → reset → sign-in | ✓ |
| Reuse registration stepper | Recovery shares registration frame | |
| Inline recovery panel | Recovery opens within sign-in | |
| My plans after sign-in | Deliberate sign-in lands at My plans | ✓ |
| Last visited page | Always resume the last authorized page | |
| Context-sensitive | Restore after both deliberate and involuntary sign-in | |
| Explicit checklist | Named steps remain visible | ✓ |
| Preserve safe values | Keep non-secret fields when going back | ✓ |
| Error summary plus inline | Summary at top and field-level details | ✓ |
| Safe resume | Restore non-secret progress after interruption | ✓ |
| Calm and focused | Minimal distraction, one primary action | ✓ |
| Responsive split | Supporting panel on larger screens | |
| Desktop-first | Optimize desktop with simpler small-screen fallback | ✓ |
| Back plus primary action | No skip control for required security steps | ✓ |
| Confirmation screen | Explain completion and offer Continue | ✓ |

**User's choice:** The auth experience should use a guided, named stepper with dedicated recovery, safe value preservation, calm desktop-first presentation, and explicit completion states.
**Notes:** Passwords and verification codes must not be preserved during back navigation or interruption.

---

## MFA enrollment and recovery

| Option | Description | Selected |
|--------|-------------|----------|
| After email verification | Set up MFA before first private access | ✓ |
| Before email verification | Complete MFA before verifying email | |
| Security settings only | Defer MFA until after entering the product | |
| Dedicated review step | Show codes once with copy/download and acknowledgment | ✓ |
| Inline confirmation | Show codes in the setup screen | |
| Download-first | Require a download before continuing | |
| Replace before My plans | Recovery-code sign-in requires new authenticator setup | ✓ |
| One-time access | Allow My plans before replacement | |
| Replace later | Defer replacement to settings | |
| Dedicated replacement flow | Re-authenticate, invalidate old set, show new set once | ✓ |
| Inline security setting | Replace directly in settings | |
| Support-assisted | Require support/recovery path | |

**User's choice:** MFA is offered after email verification and before private access; recovery codes are reviewed once in a dedicated step; recovery-code sign-in requires replacement setup; authenticated replacement uses a dedicated security flow.
**Notes:** Recovery codes are never emailed, and the old set is invalidated immediately on replacement.

---

## Session expiry and return

| Option | Description | Selected |
|--------|-------------|----------|
| Redirect to sign-in | Leave the private page and enter the auth stepper | ✓ |
| Blocking screen | Keep the page and block it with re-authentication | |
| Modal re-authentication | Sign in over the current page | |
| Re-authorized internal return | Restore only when the signed-in traveler is authorized | ✓ |
| Always restore path | Let the destination handle authorization | |
| Always My plans | Never restore a requested page | |
| Discard private in-progress state | Retain only internal destination | ✓ |
| Restore safe drafts | Retain non-secret inputs locally | |
| Full restoration | Preserve all unsaved state | |
| No proactive warning | Use normal sign-in flow at the 30-day limit | ✓ |
| Brief warning | Warn that full sign-in may be required | |
| Preemptive re-authentication | Ask for sign-in before the limit | |

**User's choice:** Failed refresh redirects to sign-in; only an authorized internal destination is restored; private in-progress state is discarded; no 30-day warning is shown.
**Notes:** The source contract was explicitly preserved over retaining local safe drafts.

---

## Error and privacy states

| Option | Description | Selected |
|--------|-------------|----------|
| Generic actionable sign-in error | Help the traveler check details or reset without account disclosure | ✓ |
| Generic minimal error | Show only sign-in failed | |
| Progressive guidance | Add reset/verification help over time | |
| Helpful neutral recovery | Explain eligible delivery and what to do if nothing arrives | ✓ |
| Minimal neutral recovery | Confirm request only | |
| Detailed branching | Explain verified/unverified/unknown outcomes | |
| Explain and recover expired links | Offer resend/recovery without account disclosure | ✓ |
| Return to sign-in | Generic invalid-link message | |
| Restart stepper | Reopen the original auth step | |
| Silent refresh transition | Move to sign-in without technical details | ✓ |
| Session-ended message | Explain that the session ended | |
| Technical detail | Expose token failure reason | |

**User's choice:** Auth errors should be useful but privacy-preserving; refresh failures transition silently to sign-in.
**Notes:** No error state may confirm account existence or expose token/refresh internals.

---

## the agent's Discretion

- Exact typography, spacing, icons, and component implementation.
- Exact copy wording within the locked privacy semantics.
- Responsive fallback details within scope.

## Deferred Ideas

None.
