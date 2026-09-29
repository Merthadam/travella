# Roadmap: Travella

## Overview

Travella's full documented MVP moves a traveler from secure account access through a private, recoverable Draft Plan; an interruptible Conversation and editable Brief; evidence-backed destination discovery; traveler-confirmed requirements; a validated map-first workspace; honest provider-backed search and comparison; explicit saved options and Map Pins; and a verified external supplier handoff that never claims a booking. The phases preserve the accepted Cognito, AG-UI, LangGraph, CRUD-authority, and private Connector/MCP boundaries while keeping provider and infrastructure choices behind contracts.

## Phases

- [ ] **Phase 1: Account Access** - Travelers securely register, verify, recover, sign in, and sign out of a private account.
- [ ] **Phase 2: Draft Plans & Durable Lifecycle** - Travelers own multiple recoverable Draft Plans with idempotent, revision-safe durable state.
- [ ] **Phase 3: Conversation & Planning Brief** - Travelers shape one Plan through focused, interruptible conversation and editable constraints.
- [ ] **Phase 4: Evidence-backed Destination Discovery** - Travelers inspect compact, uncertain destination candidates and choose what to pursue.
- [ ] **Phase 5: Requirements & Adaptive Workspace** - Confirmed requirements compose a permanent map and only relevant validated planning surfaces.
- [ ] **Phase 6: Provider Search & Comparison** - Travelers search and compare honest provider-backed options with refresh, retry, and recheck semantics.
- [ ] **Phase 7: Planning Canvas & Saved Choices** - Travelers explicitly manage Selected Options and categorized Map Pins in a consistent map/list Canvas.
- [ ] **Phase 8: Verified Supplier Handoff** - Travelers safely open an eligible provider offer while Travella records only an unknown booking outcome.

## Phase Details

### Phase 1: Account Access

**Goal**: Travelers can securely establish, recover, and use a private Travella account.
**Mode:** mvp
**Depends on**: Nothing (first phase)
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06, AUTH-07, AUTH-08
**Success Criteria** (what must be TRUE):

  1. A traveler can register with first name, last name, email, and password, verify the email, and is blocked from private Plans or Conversations until verification succeeds.
  2. A traveler can sign in to a short-lived session that silently refreshes for up to 30 days from full sign-in, sign out of the current browser session, and return to My plans on a later sign-in.
  3. A traveler can enable authenticator-app two-step verification, use one-time recovery codes, and recover a password through a neutral account-existence response without emailed MFA codes.
  4. A successful password reset invalidates active sessions, requires fresh sign-in, and never bypasses configured two-step verification.
  5. Every public Travella service rejects invalid or expired managed-identity tokens and authorizes private resources from the token-derived traveler identity rather than a browser-supplied user ID.

**Plans**: 3

**Wave 1**: Identity boundary and session contracts

**Wave 2** *(blocked on Wave 1 completion)*: Registration, verification, MFA, and recovery stepper

**Wave 3** *(blocked on Waves 1–2 completion)*: Refresh, reset invalidation, signout, and release verification

**Cross-cutting constraints**: token-derived ownership; 30-day bounded refresh; neutral recovery privacy; no secret persistence; safe internal reauthentication return.
**UI hint**: yes
**Research flag**: yes — confirm exact Cognito registration, verification, TOTP, recovery, refresh, token-use, and client-integration flows before implementation.

### Phase 2: Draft Plans & Durable Lifecycle

