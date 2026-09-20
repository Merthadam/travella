# US-001 — Access a private Travella account

## User story

As a traveler, I can create, access, recover, and safely end my Travella account session, so I can securely access only my own saved plans, conversations, and selected travel options.

## Success outcome

A traveler can regain access after forgetting a password without revealing whether an account exists or bypassing configured two-step verification. Sessions remain convenient through silent refresh, but Travella ends them safely on sign-out, password reset, expiry, revocation, or failed refresh. Private plans, conversations, and selected options remain visible only after Travella authorizes them for the traveler identity in a validated token.

## Happy path

1. The traveler opens Travella’s registration or sign-in screen, either directly or after requesting a private Travella page.
2. A new traveler registers with first name, last name, email, and password. An existing traveler signs in with email and password.
3. Travella requires email verification before a new account can access private travel data.
4. During registration, the traveler can opt into authenticator-app two-step verification. Travella shows the recovery-code set once for the traveler to save or download; it does not email the codes.
5. At future sign-ins, a traveler with two-step verification completes the authenticator-app challenge or uses one unused recovery code.
6. Cognito issues a short-lived access token. Travella silently refreshes the session for up to 30 days from the last full sign-in.
7. Travella opens the requested private page only after authorizing it for the signed-in traveler; otherwise it opens **My plans**.

## Password recovery

1. The traveler selects **Forgot password** and enters an email address.
2. Travella gives the same on-screen confirmation for an unknown, unverified, and eligible address: reset instructions will be sent if the account is eligible.
3. For an eligible, verified account, Cognito sends a time-limited, single-use password-reset method by email. For an unverified account, it sends a new email-verification message instead.
4. The traveler sets a new password and returns to sign-in. Travella does not automatically create a session after reset.
5. Completing a password reset ends all active Travella sessions for that account, including silent-refresh sessions. The next sign-in creates fresh tokens.
6. Password recovery does not bypass configured two-step verification. The traveler completes the authenticator-app or recovery-code challenge before private data is shown.

## Two-step verification recovery

1. A traveler who cannot use the authenticator app can select **Use a recovery code** at the two-step challenge.
2. Each recovery code works once. A traveler who signs in with one must configure a replacement authenticator app before Travella opens **My plans**.
3. An authenticated traveler can generate a replacement recovery-code set. Travella invalidates every code in the prior set and shows the replacement set once; it does not email the codes.
4. Handling a traveler who has lost both the authenticator app and every recovery code is deliberately deferred. The MVP provides no automated two-step bypass.

## Session management

- **Silent refresh.** Travella refreshes a valid session without interrupting the traveler, for up to 30 days from the last full sign-in.
- **Session expiry or invalidation.** If refresh fails, is revoked, or reaches the 30-day limit, Travella clears authentication state, removes private data from the unauthenticated view, and asks the traveler to sign in again.
- **Safe resumption.** After an involuntary expiry or invalidation, Travella retains only the internal page the traveler originally requested. Following sign-in, it re-authorizes that page for the traveler; if it is unavailable or unauthorized, Travella opens **My plans**.
- **Sign out.** The regular **Sign out** control ends the current browser session, stops silent refresh, clears locally held authentication state, and returns the traveler to sign-in. A later sign-in starts at **My plans** rather than the page viewed before sign-out.
- **Sign out everywhere.** A traveler-managed sign-out-everywhere control is not part of the MVP. Password reset remains the account-wide session-invalidation path.

## Authorization and safe return rules

- Travella keeps a return destination only for an internal private Travella page; it never redirects to an external URL after authentication.
- Return destinations contain no passwords, tokens, verification codes, email addresses, or other credentials.
- Each public Travella service validates the access token and authorizes the requested resource using the traveler identity in that token, never a browser-supplied user identifier.
- A missing, deleted, expired, or unauthorized resource falls back to **My plans** without exposing another traveler’s data.

## In scope

- Travella-owned registration, sign-in, password-recovery, and sign-out screens backed by Amazon Cognito.
- Registration with first name, last name, email, and password.
- Required email verification and neutral account-recovery responses.
- Optional authenticator-app two-step verification and one-time recovery codes.
- Replacement recovery-code sets for an authenticated traveler and required replacement authenticator setup after recovery-code sign-in.
- Short-lived access tokens, silent refresh for up to 30 days, account-wide session invalidation after password reset, and current-browser sign-out.
- Safe return to an authorized internal page after involuntary re-authentication.
- Access only to the traveler’s own plans, conversations, and selected options.

## Out of scope

