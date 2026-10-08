# Empty canvas research cards — manual verification

Date: 2026-10-08. Scope: Good to know research notes and Useful websites.
Workflow: GSD debug; existing approved component layout retained.
Environment: local single-container stack, http://localhost:5174, mandatory example account.

## Cause and changes

The research worker could return empty arrays without reading sources, and its
review accepted that as complete. The browser also rendered failed empty groups
as ordinary empty cards while its notice could claim the whole draft was ready.

- Prompt now requests relevant destination resources when evidence is missing.
- Code validation requires a sourced finding and a website; existing single repair
  attempt handles empty output, then surfaces failure. No budget/turn increases.
- Failed empty cards use existing Retry presentation; existing content survives.
- Partial failures no longer announce a complete draft. Broken streams also request
  cancellation so an active server run can release its context lease.

## Observed checks

| Manual check | Result |
| --- | --- |
| Original direct SDK reproduction | Empty findings/links; zero searches and reads; reviewer accepted. |
| Original browser generation | Both research cards empty despite ready notice; themes populated. |
| Repaired direct SDK invocation | Two findings, one website, one page read, two SDK calls, $0.0781134. |
| Full browser generation | Three findings and one website from the official Salzburg tourism resource; five independent theme items. |
| Save and HTTP readback | Save succeeded; GET canvas 200, revision 2; 3 findings / 1 link / 5 themes. |
| Reload and container rebuild | Same persisted counts and rendered cards after reopening and authentication. |
| Loading/interruption | Skeleton visible during generation; interrupted empty cards displayed Retry. |
| Offline regeneration | After confirming replacement, connection failure preserved all 3 notes and 1 link; enabled Retry; no false ready notice. |
| Restore network and reload | Saved cards restored; online session/canvas/context reads all 200. |
| Mobile 390 × 844 | Notes expand and source link is visible; link card readable; document width 390, no horizontal overflow. |
| Desktop 1440 × 1000 | Both generated cards populated; inspected screenshots. |
| Console | No errors after final reload; existing Lit development-mode warning only. |
| Local startup | Cognito precheck and sign-in/session/sign-out readiness passed; four changed runtime files match container SHA-256. |
| Cleanup | Only the two diagnostic Plans were soft-deleted; both active reads return 404. |

## Evidence

- [Before: empty websites](implementation/before-links.png)
- [Loading websites](implementation/loading-links.png)
- [Interrupted websites with Retry](implementation/interrupted-links.png)
- [Generated notes](implementation/after-notes.png)
- [Generated website](implementation/after-links.png)
- [Mobile expanded note](implementation/mobile-notes.png)
- [Mobile website](implementation/mobile-links.png)

## Limits

No automated tests were added or run. This was a bounded manual check using one
destination, not a broad source-availability evaluation. One browser attempt
encountered Chrome `net::ERR_NETWORK_IO_SUSPENDED`; the successful rerun and
subsequent saved readback are the completion evidence. Page availability or
budget exhaustion can still require Retry; unsupported content is not fabricated.
The chat sidebar remains a separate future task.