**Goal**: Travelers can create, resume, rename, delete, and restore private Draft Plans without contradictory durable state.
**Mode:** mvp
**Depends on**: Phase 1
**Requirements**: PLAN-01, PLAN-02, PLAN-03, PLAN-04, PLAN-05, PLAN-06, PLAN-07, PLAN-08, TRUST-01, TRUST-02, TRUST-05
**Success Criteria** (what must be TRUE):

  1. My plans shows only the traveler's active Draft Plans in most-recent-activity order, and creating a Plan creates one linked Conversation and opens it immediately.
  2. A traveler can maintain multiple Plans, edit a title without it being overwritten by automatic naming, and resume the last Conversation or Planning Canvas view with Conversation as the safe fallback.
  3. Deleting a Draft Plan removes it from active Plans and places it in Recently deleted for seven days; restoring it during that period returns the latest consistent state, linked Conversation, and last working view.
  4. After seven days, identifiable deleted Plan data is permanently removed and cannot be restored; repeated lifecycle requests remain idempotent and cannot create contradictory state.
  5. Durable mutations require request IDs, expected revisions, and single-use confirmation challenges; only the CRUD backend can commit authorized Plan data, while service/browser projections exclude tokens, credentials, personal data, raw provider payloads, and internal reasoning.

**Plans**: TBD
**UI hint**: yes
**Research flag**: yes — settle the transactional data model, revision/idempotency contract, recovery retention, purge mechanics, and service-to-service authorization without prematurely fixing an infrastructure product.

### Phase 02.1: Local PostgreSQL data foundation and typed CRUD schema (INSERTED)

**Goal:** Local development and CRUD services use a typed, migration-controlled PostgreSQL database for durable Plans, auth sessions, and structured planning data.
**Requirements**: 02.1-DB-01, 02.1-DB-02, 02.1-DB-03, 02.1-DATA-01, 02.1-DATA-02, 02.1-DATA-03, 02.1-CRUD-01, 02.1-AUTH-01
**Depends on:** Phase 2
**Plans:** 4 plans in 4 waves

Plans:

- [ ] 02.1-01 — Add local PostgreSQL Compose service and strict Alembic startup
- [ ] 02.1-02 — Harden CRUD PostgreSQL types, JSONB payloads, and constraints
- [ ] 02.1-03 — Move encrypted auth sessions into PostgreSQL
- [ ] 02.1-04 — Verify PostgreSQL persistence through the FastAPI CRUD contract

### Phase 3: Conversation & Planning Brief

**Goal**: Travelers can shape a Plan through one focused, interruptible Conversation backed by an editable Planning Brief.
**Mode:** mvp
**Depends on**: Phase 2
**Requirements**: DISC-01, DISC-02, DISC-03, DISC-04, DISC-05, TRUST-03
**Success Criteria** (what must be TRUE):

  1. A traveler can begin with a known destination/city or open-ended travel intent; the Conversation asks at most one focused question at a time and accepts early answers, skips, interruptions, and redirects.
  2. A traveler can view and edit a Planning Brief containing interests, dates, party, budget, transport tolerance, accessibility needs, and similar constraints.
  3. Traveler-stated or manually edited Brief entries outrank conflicting agent inferences, which remain visibly tentative until confirmed; deleted entries remain inactive historical context and do not influence ranking unless reintroduced.
  4. Conversation state resumes from a versioned, Plan-scoped LangGraph checkpoint reconciled with the latest CRUD snapshot, so a stale or partial checkpoint cannot replace newer traveler input.

**Plans**: TBD
**UI hint**: yes
**Research flag**: yes — define the AG-UI event/input schemas, LangGraph interrupt and single-active-session behavior, checkpoint reconciliation, and Brief precedence rules.

### Phase 4: Evidence-backed Destination Discovery

**Goal**: Travelers can inspect compact, uncertainty-aware destination research and control which candidates remain in scope for the Plan.
**Mode:** mvp
**Depends on**: Phase 3
**Requirements**: DISC-06, DISC-07, DISC-08, DISC-09, DISC-10, TRUST-04
**Success Criteria** (what must be TRUE):

  1. Travella presents a completed shortlist of no more than five destination candidates with status, fit/confidence, caveats, compact evidence references, and on-demand source details in an in-app panel.
  2. A traveler can explore, reject, extend, refresh, inspect evidence for, or directly name a candidate, with rejected candidates suppressed only within the current Plan.
  3. Refresh and interruption show concise research status and uncertainty while preserving the prior complete shortlist; partial or obsolete research never appears as current results.
  4. Only compact candidate assessments and evidence references are checkpointed as Plan-scoped research; full unselected research payloads and source bundles are not durable Plan data.
  5. External web/provider content is treated as untrusted typed evidence and cannot issue instructions, invoke tools, or mutate the Plan without server-side interpretation and explicit traveler confirmation.

