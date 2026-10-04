---
schema_version: 1
open_count: 2
waived_count: 0
fixed_count: 0
total_count: 2
last_updated: 2026-10-04T11:55:15.842Z
---

# Broken Windows Ledger

> Cross-phase defect register. With `workflow.windows_enforce` enabled, `/gsd-ship` blocks while `open_count > 0`.
> Waive with `gsd-tools windows waive <id> "<reason>"` (reason required).
> Mark fixed with `gsd-tools windows fixed <id>`.

| id | phase | kind | file | line | description | status | reason | recorded_at | resolved_at |
|----|-------|------|------|------|-------------|--------|--------|-------------|-------------|
| 1 | 10 | deviation | services/agent/service.py |  | Added a validated source projection so only read-page citations attach to the answer. | open |  | 2026-10-04T11:55:06.521Z |  |
| 2 | 10 | deviation | services/mcps/research_server.py |  | Extended the existing search operation to support factual queries and scoped sources without candidates. | open |  | 2026-10-04T11:55:15.842Z |  |

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
  }
]
````
