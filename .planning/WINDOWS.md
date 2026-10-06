---
schema_version: 1
open_count: 4
waived_count: 0
fixed_count: 1
total_count: 5
last_updated: 2026-10-06T17:23:50.030Z
---

# Broken Windows Ledger

> Cross-phase defect register. With `workflow.windows_enforce` enabled, `/gsd-ship` blocks while `open_count > 0`.
> Waive with `gsd-tools windows waive <id> "<reason>"` (reason required).
> Mark fixed with `gsd-tools windows fixed <id>`.

| id | phase | kind | file | line | description | status | reason | recorded_at | resolved_at |
|----|-------|------|------|------|-------------|--------|--------|-------------|-------------|
| 1 | 10 | deviation | services/agent/service.py |  | Added a validated source projection so only read-page citations attach to the answer. | open |  | 2026-10-04T11:55:06.521Z |  |
| 2 | 10 | deviation | services/mcps/research_server.py |  | Extended the existing search operation to support factual queries and scoped sources without candidates. | open |  | 2026-10-04T11:55:15.842Z |  |
| 3 | 13 | unrun-verify | frontend/src/features/account/AccountSettingsPage.jsx |  | 13-01 browser save/reload, selected Plan return, responsive/theme screenshots and console/network checks remain the explicit 13-05 gate. | open |  | 2026-10-06T14:19:35.433Z |  |
| 4 | 13 | stub | frontend/src/features/account/AccountSettingsPage.jsx | 145 | Account security rows and security capabilities are intentionally unavailable until plan 13-04. Preferences completed in 13-02 and canonical identity/conditional email in 13-03; browser gate remains open in entry 3. | fixed |  | 2026-10-06T14:19:50.022Z | 2026-10-06T17:23:50.030Z |
| 5 | 13 | unmet-truth | .planning/phases/13-account-settings-and-travel-preferences/deferred-items.md |  | Full requested frontend regression run has 12 pre-existing failures reproduced from 49e6d526; new account tests pass. | open |  | 2026-10-06T14:19:50.112Z |  |

````json
[
  {
    "id": 1,
    "kind": "deviation",
    "phase": "10",
    "file": "services/agent/service.py",
    "line": null,
    "description": "Added a validated source projection so only read-page citations attach to the answer.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-10-04T11:55:06.521Z",
    "resolved_at": null,
    "milestone": null
  },
  {
    "id": 2,
    "kind": "deviation",
    "phase": "10",
    "file": "services/mcps/research_server.py",
    "line": null,
    "description": "Extended the existing search operation to support factual queries and scoped sources without candidates.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-10-04T11:55:15.842Z",
    "resolved_at": null,
    "milestone": null
  },
  {
    "id": 3,
    "kind": "unrun-verify",
    "phase": "13",
    "file": "frontend/src/features/account/AccountSettingsPage.jsx",
    "line": null,
    "description": "13-01 browser save/reload, selected Plan return, responsive/theme screenshots and console/network checks remain the explicit 13-05 gate.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-10-06T14:19:35.433Z",
    "resolved_at": null,
    "milestone": null
  },
  {
    "id": 4,
    "kind": "stub",
    "phase": "13",
    "file": "frontend/src/features/account/AccountSettingsPage.jsx",
    "line": 145,
    "description": "Account security rows and security capabilities are intentionally unavailable until plan 13-04. Preferences completed in 13-02 and canonical identity/conditional email in 13-03; browser gate remains open in entry 3.",
    "status": "fixed",
    "reason": "",
    "recorded_at": "2026-10-06T14:19:50.022Z",
    "resolved_at": "2026-10-06T17:23:50.030Z",
    "milestone": null
  },
  {
    "id": 5,
    "kind": "unmet-truth",
    "phase": "13",
    "file": ".planning/phases/13-account-settings-and-travel-preferences/deferred-items.md",
    "line": null,
    "description": "Full requested frontend regression run has 12 pre-existing failures reproduced from 49e6d526; new account tests pass.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-10-06T14:19:50.112Z",
    "resolved_at": null,
    "milestone": null
  }
]
````
