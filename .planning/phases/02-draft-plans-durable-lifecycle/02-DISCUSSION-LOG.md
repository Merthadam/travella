# Phase 2: Draft Plans & Durable Lifecycle - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-27
**Phase:** 02-draft-plans-durable-lifecycle
**Areas discussed:** Existing-document authority, activity ordering, automatic-title confirmation, restoration navigation, rename conflicts

## Existing-document authority

The initial discussion offered broad lifecycle/UI topics. The traveler asked, “arent these quite defined in my docs already?” The assistant checked the lifecycle story, contracts, diagrams, and screen reference, acknowledged the duplication, and narrowed discussion to concrete gaps. The traveler then requested, “oka lets dive into the gaps”. Existing documented behavior was carried forward rather than reopened.

## Activity ordering

| Option | Description | Selected |
|--------|-------------|----------|
| 1 | Opening or changing a Plan moves it to the top; record visits separately from content changes. | Yes |
| 2 | Only saved changes move a Plan to the top; viewing leaves ordering unchanged. | |

**User's choice:** `1`
**Notes:** Read-only opening in the existing API contract must remain read-only; technical research will define the separate visit-recording operation.

## Automatic-title confirmation

| Option | Description | Selected |
|--------|-------------|----------|
| 1 | Include the suggested title in the related confirmation; one action confirms both changes. | Yes |
| 2 | Require a separate acceptance of the suggested title. | |

**User's choice:** `1`
**Notes:** A manually entered title remains authoritative. The example discussed was a destination confirmation that also shows the resulting title.

## Restoration navigation

| Option | Description | Selected |
|--------|-------------|----------|
| 1 | Return to My plans, highlight the restored Plan, and offer Open plan. | |
| 2 | Immediately open the restored Plan in its last working view, with Conversation fallback. | Yes |

**User's choice:** `2`
**Notes:** The Plan still returns to the active list as required; this choice specifies immediate navigation after restoration.

## Rename conflicts

| Option | Description | Selected |
|--------|-------------|----------|
| 1 | Preserve the entered title, show the latest saved title, and require explicit review/reapply. | Yes |
| 2 | Reload the saved title, discard the attempted rename, and let the traveler start again. | |

**User's choice:** `1`
**Notes:** No silent overwrite or automatic retry of the stale rename. Existing re-authentication privacy rules still apply.

## Technical follow-up

The assistant identified transactional storage, purge mechanics, idempotency retention, and exact confirmation/concurrency contracts as engineering research topics. No database, retention value beyond the documented seven-day recovery period, or production deployment was chosen by the traveler in this discussion.

## Deferred Ideas

None added.
