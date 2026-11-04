# Hotel location prototype verification — 2026-11-04

Outcome: three interactive design prototypes verified. Production hotel filtering, real agent tools/reasoning integration, provider radius requests and durable Plan requirements are NOT implemented by this task. Design selection is pending.

## Environment and reproduction

- Started through GSD quick task `261104-q8m`; reviewed mandatory Travella testing and prototype UI skills.
- Existing local backend at `http://localhost:5174` returned health HTTP 200. No shared stack rebuild, provider call or Plan mutation was needed.
- Run `npm run prototype:stay-location --prefix frontend` (port 5201). The dedicated development config forwards to the existing local backend and maps only this exact preview Origin to the backend's configured local Origin. Authentication remains required.
- Existing authenticated Plan shell: `/plans/81a99feb-80d7-4514-9326-b0a7ddc5643e?prototype=stay-location&variant=A` (B/C also supported). This is an existing example-account verification Plan; prototype Budapest fixtures are explicitly labeled and do not use or overwrite its itinerary.
- Authenticated as the supplied example account from the ignored account file. Password was never printed or written to artifacts. Fresh isolated sign-in directly on port 5201 verified after adding the preview config. The initial signed-out /auth/session 401 was expected; sign-in and subsequent session/profile/Plan requests returned 200.
- Default Chrome DevTools MCP profile was occupied. Launched the installed Chrome DevTools MCP in `--isolated` mode with a separate local MCP client; existing browser was preserved. All inspection, interaction and screenshot capture used Chrome DevTools tools.
- MCP capture returned image blocks; decoded original PNG bytes into this evidence directory without image editing.

## Executed browser checks

All final checks passed. Interaction harness used Chrome DevTools `take_snapshot`, `click`, `fill`, `fill_form`, `evaluate_script`, `emulate`, `press_key`, `wait_for`, `take_screenshot`, console and network tools.

| Journey | Observed result |
| --- | --- |
| A: deselect Museums category | Only museum IDs removed; Food & drink remains selected. |
| A: add Parliament individually and apply | Arbitrary category/individual combination appears in applied state and results. |
| A: assistant suggests city center | No applied change until Apply this search; then controls and applied criteria match. |
| A: choose Gellért Baths landmark | Landmark-specific anchor applied. |
| A: neighborhood | Named Trinity Square anchor and radius explanation shown. |
| A: museums + baths within 1 km each | Zero matching fixture hotels; no silent widening. |
| A: explicit flexible recovery | Four located fixture hotels return. |
| A: clear all places | Search disabled until a located place is selected. |
| A: unknown cruise meeting point under hard radius | Search disabled; exact missing-location explanation shown. |
| A: unknown cruise with flexible ranking | Selection retained; omitted from distance calculation with warning. |
| B: select activity from map | Checkbox selection and search criteria synchronize. |
| B: hotel pin | Corresponding result highlighted. |
| B: click empty map | Custom coordinate anchor selected and applied. |
| B → A with map-point criteria | Selected map-point mode remains valid and visible across layouts. |
| C: select Wellness, individually remove Café | Per-place table changes to the exact selected IDs. |
| C: assistant museums + food suggestion | Applying restores four selected anchors and updates table. |
| 390 × 844 responsive A/B/C | No page or main horizontal overflow; controls remain usable. |
| Mobile C table | Horizontal scroll is contained in table wrapper; selection/search updates comparison. |
| Variant arrows and URL | Keyboard left/right cycles layout; arrows in text input do not. |
| Reload | Variant retained in URL; simulated criteria reset in memory as documented. |
| Unknown hotel coordinates | Never ranked as a confirmed distance match; separated and labeled. |
| Final console | No application errors; existing Lit development-mode warning only. |
| Final network | Auth session, traveler profile and Plan GETs 200. Prototype controls generated no provider/agent/Plan write requests. |

Development defects encountered and resolved: the initial Canvas injection conflicted with its scroll observer, so the preview now replaces only the authenticated Plan rendering subtree; inherited label margins caused excessive spacing and were scoped away; mobile C grid allowed table overflow and now uses min-width:0; mobile switcher buttons now retain explicit accessible names; map-point selection remains available when switching layouts. Browser session expiry interrupted an early pass; example sign-in restored it, and final fresh preview-origin sign-in passed. Final checks supersede interrupted passes.

## Build and inspection

- `npm ci --prefix frontend --no-audit --no-fund`: completed.
- `npm run build --prefix frontend`: passed. Existing large-chunk advisory remains.
- Production bundle inspection: prototype title, switcher and lazy module absent from `frontend/dist`; development-only entry is eliminated.
- `git diff --check`: passed.
- No unit test suite added for throwaway UI, per prototype skill. No backend CRUD changed, so CRUD integration gate is not applicable. Live provider/agent verification is deferred to the selected production implementation.
- Desktop screenshots captured at 1440 × 1450 (empty state at 1440 × 1100), mobile at 390 × 844. Inspected desktop variants, mobile variants, dark mode and empty state for readability, overlap, clipping and correct state. Floating bottom variant selector is intentional.

## Evidence

- [A: familiar filters](plan/a-familiar-filters-desktop.png)
- [B: map first](plan/b-map-first-desktop.png)
- [C: place comparison](plan/c-place-comparison-desktop.png)
- [A mobile](plan/a-mobile.png), [B mobile](plan/b-mobile.png), [C mobile](plan/c-mobile.png)
- [No matches](plan/a-no-matches.png), [Dark mode](plan/a-dark.png)

## Review handoff

A uses a familiar filter sidebar, B gives map selection priority, C makes per-place tradeoffs explicit in a table. All include the same simulated assistant/manual preferences. Recommend A as the default with C's comparison available when useful; this recommendation is not a user selection.

Followups: selected layout or combination; whether categories automatically include future additions; whether some selected places need higher priority or individual hard limits. Production implementation remains pending that design discussion.
