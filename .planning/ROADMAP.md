# Roadmap: Travella

## Overview

Travella's full documented MVP moves a traveler from secure account access through a private, recoverable Draft Plan; an interruptible Conversation and editable Brief; evidence-backed destination discovery; traveler-confirmed requirements; a validated map-first workspace; honest provider-backed search and comparison; explicit saved options and Map Pins; and a verified external supplier handoff that never claims a booking. The phases preserve the accepted Cognito, AG-UI, LangGraph, CRUD-authority, and private Connector/MCP boundaries while keeping provider and infrastructure choices behind contracts.

## Phases

- [ ] **Phase 1: Account Access** - Travelers securely register, verify, recover, sign in, and sign out of a private account.
- [ ] **Phase 2: Draft Plans & Durable Lifecycle** - Travelers own multiple recoverable Draft Plans with idempotent, revision-safe durable state.
- [ ] **Phase 3: Conversation & Planning Brief** - Travelers shape one Plan through focused, interruptible conversation and editable constraints.
- [ ] **Phase 4: Full-Screen Plan Chat** - Travelers research an active Plan in a full-page conversation that streams assistant text and keeps agent context private.
- [ ] **Phase 5: Requirements & Adaptive Workspace** - Confirmed requirements compose a permanent map and only relevant validated planning surfaces.
- [ ] **Phase 6: Provider Search & Comparison** - Travelers search and compare honest provider-backed options with refresh, retry, and recheck semantics.
- [ ] **Phase 7: Planning Canvas & Saved Choices** - Travelers explicitly manage Selected Options and categorized Map Pins in a consistent map/list Canvas.
- [ ] **Phase 8: Verified Supplier Handoff** - Travelers safely open an eligible provider offer while Travella records only an unknown booking outcome.
- [ ] **Phase 10: Evidence-grounded iterative agent research** - Travelers ask about any country or place and get source-grounded answers with useful explanations, citations, and honest uncertainty.

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

### Phase 03b: Agentic conversation — conversational redesign

**Goal**: An authenticated traveler can hold a coherent, resumable Plan conversation with real Claude system prompts, bounded evidence-backed research and a small LangGraph workflow.
**Depends on**: Phase 2, Phase 02.1 schema foundation, existing Phase 3B MCP/Gateway implementation
**Requirements**: DISC-01, DISC-02, DISC-04, DISC-05, DISC-06, DISC-07, DISC-08, DISC-10, TRUST-03, TRUST-04
**Scope**: Backend delivery slice of Phases 3 and 4. It does not independently complete those product requirements or include frontend design.
**Status**: Planning corrective work; historical verification remains gaps_found.
**UI hint**: no
**Research flag**: yes — verify installed Claude/MCP protocol, minimal graph stages, persistent checkpoint compatibility and state reconciliation.

**Success Criteria**:

1. Versioned system prompts and bounded conversation/Brief context reach Claude; relevant replies and one useful question replace fixed message-length routing.
2. A small LangGraph controls conversation and research, with one bounded tool-execution owner and validated cited shortlists.
3. Versioned, encrypted, traveler/Plan-scoped checkpoints resume after restart only after reconciliation with CRUD; credentials and raw provider output are never checkpointed.
4. Traveler edits and inactive preferences, duplicate events, redirects, candidate rejections and failed refresh retain their documented meaning across requests and processes.
5. Agent, CRUD and MCP HTTP integration tests establish ownership, persistence and obsolete-run suppression; live provider evidence is reported separately.

**Plans**: 01–06 have implementation summaries but are not phase verification. Corrective plans 07–11 are ready under `.planning/phases/03b-agentic-conversation/`.

### Phase 4: Full-Screen Plan Chat

**Goal**: A traveler can research and shape an active Plan through a full-screen conversation that loads existing history, streams assistant text as it is generated, and keeps agent context and progress private.
**Mode:** mvp
**Depends on**: Phase 3, Phase 03b agent conversation service
**Requirements**: DISC-06, DISC-07, DISC-08, DISC-09, DISC-10, TRUST-04
**Success Criteria** (what must be TRUE):

  1. Opening a Plan replaces its conversation drawer with a responsive, full-page chat route that loads and displays that Plan's existing conversation history.
  2. Sending a message creates a visible user turn and an assistant reply whose text appears incrementally; the composer disables while the reply is active, Enter sends, and Shift+Enter inserts a newline.
  3. A traveler can stop an active reply; streamed text stays visible with a stopped marker. A disconnected reply keeps its partial text, is marked interrupted, and offers Retry without presenting it as complete.
  4. Assistant source references, when present in the allow-listed response, render inline with the relevant reply. Agent context, memory contents, tool activity, research progress, internal reasoning, and raw provider payloads are not streamed to the browser.
  5. Authentication, Plan ownership, existing Plan-scoped agent context, message persistence, and idempotent event handling remain enforced through current service boundaries; streaming is limited to assistant-visible text and a terminal outcome.

