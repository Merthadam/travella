---
status: passed
verified: 2026-11-05
---
# Scoped branch integration verification

Scope: completed accommodation location/map branch integrated with origin/main 97d610a; broader Phase 18 acceptance remains unchanged.

- 230 frontend tests passed across PlanningCanvas, canvas persistence, booking locations, Google map adapter, checkout recovery, stay checkout, search, workspace and location filters. Nine map-adapter tests initially encountered Node's experimental localStorage global; all nine passed with `NODE_OPTIONS=--no-experimental-webstorage`. No application change was required for that environment issue.
- 234 backend tests passed across provider checkout/confirmation/search, booking/map CRUD, authentication/body limits, location resolution, agent tools/worker, workspace journey, travel API/registry and authenticated travel proxy.
- Production build and whitespace/conflict checks passed; existing bundle-size and dependency warnings remain.
- Real Chrome DevTools on rebuilt http://localhost:5202: existing `booked_stay` gained provider identity and `mapSynced` without duplication; exactly four places persisted after reload. Actual hotel search near two selected places returned 28 stays. Result selection highlighted its matching numbered marker; nine other hotel pins dimmed and all saved place markers stayed opaque. Desktop/narrow layouts exercised, screenshots visually inspected, no console errors or failed fetch/XHR calls on final run.
- Existing local Cognito discovery, example-account sign-in/session/sign-out and app health passed. Seven representative frontend/agent/CRUD/connector source hashes matched the running containers.
- Scoped security review: `SHIP-SECURITY.md`, threats_open: 0.

Evidence and exact commands: `artifacts/testing/2026-11-05-stay-main-merge/verification.md`.