**Plans**: TBD
**UI hint**: yes
**Research flag**: yes — validate evidence/source normalization, attribution and freshness semantics, prompt/tool-injection defenses, and destination-evaluation quality before locking the graph contract.

### Phase 5: Requirements & Adaptive Workspace

**Goal**: Traveler-confirmed requirements produce a safe, editable, map-first workspace containing only relevant functional planning surfaces.
**Mode:** mvp
**Depends on**: Phase 4
**Requirements**: WORK-01, WORK-02, WORK-03, WORK-04, WORK-05, WORK-06
**Success Criteria** (what must be TRUE):

  1. During initial planning, a traveler can explicitly mark flights, accommodation, and car rental as needed, not needed, or undecided, with requirement changes requiring confirmation.
  2. A confirmed single destination/city and Planning Requirements snapshot are required before the workspace is ready; readiness produces a permanent map and only relevant empty/search-ready surfaces, without starting a search or saving an option.
  3. A traveler can add, hide, remove, or navigate to an optional planning surface through the UI or Conversation, with requirement changes confirmed separately from saved-item removal.
  4. The workspace screen is rendered from a validated allow-listed manifest and never contains generated executable UI, credentials, raw provider payloads, or internal agent state.
  5. Changing a confirmed destination identifies affected destination-specific options and pins and requires explicit confirmation before clearing them.

**Plans**: TBD
**UI hint**: yes
**Research flag**: yes — decide the validated WorkspaceManifest/component catalog and wireframe behavior for requirement confirmation, empty/search-ready surfaces, and destination-change warnings.

### Phase 6: Provider Search & Comparison

**Goal**: Travelers can search, compare, refresh, and retry honest provider-backed travel options without fabricated or stale inventory.
**Mode:** mvp
**Depends on**: Phase 5
**Requirements**: SEARCH-01, SEARCH-02, SEARCH-03, SEARCH-04, SEARCH-05, SEARCH-06, SEARCH-07, SEARCH-08, SEARCH-09
**Success Criteria** (what must be TRUE):

  1. With a confirmed destination, only functional provider-backed stays, return flights, same-location cars, and supported places are exposed; unavailable modes remain hidden and mode-specific inputs are validated, including flight origin, exact dates, party, and driver/rental details.
  2. Broad dates, party size, and overall budget can update the Brief while narrow filters, sort, and query state stay search-scoped; results identify one connected provider per mode, show roughly three to five best-fit cards first, and support Show more, detail, and up-to-three-option transient comparison.
  3. Result cards disclose total or clearly labeled estimated-total price, provider identity, decision-critical mode details, and material cancellation, baggage, and policy information.
  4. Criteria changes require explicit Refresh results; prior complete results remain visible with Updating until a complete replacement is ready, and temporary provider failure retains them with an explanation and Retry rather than fabricated or silently substituted results.
  5. Before an exact-date option enters add-to-Plan confirmation, Travella rechecks availability and material terms; changed or unavailable options require a fresh traveler choice, and reconnect restores only the latest compact complete result set—not unfinished searches or transient comparisons as saved data.

**Plans**: TBD
**UI hint**: yes
**Research flag**: yes — confirm functional provider access, provider-neutral normalization, estimated-total and freshness semantics, attribution, rate limits, and mode-specific recheck behavior.

### Phase 7: Planning Canvas & Saved Choices

