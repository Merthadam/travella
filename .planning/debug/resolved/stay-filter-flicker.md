---
status: resolved
trigger: Slight old-frontend flicker opening Property type, amenities & cancellation
created: 2026-10-30
updated: 2026-10-30
---
## Symptoms
User screenshot identifies accommodation search provider-filter disclosure. Expected: one stable current filter panel when opening, without obsolete or provisional UI flashing.

## Current Focus
Hypothesis: native details opens before its asynchronous onToggle state update; catalog requests begin after opening and empty fieldsets/refund controls precede loaded options. Confirm rendered frames before changing code.
Next action: reproduce in authenticated Chrome with real catalogs, measure cold and warm opening, inspect any style or remount transition.

## Scope
Preserve current design, selection semantics and explicit search submission. Existing design reuse preference retained. Inline GSD debugging; no subagents.

## Evidence
Real Chrome frames: closed height35.8; at273ms open height220.2 with empty headings/refund and no loading; at289ms height239.4 with loading; at657ms height588.2 with24 options. No separate legacy filter component or stylesheet was found. The obsolete-looking frame is the current form rendered before catalogs arrive.

## Fix plan
Preload catalogs only when accommodation search is active, keep an in-flight load alive across open/close, and handle the native summary click synchronously. Render a dedicated loading body instead of incomplete filter controls; preserve editable selections and refund control on catalog failure, plus existing retry and selection semantics. Settled current design is the intended visual state.

## Resolution
Fixed metadata preload and synchronous disclosure rendering. 107 targeted tests, build, authenticated Chrome desktop/mobile checks, real catalogs and simulated loading/error/empty/retry passed. Before: two incomplete frames; after: one transition to 24 options. Evidence: artifacts/testing/2026-10-30-stay-filter-flicker/verification.md.
