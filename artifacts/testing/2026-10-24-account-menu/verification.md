# Account menu prototype verification — 2026-10-24

Scope: three throwaway header designs on the authenticated existing `/plans` route. User selection and production implementation are pending.

Run: `cd frontend && npm run prototype:account`
Preview: http://localhost:5188/plans?prototype=account-menu&variant=A (also B, C)
Backend: existing local service on localhost:5174. No backend changes or Plan mutations were made for this task.

## Executed checks

- Example-account sign-in through the actual UI succeeded. Password read privately from the configured account file; no credentials recorded in evidence.
- Chrome DevTools MCP could not acquire its shared Chrome profile. Used the installed Chrome DevTools CLI and its existing isolated headless browser instead; left other pages and browser processes intact.
- Each variant: trigger opens; Escape closes; outside pointer closes; account settings and sign-out display simulated feedback and close the panel. All checks returned true.
- ArrowRight cycles A → B → C → A and updates the URL. Reload preserves A and restores the authenticated header after session loading finishes. `/auth/session` and `/v1/plans?view=active` returned 200.
- Desktop screenshots at 1440 × 900 and touch/mobile screenshots at 390 × 844 captured for all three variants. Every mobile menu fits within the viewport; no horizontal overflow.
- Light palette exercised and captured for C; all variants share the same theme-token panel styles.
- Inspected saved A/B/C desktop and mobile screenshots and C light screenshot: labels legible, menus contained, controls visible. Floating prototype switcher intentionally overlays page content.
- Console: no errors; existing Lit development-mode warning only. Inspected network requests: no failed requests in final loaded state.
- `npm run build`: passed. Existing large-chunk warning remains. Prototype component strings absent from built JavaScript; rendering is development-only.

## Verification corrections

The CLI window resize initially clamped the narrow viewport to 500px. Rechecked using explicit Chrome device emulation at 390px. Device emulation triggered a reload; initial screenshots captured loading or mismatched variants. Discarded/replaced these screenshots after waiting for the authenticated header and asserting the actual variant. Final mobile evidence is 390px and correctly labelled. Initial immediate reload check ran during loading; repeated after load and confirmed authentication.

## Evidence

- [Original header](plan/before.png)
- A: [desktop](plan/A-desktop.png), [mobile](plan/A-mobile.png)
- B: [desktop](plan/B-desktop.png), [mobile](plan/B-mobile.png)
- C: [desktop](plan/C-desktop.png), [mobile](plan/C-mobile.png), [light](plan/C-light.png)

Prototype actions are intentionally stubbed; real account navigation and logout are not implemented or tested by these previews. No automated tests were added for throwaway UI. No production implementation screenshots apply. Selection and production accessibility hardening remain a subsequent task.