**Goal**: Travelers can explicitly maintain a consistent map-first Canvas of saved provider options and personal Map Pins.
**Mode:** mvp
**Depends on**: Phase 6
**Requirements**: CANVAS-01, CANVAS-02, CANVAS-03, CANVAS-04, CANVAS-05, CANVAS-06, CANVAS-07
**Success Criteria** (what must be TRUE):

  1. The Planning Canvas is map-first and its categorized list view represents the same saved items.
  2. A traveler can explicitly add, replace, edit, and remove provider-backed Selected Options, with at most one selected stay, flight, and car rental and multiple restaurants or activities.
  3. Saving, replacing, editing, and removing a Selected Option or Map Pin requires exact explicit confirmation; confirmed options and applicable pins are saved together while temporary provider results remain visibly and semantically distinct.
  4. A traveler can search the map for stays, restaurants, and activities and save an allowed result as a categorized Custom Map Pin.
  5. A Custom Map Pin has no price, availability, or supplier link and is not a Selected Option; category/location changes require confirmation, and reconnect restores the latest consistent saved Canvas while unfinished searches can be discarded safely.

**Plans**: TBD
**UI hint**: yes
**Research flag**: yes — validate map/list interaction, place-search capability and attribution, category pin semantics, and explicit replacement/removal confirmation flows.

### Phase 8: Verified Supplier Handoff

**Goal**: Travelers can safely open an eligible provider offer while Travella remains honest about the external transaction.
**Mode:** mvp
**Depends on**: Phase 7
**Requirements**: HANDOFF-01, HANDOFF-02, HANDOFF-03, HANDOFF-04, HANDOFF-05, HANDOFF-06, HANDOFF-07
**Success Criteria** (what must be TRUE):

  1. Only an eligible saved provider-backed Selected Option with a functional handoff can start a Supplier Redirect, and a traveler can request a current-offer refresh before the mandatory final exact-option recheck.
  2. Changed material terms require explicit traveler acceptance before updating the saved option and continuing; unavailable options block redirect and remain visibly unavailable.
  3. The final handoff screen identifies the provider, verified destination domain, and current terms and clearly states that Travella is not booking or confirming anything; a separate explicit Continue opens only a server-generated URL on a verified provider host in the same tab.
  4. A successful handoff records only provider, checked offer details, time, and `Opened provider; booking status unknown`; returning to Travella never implies a booking outcome.
  5. A failed verified handoff keeps the traveler in the Plan, states that no provider site was opened, offers Retry, and saves no handoff record.

**Plans**: TBD
**UI hint**: yes
**Research flag**: yes — complete redirect-domain verification, provider handoff contract, same-tab browser behavior, audit/status wording, and the final security review before public deployment.

## Coverage Validation

| Phase | Requirements | Count |
|-------|--------------|-------|
| Phase 1: Account Access | AUTH-01–AUTH-08 | 8 |
| Phase 2: Draft Plans & Durable Lifecycle | PLAN-01–PLAN-08, TRUST-01, TRUST-02, TRUST-05 | 11 |
| Phase 3: Conversation & Planning Brief | DISC-01–DISC-05, TRUST-03 | 6 |
| Phase 4: Evidence-backed Destination Discovery | DISC-06–DISC-10, TRUST-04 | 6 |
| Phase 5: Requirements & Adaptive Workspace | WORK-01–WORK-06 | 6 |
| Phase 6: Provider Search & Comparison | SEARCH-01–SEARCH-09 | 9 |
| Phase 7: Planning Canvas & Saved Choices | CANVAS-01–CANVAS-07 | 7 |
| Phase 8: Verified Supplier Handoff | HANDOFF-01–HANDOFF-07 | 7 |
| **Total** | **All v1 requirements** | **60/60** |

All 60 v1 requirements map to exactly one phase. No v1 requirements are orphaned or duplicated.

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Account Access | 0/TBD | Not started | - |
| 2. Draft Plans & Durable Lifecycle | 2/4 | In progress | - |
| 3. Conversation & Planning Brief | 0/TBD | Not started | - |
| 4. Evidence-backed Destination Discovery | 0/TBD | Not started | - |
| 5. Requirements & Adaptive Workspace | 0/TBD | Not started | - |
| 6. Provider Search & Comparison | 0/TBD | Not started | - |
| 7. Planning Canvas & Saved Choices | 0/TBD | Not started | - |
| 8. Verified Supplier Handoff | 0/TBD | Not started | - |
