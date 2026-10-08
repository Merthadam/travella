---
status: resolved
trigger: "for some reason calling llms does not work i dont know why that is"
created: 2026-10-08
updated: 2026-10-08
---

# LLM requests fail when local app exits

## Symptoms

- Expected: local chat/canvas invokes Claude SDK and returns a reply.
- Actual: user reports LLM calls fail; frontend port has repeatedly disappeared after successful startup.
- Reproduction: current local stack, exact user message/action not yet known.

## Current Focus

root_cause: The shared Colima VM had only 2 GiB; aggregate development-container memory exhausted it and killed app uvicorn processes.
next_action: User retries their original request; full canvas-generation acceptance remains separate.

## Evidence

- Docker inspect: app exited 137, OOMKilled=true, about 48 seconds after startup.
- App container has no explicit memory cap and no restart policy.
- Docker engine reports approximately 1.91 GiB total memory, 2 CPUs and multiple running worktree stacks.
- Health and authentication succeeded before the app was killed; credentials have not been shown to be invalid.

## Resolution

- User approved increasing Colima to 6 GiB and restarting all local containers.
- Recorded 11 running containers, restarted Colima with `colima start --memory 6`, and restored those containers without deleting volumes. Docker reports 5.77 GiB usable.
- Rebuilt Travella and passed sign-in/session/sign-out readiness checks.
- One direct Claude SDK text diagnostic, capped at $0.03 and 30 seconds, returned exactly READY in 2.45 seconds. This confirms credentials, configured model and SDK execution; it does not verify every chat/canvas graph path.
- App remained healthy, running=true and OOMKilled=false after the call. All 11 previously running containers were running after restoration.
- Startup now warns when Docker has less than 4 GiB total memory. Readiness checks exited containers and reports OOM failure immediately rather than waiting for five minutes.
- Updated travella-local skill with memory diagnosis and approved restart/restore procedure.
- `bash -n scripts/start-local.sh scripts/start-local-ready.sh` and `git diff --check` passed. No automated tests were added or run.
