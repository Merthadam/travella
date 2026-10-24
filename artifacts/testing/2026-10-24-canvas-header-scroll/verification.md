# Canvas header and stage scrolling verification

Date: 2026-10-24. Source: 9ca98a1. Prototype only; production design selection pending.

User clarified that both progress bar and trip title/details must scroll away. Research is complete and Canvas is current, with no research navigation. All three variants implement this in the same scroll region.

## Executed checks

- Authenticated Chrome DevTools inspection of http://localhost:5188/plans?prototype=single-canvas&variant=C using the required example account; switched through A, B and C.
- Desktop 1440×1000: for every variant, scrolling the board 400 px moved progress top from 100 to -300 and trip header top from 157 to -243. Canvas has aria-current=step. No horizontal overflow.
- Mobile 390×844: for every variant, document scroll of 500 px moved progress top from 112 to -388 and header top from 159 to -341. No horizontal overflow. Neither element is sticky.
- Trip details opened with current sample values and closed. Explore flights opened the fictional return-flight panel and closed after scrolling. Existing cards remain present.
- Screenshots below captured with Chrome DevTools and visually inspected: correct top-to-bottom ordering, readable controls, both header and progress absent after scrolling, no unexpected overlaps.
- Console: no errors; existing Lit development-mode warning only. Network: session, profile and plans reads all HTTP 200. No durable mutation requests.
- `npm run build --prefix frontend`: passed. Existing bundle-size advisory remains. `git diff --check`: passed.
- No new unit tests: throwaway layout prototype; browser interaction directly verifies this change. No backend changes or CRUD verification required. In-memory edits and schematic map remain explicitly labeled.

## Evidence

Previous content-complete design: ../2026-10-24-full-canvas/verification.md.

- [A at top](plan/a-header-top.jpg)
- [B at top](plan/b-header-top.jpg)
- [C at top](plan/c-header-top.jpg)
- [C scrolled](plan/c-header-scrolled.jpg)
- [Mobile at top](plan/c-mobile-top.jpg)
- [Mobile scrolled](plan/c-mobile-scrolled.jpg)
