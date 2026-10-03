# Requirements: Travella

**Defined:** 2026-09-26
**Core Value:** A traveler can move from a holiday idea to a trustworthy, editable single-destination Plan while remaining in explicit control of every consequential choice.

## v1 Requirements

Requirements for the full documented MVP. Each maps to exactly one roadmap phase.

### Account Access

- [ ] **AUTH-01**: A traveler can register with first name, last name, email, and password.
- [ ] **AUTH-02**: A new traveler must verify their email before accessing private Plans or Conversations.
- [ ] **AUTH-03**: A traveler can sign in and receive a short-lived access session with silent refresh for up to 30 days from full sign-in.
- [ ] **AUTH-04**: A traveler can enable authenticator-app two-step verification and use one-time recovery codes without codes being emailed.
- [ ] **AUTH-05**: A traveler can request password recovery with a neutral response that does not reveal whether an account exists.
- [ ] **AUTH-06**: A successful password reset invalidates all active sessions and requires a fresh sign-in; password recovery never bypasses configured two-step verification.
- [ ] **AUTH-07**: A traveler can sign out of the current browser session, and a later sign-in starts at My plans.
- [ ] **AUTH-08**: Each public Travella service validates the managed-identity token and authorizes resources from token-derived traveler identity.

### Plan Lifecycle

- [ ] **PLAN-01**: After authentication, a traveler can view only their own active Draft Plans in My plans, ordered by most recent activity.
- [ ] **PLAN-02**: A traveler can create an empty Draft Plan with one linked Conversation and open that Conversation immediately.
- [ ] **PLAN-03**: A traveler can maintain multiple active Draft Plans and edit a Plan title without later automatic titles overwriting the traveler-entered title.
- [ ] **PLAN-04**: Opening a Draft Plan resumes its last Conversation or Planning Canvas view, with Conversation as the safe fallback when the saved view is unavailable.
- [ ] **PLAN-05**: A traveler can delete a Draft Plan, immediately removing it from active Plans and placing it in Recently deleted for seven days.
- [ ] **PLAN-06**: A traveler can restore a deleted Draft Plan during the Recovery Period with its latest consistent saved state, linked Conversation, and last working view.
- [ ] **PLAN-07**: After seven days, identifiable deleted Plan data is permanently removed and cannot be restored.
- [ ] **PLAN-08**: Repeated create, rename, delete, restore, and lifecycle requests are idempotent and cannot create contradictory Plan state.

### Conversational Research

- [ ] **DISC-01**: A traveler can begin a Draft Plan with either a known destination/city or an open-ended travel intent.
- [ ] **DISC-02**: The Conversation asks at most one focused preference or decision question at a time and lets the traveler answer early, skip, interrupt, or redirect.
- [ ] **DISC-03**: The traveler can view and edit an active Planning Brief containing preferences and constraints such as interests, dates, party, budget, transport tolerance, and accessibility needs.
- [ ] **DISC-04**: Traveler-stated or manually edited Brief entries take precedence over conflicting agent inferences; conflicting inferences remain tentative until confirmed.
- [ ] **DISC-05**: Deleted Brief entries remain only as inactive historical context and do not influence ranking unless the traveler reintroduces them.
- [ ] **DISC-06**: A traveler can research the active Plan through a full-screen conversation that loads the Plan's existing message history.
- [ ] **DISC-07**: The Plan conversation presents each traveler message and assistant reply in order, with assistant reply text appearing incrementally as it is generated.
- [ ] **DISC-08**: A traveler can stop an active reply; streamed partial text remains visible and is marked stopped, while a dropped connection leaves partial text marked interrupted with a retry action.
- [ ] **DISC-09**: Allow-listed source references supplied with an assistant reply appear inline with that reply and do not open a separate context or source drawer.
- [ ] **DISC-10**: The browser receives only assistant-visible text, approved inline source references, and terminal outcome metadata; Plan context, memory content, tool activity, research progress, internal reasoning, and raw provider payloads remain server-side.

### Requirements and Workspace

- [ ] **WORK-01**: A traveler can confirm whether flight, accommodation, and car rental are needed, not needed, or undecided during initial planning.
- [ ] **WORK-02**: A confirmed single destination/city and Planning Requirements snapshot are required before the initial map-based workspace is ready.
- [ ] **WORK-03**: Confirmed Planning Requirements generate a permanent map plus only relevant empty/search-ready planning surfaces with functional provider capabilities; generation does not start a search or save an option.
- [ ] **WORK-04**: A traveler can add, hide, remove, or navigate to an optional planning surface through the UI or Conversation, with explicit confirmation for requirement changes and separate confirmation for saved-item removal.
- [ ] **WORK-05**: The workspace projection is a validated allow-listed manifest and never contains generated executable UI, credentials, raw provider payloads, or internal agent state.
- [ ] **WORK-06**: Changing a confirmed destination identifies affected destination-specific options and pins and requires explicit confirmation before clearing them.

### Provider Search