**Plans**: 1 plan in 1 vertical slice
**UI hint**: yes
**Research flag**: yes — inspect the installed model SDK streaming interfaces, AG-UI text event contract, authenticated proxy behavior, and existing conversation persistence/cancellation boundaries before implementation.

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
| Phase 4: Full-Screen Plan Chat | DISC-06–DISC-10, TRUST-04 | 6 |
| Phase 5: Requirements & Adaptive Workspace | WORK-01–WORK-06 | 6 |
| Phase 6: Provider Search & Comparison | SEARCH-01–SEARCH-09 | 9 |
| Phase 7: Planning Canvas & Saved Choices | CANVAS-01–CANVAS-07 | 7 |
| Phase 8: Verified Supplier Handoff | HANDOFF-01–HANDOFF-07 | 7 |
| **Total** | **All v1 requirements** | **60/60** |

All 60 v1 requirements map to exactly one phase. No v1 requirements are orphaned or duplicated.

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 10

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Account Access | 0/TBD | Not started | - |
| 2. Draft Plans & Durable Lifecycle | 2/4 | In progress | - |
| 3. Conversation & Planning Brief | 0/TBD | Not started | - |
| 4. Full-Screen Plan Chat | 0/1 | Not started | - |
| 5. Requirements & Adaptive Workspace | 0/TBD | Not started | - |
| 6. Provider Search & Comparison | 0/TBD | Not started | - |
| 7. Planning Canvas & Saved Choices | 0/TBD | Not started | - |
| 8. Verified Supplier Handoff | 0/TBD | Not started | - |
| 10. Evidence-grounded iterative agent research | 6/6 | In Progress|  |

### Phase 10: Evidence-grounded iterative agent research

**Goal:** A traveler can ask about any country or place and get a useful answer grounded in retrieved source content, with bounded iterative research, clear citations, and remaining uncertainty stated.
**Requirements**: Supports DISC-06, DISC-07, DISC-09, DISC-10, TRUST-04
**Depends on:** Phase 03b
**Scope:** The agent researches factual questions about countries and places, reads relevant source content, and gives a conversational explanation. Destination-discovery requests also return the existing structured candidate results. No personal-memory RAG, new chat interface, autonomous Plan mutation, or booking behavior is included.
**Success Criteria** (what must be TRUE):

  1. Factual country/place questions trigger research; relevant recent evidence may be reused across a resumed Plan chat, while time-sensitive facts are refreshed.
  2. Research reads relevant linked-page content where available; inaccessible pages are identified, and answer claims are grounded in evidence actually retrieved.
  3. Claude evaluates retrieved evidence and can make a bounded number of targeted follow-up searches before answering; source disagreements are explained with both sources cited.
  4. Replies stream as natural-language answers with supporting source links beneath the relevant reply; when evidence remains incomplete, the answer states what is uncertain.
  5. Destination-discovery requests preserve structured candidates alongside the explanation, and no destination or other durable Plan data changes without explicit traveler action.

**Research flag:** yes — verify Tavily search/extraction behavior, Claude/MCP tool-loop support, source safety, evidence reuse and freshness, and bounded iteration.
**Plans:** 6/6 plans executed

Plans:
**Wave 1**

- [x] 10-01-PLAN.md

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 10-02-PLAN.md

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 10-03-PLAN.md

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 10-04-PLAN.md

**Wave 5** *(blocked on Wave 4 completion)*

- [x] 10-05-PLAN.md

**Wave 6** *(blocked on Wave 5 completion)*

- [x] 10-06-PLAN.md

### Phase 11: Use Claude Agent SDK as a LangGraph research worker

**Goal:** Route the Plan-scoped research stage through a bounded Claude Agent SDK worker with native web research and Travella research skills, while LangGraph remains the sole end-to-end orchestrator, checkpoint owner, and AG-UI boundary.
**Requirements**: AGENT-11-01, AGENT-11-02, AGENT-11-03, AGENT-11-04
**Depends on:** Phase 10
**Success Criteria**:

1. LangGraph routes research turns to a single-turn Claude Agent SDK worker; later and future workflow stages remain LangGraph nodes, and SDK sessions are not used as durable conversation state.
2. The worker can use only the approved web search/fetch and named Travella research skill capabilities, with bounded turns/time/cost and no filesystem, shell, Plan mutation, or arbitrary MCP tools.
3. The worker returns schema-validated answer text and source metadata; only user-visible answer text and validated citations reach the existing AG-UI/chat projection, and only compact normalized state is checkpointed.
4. Existing Phase 10 behavior remains intact: factual research reads supporting pages, discloses unavailable/conflicting evidence, supports bounded refinement, preserves destination candidates, and never changes durable Plan data without traveler action.
5. Anthropic API credentials are resolved from AWS Secrets Manager for AgentCore Runtime and local development without entering images, logs, browser events, checkpoints, or source control; failures remain recoverable and interrupt/cancel behavior is preserved.

**Plans**: 3 plans in 3 waves

Plans:
**Wave 1**

- [ ] 11-01-PLAN.md — Define the isolated Claude research worker and skill contract

**Wave 2** *(blocked on Wave 1 completion)*

- [ ] 11-02-PLAN.md — Integrate the worker with LangGraph state, streaming, and source projection

**Wave 3** *(blocked on Wave 2 completion)*

- [ ] 11-03-PLAN.md — Wire runtime credentials, deployment, evaluation, and rollout safeguards
