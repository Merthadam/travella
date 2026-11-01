# Guest-details design verification — 1 November 2026

Scope: three interactive design alternatives, not production checkout integration. User explicitly chose prototypes after the competitor review. No booking, payment, Plan CRUD or provider request was submitted.

## Preview and source

- http://localhost:5199/plans?prototype=stay-guests&variant=A (B and C also supported).
- Branch: prototype/stay-guests-20261101. Worktree: /Users/adammerth/.codex/worktrees/travella-guest-prototypes-20261101.
- Start from frontend: `npm run prototype:guests`. Canonical backend must be running on localhost:8003.
- Existing authenticated /plans host and app header retained. Actual session/profile/plan-list reads retained; booking context is a clearly labeled fictional fixture. All prototype edits and review state live in memory.
- Before-state guest form: ../2026-10-31-stay-checkout-summary/implementation/desktop-guests.png.

## Executed checks

| Check | Observed outcome |
|---|---|
| Production build | Passed; existing large-bundle warning. Prototype host and switcher gated to development. |
| Chrome DevTools, example account | All variants exercised using the supplied example-account credentials in an isolated Chrome context. |
| A continuous form | Invalid email blocks review; someone-else reveals main guest fields; edited guest differs from contact; simulated review works. |
| B guided steps | Contact → guests → review; two-room scenario displays separate room leads; optional arrival and requests appear in simulated review. |
| C editable review | Contact and guest sections open/close; invalid contact remains blocked even when collapsed; edited two-room leads appear in review. |
| Variant switching | Next wraps C→A; keyboard right cycles; left within a name input does not change variant; entered values survive switches. |
| Reload | Variant stays in URL; fictional form state resets as intended. Device-emulation reload also confirmed this. |
| Responsive | Desktop 1440px and emulated mobile 390×844. A and C measured document width 390 with no horizontal overflow; all three mobile flows completed. Native resize clamped to 500px, so those provisional captures were replaced using actual mobile emulation. |
| Console/network | Final console: no errors, existing Lit development warning. Session/profile/plans reads 200. No booking or Plan mutation requests during prototype interaction. |
| Fresh preview login | Initial preview origin caused auth rejection. Throwaway Vite auth proxy now forwards canonical localhost:5174 origin; backend policy unchanged. Fresh isolated-context sign-in at preview URL returned 200 and rendered prototype; signed-out session 401 expected. |
| Visual inspection | Inspected desktop/mobile captures. Fixed inherited label margins and dark control backgrounds. Floating comparison bar is deliberately overlaid and stays available while scrolling; form actions remain reachable. |

No unit tests added for throwaway design code, per prototype skill. No backend changes; CRUD verification not applicable. No real supplier checkout or payment integration is verified by this work. Optional requests and contact mapping need implementation after selection. Preview uses a light design surface while retaining the user's existing header theme.

## Screenshots

- [A desktop](plan/a-desktop.png), [A mobile](plan/a-mobile.png), [A two-room review](plan/a-two-room-review.png).
- [B desktop](plan/b-desktop.png), [B guest step](plan/b-desktop-guests.png), [B mobile](plan/b-mobile.png), [B mobile guests](plan/b-mobile-guests.png), [B two-room review](plan/b-two-room-review.png).
- [C desktop](plan/c-desktop.png), [C mobile](plan/c-mobile.png), [C two-room review](plan/c-two-room-review.png).

Selection pending. No prototype design promoted to production.