- Profile editing, social sign-in, and phone-number collection.
- Support-led recovery for a traveler who has lost both the authenticator app and every recovery code.
- Traveler-managed sign-out everywhere.
- Changing or removing two-step verification outside replacement setup after recovery-code sign-in.
- Provider-specific authentication implementation and infrastructure design.

## Decisions

| Area | Decision | Rationale |
| --- | --- | --- |
| Identity provider | Amazon Cognito | A managed provider keeps passwords and verification codes outside Travella services. |
| Authentication UI | Travella-owned registration and sign-in screens | The product retains a branded account experience. |
| Email verification | Required before private-data access | The email address is the recovery channel for a private account. |
| Sign-in disclosure | Generic credential errors until the traveler proves access | Prevents an initial sign-in attempt from revealing that an account exists or needs verification. |
| Password recovery | Neutral confirmation; eligible verified accounts receive a reset method and unverified accounts receive verification | Protects account existence while giving legitimate travelers the right next email. |
| Password-reset session effect | End all account sessions; require a new full sign-in | Limits continued access after credential recovery. |
| Two-step recovery | One-time recovery codes; require replacement authenticator setup after their use | Preserves two-step protection when an authenticator app is lost. |
| Recovery-code replacement | Authenticated travelers can replace the full set; old codes become invalid | Gives a secure recovery-code renewal path without emailing a backup factor. |
| Access session | Short-lived access tokens with silent refresh for up to 30 days from full sign-in | Keeps routine planning uninterrupted while requiring periodic re-authentication. |
| Involuntary re-authentication | Return only to a re-authorized internal page; otherwise open **My plans** | Lets a traveler continue safely without open redirects or cross-account data exposure. |
| Deliberate sign-out | End the current browser session and start the next sign-in at **My plans** | Makes sign-out a clear reset of the browser session. |
| User-flow model | [Account recovery and session flow](account-recovery-session-flow.drawio) | Shows the branching recovery and session outcomes that are difficult to review from the narrative alone. |

## Acceptance criteria

1. A new traveler cannot access plans, conversations, selected options, or other private data until their email is verified.
2. An unknown, unverified, and eligible email address receive the same on-screen response to a password-recovery request.
3. A verified eligible account receives a time-limited, single-use password-reset method; an unverified account receives a verification message instead.
4. A successful password reset invalidates every active Travella session for the account and requires the traveler to sign in again.
5. A password reset does not bypass configured authenticator-app two-step verification.
6. Recovery codes are shown once during enrollment or authenticated replacement, are not emailed, and a replacement set invalidates the prior set.
7. A recovery-code sign-in requires replacement authenticator-app setup before private data is visible.
8. Normal silent refresh does not interrupt the traveler for up to 30 days from the last full sign-in.
9. A failed, revoked, expired, or maximum-age session clears the unauthenticated view of private data and requires full sign-in.
10. After involuntary re-authentication, Travella reopens a requested internal page only when the signed-in traveler is authorized for it; otherwise it opens **My plans**.
11. Regular sign-out ends only the current browser session and a later sign-in opens **My plans**.

## Session state and event contract

| Concern | Product contract |
| --- | --- |
| Authoritative identity and session state | Cognito determines the account identity, authentication outcome, two-step challenge, and whether the session is valid or revoked. |
| Authoritative private-resource access | Each public Travella service validates the token and authorizes plans, conversations, and selected options against the traveler identity in that token. |
| Compact resumable context | Travella may retain only an internal return destination for involuntary re-authentication. It must exclude credentials and is re-authorized after sign-in. |
| Browser projection | The browser may show account screens, neutral recovery confirmation, a session-ended prompt, and only private data authorized for the current validated session. |
| Traveler actions | Register, verify email, sign in, request password recovery, reset password, enter an authenticator-app or recovery code, replace recovery codes, sign out, and resume after re-authentication. |
| Recovery expectation | Repeating a password-recovery request or receiving a stale reset method must not create a session or reveal account existence. A session-invalid response always follows the full sign-in path before any private resource reopens. |

## Related artifacts

- [Account recovery and session flow](account-recovery-session-flow.drawio) — the primary user-flow diagram. An [SVG preview](account-recovery-session-flow-preview.svg) is included for quick review.
- [Authentication lifecycle state diagram](auth-lifecycle-state.drawio) — existing baseline for registration, sign-in, refresh, expiry, and sign-out.
- [Login use-case diagram](login-use-case.drawio)
- [Login API sequence diagram](login-api-sequence.drawio)