- [ ] **SEARCH-01**: A traveler with a confirmed destination can search only functional provider-backed stays, return flights, same-location car rentals, and supported places; unavailable modes remain hidden.
- [ ] **SEARCH-02**: Search collects and validates mode-specific inputs, including traveler-confirmed flight origin, exact dates before saving, party breakdown, and required driver/rental details.
- [ ] **SEARCH-03**: Broad dates, party size, and overall budget can update the Planning Brief, while narrow filters, sort, and query state remain search-scoped.
- [ ] **SEARCH-04**: Search results identify one connected provider per mode, present approximately three to five best-fit cards first, and support Show more, detail, and up-to-three-option transient comparison.
- [ ] **SEARCH-05**: Result cards expose total or clearly labeled estimated-total price, decision-critical mode-specific details, provider identity, and material cancellation/baggage/policy information.
- [ ] **SEARCH-06**: Changing criteria or filters requires explicit Refresh results; prior complete results remain visible with Updating until a complete replacement is ready.
- [ ] **SEARCH-07**: Temporary provider failure retains prior complete results, explains the failure, and offers Retry without fabricated results or silent backup-provider substitution.
- [ ] **SEARCH-08**: Before an exact-date option enters add-to-Plan confirmation, Travella rechecks availability and material terms; unavailable or materially changed options require a fresh traveler choice.
- [ ] **SEARCH-09**: Refresh or reconnect restores the latest compact completed result set and does not present unfinished searches or transient comparisons as saved data.

### Canvas and Saved Choices

- [ ] **CANVAS-01**: The Planning Canvas is map-first and provides a categorized list view representing the same saved items.
- [ ] **CANVAS-02**: A traveler can explicitly add, replace, edit, and remove provider-backed Selected Options, with at most one selected stay, flight, and car rental and multiple restaurants or activities.
- [ ] **CANVAS-03**: Saving, replacing, editing, or removing a Selected Option or Map Pin requires an exact explicit traveler confirmation.
- [ ] **CANVAS-04**: Confirmed Selected Options and applicable category-specific Map Pins are saved together; temporary provider results remain visually and semantically distinct.
- [ ] **CANVAS-05**: A traveler can search the map for stays, restaurants, and activities and save an allowed result as a categorized Custom Map Pin.
- [ ] **CANVAS-06**: A Custom Map Pin has no price, availability, or supplier link and is not represented as a Selected Option; category or location changes require explicit confirmation.
- [ ] **CANVAS-07**: Refresh or reconnect restores the latest consistent saved Canvas projection; unfinished searches may be discarded without affecting saved choices.

### Supplier Handoff

- [ ] **HANDOFF-01**: Only an eligible saved provider-backed Selected Option with a functional handoff can start a Supplier Redirect.
- [ ] **HANDOFF-02**: A traveler can request a current-offer refresh, and Travella performs a mandatory final exact-option recheck immediately before handoff.
- [ ] **HANDOFF-03**: Changed material terms require explicit traveler acceptance before updating the saved Selected Option and continuing; unavailable options block redirect and remain visibly unavailable.
- [ ] **HANDOFF-04**: The final handoff view identifies the provider, verified destination domain, current terms, and clearly states that Travella is not booking or confirming anything.
- [ ] **HANDOFF-05**: Travella opens only a server-generated URL on a verified provider host after a separate explicit Continue action, in the same browser tab.
- [ ] **HANDOFF-06**: A successful handoff saves only provider, checked offer details, time, and `Opened provider; booking status unknown`; returning never implies a booking outcome.
- [ ] **HANDOFF-07**: A failed verified handoff keeps the traveler in the Plan, states that no provider site was opened, offers Retry, and saves no handoff record.

### Reliability and Trust

- [ ] **TRUST-01**: Durable Plan mutations use request IDs, expected revisions, and single-use confirmation challenges so retries and replay cannot duplicate or broaden a change.
- [ ] **TRUST-02**: The CRUD backend is the sole durable-data owner; Agent and Connector services use authenticated service contracts and cannot bypass Plan authorization.
- [ ] **TRUST-03**: Agent checkpoints are versioned, Plan-scoped, and exposed only through whitelisted projections after reconciliation with the latest CRUD snapshot.
- [ ] **TRUST-04**: External web/provider content is treated as untrusted evidence and cannot issue instructions, invoke tools, or mutate a Plan; only validated assistant-facing text and allow-listed source references may cross the chat streaming boundary.
- [ ] **TRUST-05**: Tokens, credentials, verification codes, raw provider payloads, personal data, and internal reasoning are excluded or redacted from URLs, logs, checkpoints, and browser projections.

## v2 Requirements

Deferred beyond the initial full MVP roadmap.

### Expanded Travel and Booking

- **V2-TRAVEL-01**: Traveler can plan multiple destinations, routes, or day/time itinerary assignments.
- **V2-TRAVEL-02**: Traveler can complete checkout, payment, passenger/driver details, and booking confirmation inside Travella.
- **V2-TRAVEL-03**: Traveler can import booking emails, tickets, receipts, or attachments into a Plan.
- **V2-TRAVEL-04**: Travella can aggregate and compare offers across multiple providers or fall back between providers.

### Account and Collaboration

