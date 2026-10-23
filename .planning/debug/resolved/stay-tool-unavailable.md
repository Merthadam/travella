---
status: resolved
trigger: Stay search in Obertauern says tools inactive with no missing details
---
# Stay search dispatch

## Symptoms
Canvas assistant says stay tools inactive despite draft destination, Feb 1–7 2027 and two travelers. Expected: activate stay search or ask for the actual missing inputs, rather than asking the traveler to resend.

## Current Focus
hypothesis: intent recognition drops ordinary accommodation wording or follow-up after freeform assistant prose; inactive gate bypasses input clarification.
next_action: inspect the actual latest traveler request on the separate stack, reproduce through production criteria/editor tests, then fix and browser-verify there.

GSD debug runs inline under the skill's Codex spawn restriction. No frontend redesign planned. Preserve user Plan and both stack volumes.

## Evidence and correction
- Read the failing Plan conversation without mutating it: the exact last user turn was “okay can you show me some accomodations in obertauern?”
- Three independently duplicated regexes recognized only singular correctly spelled accommodation, hotels/stays and flights. Both the reported spelling and correctly spelled plural accommodations disabled stay discovery.
- Centralized the vocabulary used by activation, mode selection and clarification continuity. Recognizes common accommodation spelling variants, singular/plural, apartments, lodging and guesthouses. Existing criteria authority and cancellation/reset checks remain in force.
- Added 11 HTTP/graph/editor regressions: six full clarification-to-search sequences and five mixed stay/flight requests. All 11 fail against baseline. Full focused suite: 220 passed including existing Canvas/Research SSE-to-React and checkpoint checks.
- Browser test Plan only: 73afb6e1-5514-4944-a277-232ab074e0f0, exact dates Feb1–7 2027, Obertauern Austria, two travelers. Created via app and saved using application API challenge. Initial fixture setup attempts rejected incorrect card summary and malformed request ID; corrected fixture setup succeeded, revision2. User Plan untouched.
- Before screenshot captures actual SDK generic prose rather than the authoritative host clarification. It is nondeterministic and differs from user's exact refusal; tests prove inactive gate deterministically.
- Rebuilding only travella-research-preview (5175). Next: verify source hash and authenticated browser search/preloaded manual page, then clean up test record.

## Resolution
Source f6c1724 is running on http://localhost:5175; source hash matches. Real browser SDK/provider search after exact reported wording and room reply returned one Obertauern stay with loaded photograph for Feb1–7 2027. View all stays preloaded the manual form and reused the result; back retained preview. Plan revision unchanged. 220 focused tests pass. Console clean apart from existing Lit warning; relevant network requests200. Only own test Plan deleted afterward.

Evidence: artifacts/testing/2026-10-16-stay-tool-unavailable/verification.md and before/after screenshots. Provider remains configured for sandbox inventory. Original5174 stack not rebuilt; user should use5175. No remaining work for this reported activation defect.
