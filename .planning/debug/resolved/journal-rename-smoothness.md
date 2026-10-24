---
status: resolved
trigger: "renaming isnt as smooth lets fix that"
created: 2026-10-24
updated: 2026-10-24
---

# Journal rename smoothness

## Symptoms
- Expected: edit the title in place and press Enter; preserve its appearance, card position and focus.
- Actual: editing changes typography and card height; saving an ordinary card promotes it to the featured position and inserts a notice above the list.
- Timeline: introduced with the approved journal implementation, b388db6.
- Reproduction: click a title, then save an ordinary card. No error is needed to reproduce.
- Existing approved design and Enter-save semantics retained; no new prototype selection required.

## Current Focus
- hypothesis: incompatible display/editor geometry plus list reordering and notice insertion cause the visible jumps.
- test: measure title font, card height and metadata position before/during edit; verify ordinary-card identity/order and focused element after a real rename.
- next_action: completed; user can review the rebuilt local preview.

## Evidence
- Chrome DevTools: featured card grows from 350.984px to 387.078px on edit; metadata moves down 36.094px; title font shrinks from 34px to 28px.
- PlansApp.completed prepends every renamed plan and sets a visible notice above the list. Featured and ordinary cards occupy different React parents, so promotion remounts the card and loses title focus.
- Inline editor adds padding, helper row and Cancel button; busy input becomes disabled and loses focus.

## Planned Fix
- One typography/measurement shell for display and editing, including wrapped names. Enter saves, Escape cancels; clicking away cancels an unsubmitted edit without stealing focus. Unchanged Enter closes without a request.
- Preserve card position for the current visit; the next list fetch uses authoritative activity order. Announce rename success without inserting visible page content.
- Keep the field read-only while saving so focus remains stable; preserve uncertain retry/challenge semantics. Verify desktop/mobile, real saved name/reload, errors and cancellation.
- Execute inline under GSD debug workflow; no subagents requested. Evidence under artifacts/testing/2026-10-24-rename-smoothness.

## Resolution
- Root cause confirmed: different editor geometry, a disabled saving input, and parent-list reordering/visible notice insertion caused jumps and focus loss.
- Source `12dba91` shares title/editor typography and wrapping, preserves list order for this visit, announces success without visible insertion, keeps focus during saving and restores title focus afterward. Escape/click-away cancel; unchanged Enter avoids writing. Renamed search results remain visible until the query/filter changes.
- 24 focused tests and production build passed. Authenticated Chrome DevTools measured 0px geometry shift on featured/ordinary desktop and wrapped mobile titles; real Enter save retained DOM identity and focus, and persisted through API readback/reload. Light/dark screenshots inspected. Generated Canvas card retained its loaded photo and height.
- Two task-owned verification records soft-deleted and read back with recovery deadlines. Existing data unchanged by this verification. Console/network had no application errors. Rebuilt canonical local stack, authenticated, verified runtime source hashes; restored once after an independent shared-stack rebuild.
- Evidence: `artifacts/testing/2026-10-24-rename-smoothness/verification.md`.
