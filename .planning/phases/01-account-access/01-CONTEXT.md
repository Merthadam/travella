# Phase 1: Account Access - Context

**Gathered:** 2026-09-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 1 delivers private Travella account access: registration, email verification, sign-in, optional authenticator-app MFA, recovery codes, password recovery, session refresh/expiry, sign-out, and safe return to authorized internal pages. It does not add profile management, social sign-in, multi-account collaboration, or Plan functionality beyond the private-access boundary.

</domain>

<decisions>
## Implementation Decisions

### Account screen flow
- **D-01:** Use a guided stepper for registration, verification, sign-in, and recovery. — **Reversibility:** costly — changing the shared auth shell after implementation affects every account entry and recovery path.
- **D-02:** Show an explicit named checklist of auth steps.
- **D-03:** Collect first name, last name, email, and password before a dedicated email-verification step.
- **D-04:** Use a short dedicated password-recovery path: email entry, neutral confirmation, reset link, new password, then sign-in.
- **D-05:** After successful deliberate sign-in or verification, open My plans by default; restore an internal destination only after involuntary re-authentication.
- **D-06:** Preserve safe non-secret values when going back; never preserve passwords or verification codes.
- **D-07:** Use an error summary plus inline field errors while retaining entered safe values.
- **D-08:** After interruption, restore only non-secret progress and require passwords/codes again.
- **D-09:** Use a calm, focused visual treatment with minimal distraction and one primary action per step.
- **D-10:** Optimize the first implementation for desktop and provide a simpler small-screen fallback.
- **D-11:** Provide Back plus a primary action without allowing travelers to skip required security steps.
- **D-12:** Show a confirmation screen with explanation and a clear Continue action after successful registration or recovery.

### MFA enrollment and recovery
- **D-13:** Offer optional authenticator-app MFA after email verification and before first private access. — **Reversibility:** costly — moving this gate later changes the onboarding/security contract and private-access tests.
- **D-14:** Use a dedicated recovery-code review step with copy/download and explicit acknowledgment; recovery codes are shown once and are not emailed.
- **D-15:** A recovery-code sign-in requires authenticator replacement before the traveler can access My plans.
- **D-16:** Use a dedicated security flow for recovery-code replacement: re-authenticate or complete MFA, invalidate the old set immediately, then show the new set once for acknowledgment.

### Session expiry and return
- **D-17:** Redirect to the sign-in stepper when a session expires or silent refresh fails.
- **D-18:** Restore the saved internal destination only after re-authorizing it for the signed-in traveler; otherwise open My plans.
- **D-19:** Discard private in-progress state on involuntary re-authentication; retain only the internal return destination.
- **D-20:** Do not show a proactive warning before the 30-day maximum; use the normal sign-in return flow when refresh can no longer continue.

### Error and privacy states
- **D-21:** Use a generic but actionable invalid-sign-in message: “We couldn’t sign you in. Check your details or reset your password.”
- **D-22:** Use a helpful but neutral password-recovery confirmation explaining that instructions are sent if the address is eligible and what to do if nothing arrives.
- **D-23:** Explain expired or used links and offer the appropriate resend or recovery action without exposing account status.
- **D-24:** Move silently to sign-in when silent token refresh fails, without exposing technical failure details.

### the agent's Discretion
- Exact typography, spacing, icons, and component implementation within the calm desktop-first direction.
- Exact copy wording where it preserves the locked privacy and recovery semantics.
- The responsive fallback details, provided it does not expand Phase 1 scope.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Product and account contract
- `docs/user-stories/login/README.md` — authoritative registration, email verification, MFA, recovery, session, authorization, and acceptance behavior.
- `docs/overview.md` — consolidated product boundaries, security rules, and open decisions.
- `CONTEXT.md` — stable Travella vocabulary, especially Traveler, Plan, Conversation, and private-data terms.
- `.planning/PROJECT.md` — project core value, constraints, and MVP boundary.
- `.planning/REQUIREMENTS.md` § Account Access — AUTH-01 through AUTH-08 requirements.
- `.planning/ROADMAP.md` § Phase 1: Account Access — phase goal, dependencies, and success criteria.

### Existing flow references
- `docs/user-stories/login/account-recovery-session-flow.drawio` — primary recovery/session flow artifact.
- `docs/user-stories/login/auth-lifecycle-state.drawio` — registration, sign-in, refresh, expiry, and sign-out baseline.
- `docs/user-stories/login/login-use-case.drawio` — account use cases.
- `docs/user-stories/login/login-api-sequence.drawio` — login API sequence baseline.

### Research references
- `.planning/research/STACK.md` — Cognito token/MFA guidance and security implications.
- `.planning/research/PITFALLS.md` — account enumeration, token, privacy, and recovery pitfalls.
- `https://docs.aws.amazon.com/cognito/latest/developerguide/amazon-cognito-user-pools-using-the-access-token.html` — access-token validation and scopes.
- `https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-settings-mfa.html` — software-token MFA behavior.
- `https://docs.aws.amazon.com/cognito/latest/developerguide/managing-security.html` — user-existence protection and Cognito security features.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- No application source, components, hooks, or authentication implementation exists yet.
- The existing Draw.io account-flow artifacts are reusable as behavior references, not executable code.

### Established Patterns
- The repository is documentation-first and uses user stories with decisions, acceptance criteria, and state/event contracts.
- The product vocabulary in `CONTEXT.md` is established and should be preserved in UI and API naming.

### Integration Points
- Future auth screens connect to Cognito user-pool flows and the private-data authorization boundary of every public Travella service.
- Successful access hands off to the Phase 2 My plans/Draft Plan lifecycle; account code must not own Plan data.

</code_context>

<specifics>
## Specific Ideas

- The traveler should see a calm, focused, desktop-first auth experience with one primary action per step.
- The auth journey should feel explicit and guided rather than a collection of disconnected forms.
- Privacy-preserving behavior should be helpful without revealing whether an account exists.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within Phase 1 scope.

</deferred>

---

*Phase: 1-Account Access*
*Context gathered: 2026-09-26*