- **V2-ACCOUNT-01**: Traveler can use social sign-in, edit a profile, or manage sign-out everywhere.
- **V2-ACCOUNT-02**: Traveler can share, collaborate on, duplicate, archive, or finalize a Plan.

## Out of Scope

| Feature | Reason |
|---|---|
| Autonomous Plan changes or booking | The MVP preserves traveler control over every consequential action. |
| Fake or unlabeled demonstration inventory | Travel availability and price must remain honest. |
| Background price polling | Refresh is traveler-initiated to avoid surprising provider calls and mutations. |
| Arbitrary executable generated UI | Only validated, allow-listed components are safe for the product boundary. |
| Browser-direct provider calls | Credentials, normalization, rate limits, and handoff safety belong in the private Connector service. |
| Booking status inference after supplier redirect | Travella does not own the external transaction or confirmation. |
| Finalized/completed Plan state in MVP | The first lifecycle remains Draft until deletion; finalization is a later design. |

## User Stories

- US-001 — Access a private Travella account
- US-002 — Research and shape a Plan through conversation
- US-003 — Select options and maintain the Planning Canvas
- US-004 — Create, resume, and recover Plans
- US-005 — Search and compare travel options
- US-006 — Hand off to an external supplier

## Definition of Done

- Every v1 requirement is implemented, verified, and committed in its mapped phase.
- No user-facing flow claims a supplier redirect completed a booking.
- Authorization, idempotency, deletion/recovery, stale-result, prompt/tool-injection, and redirect-safety checks pass.
- The traveler can complete the documented end-to-end MVP journey from account access through safe supplier handoff.

## Traceability

Mapped during initial full-MVP roadmap creation.

| Requirement | Phase | Status |
|---|---|---|
| AUTH-01 | Phase 1 | Pending |
| AUTH-02 | Phase 1 | Pending |
| AUTH-03 | Phase 1 | Pending |
| AUTH-04 | Phase 1 | Pending |
| AUTH-05 | Phase 1 | Pending |
| AUTH-06 | Phase 1 | Pending |
| AUTH-07 | Phase 1 | Pending |
| AUTH-08 | Phase 1 | Pending |
| PLAN-01 | Phase 2 | Pending |
| PLAN-02 | Phase 2 | Pending |
| PLAN-03 | Phase 2 | Pending |
| PLAN-04 | Phase 2 | Pending |
| PLAN-05 | Phase 2 | Pending |
| PLAN-06 | Phase 2 | Pending |
| PLAN-07 | Phase 2 | Pending |
| PLAN-08 | Phase 2 | Pending |
| DISC-01 | Phase 3 | Pending |
| DISC-02 | Phase 3 | Pending |
| DISC-03 | Phase 3 | Pending |
| DISC-04 | Phase 3 | Pending |
| DISC-05 | Phase 3 | Pending |
| DISC-06 | Phase 4 | Pending |
| DISC-07 | Phase 4 | Pending |
| DISC-08 | Phase 4 | Pending |
| DISC-09 | Phase 4 | Pending |
| DISC-10 | Phase 4 | Pending |
| WORK-01 | Phase 5 | Pending |
| WORK-02 | Phase 5 | Pending |
| WORK-03 | Phase 5 | Pending |
| WORK-04 | Phase 5 | Pending |
| WORK-05 | Phase 5 | Pending |
| WORK-06 | Phase 5 | Pending |
| SEARCH-01 | Phase 6 | Pending |
| SEARCH-02 | Phase 6 | Pending |
| SEARCH-03 | Phase 6 | Pending |
| SEARCH-04 | Phase 6 | Pending |
| SEARCH-05 | Phase 6 | Pending |
| SEARCH-06 | Phase 6 | Pending |
| SEARCH-07 | Phase 6 | Pending |
| SEARCH-08 | Phase 6 | Pending |
| SEARCH-09 | Phase 6 | Pending |
| CANVAS-01 | Phase 7 | Pending |
| CANVAS-02 | Phase 7 | Pending |
| CANVAS-03 | Phase 7 | Pending |
| CANVAS-04 | Phase 7 | Pending |
| CANVAS-05 | Phase 7 | Pending |
| CANVAS-06 | Phase 7 | Pending |
| CANVAS-07 | Phase 7 | Pending |
| HANDOFF-01 | Phase 8 | Pending |
| HANDOFF-02 | Phase 8 | Pending |
| HANDOFF-03 | Phase 8 | Pending |
| HANDOFF-04 | Phase 8 | Pending |
| HANDOFF-05 | Phase 8 | Pending |
| HANDOFF-06 | Phase 8 | Pending |
| HANDOFF-07 | Phase 8 | Pending |
| TRUST-01 | Phase 2 | Pending |
| TRUST-02 | Phase 2 | Pending |
| TRUST-03 | Phase 3 | Pending |
| TRUST-04 | Phase 4 | Pending |
| TRUST-05 | Phase 2 | Pending |

**Coverage:**
- v1 requirements: 60 total
- Mapped to phases: 60
- Unmapped: 0

---
*Requirements defined: 2026-09-26*
*Last updated: 2026-09-26 after initial definition*
