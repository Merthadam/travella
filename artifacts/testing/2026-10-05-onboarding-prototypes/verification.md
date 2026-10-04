# Onboarding prototype inspection — 2026-10-05

## Scope
Three throwaway, non-agentic, four-step onboarding directions. Dedicated branch `prototype/onboarding-directions`; production implementation awaits user selection.

Run: `npm --prefix frontend run prototype:onboarding`
Preview: `http://127.0.0.1:5175/?preview=onboarding&variant=A` (also B/C).
DEV-only entry bypasses AccountApp to avoid invoking current agentic onboarding or account APIs. No authentication, persistence, paid services, or real Maps requests. Cities, airport distances, and countries are limited sample data.

## Executed checks
- Vite started successfully at port 5175; Chrome DevTools opened and rendered the preview.
- A: required home gate disabled Continue when empty; selected Brno and VIE; advanced and added Czechia + Slovakia passport cards. Captured and visually inspected A.
- B: selected Prague + PRG; live profile reflected choices; selected Czech citizenship; entered sample accessibility and dietary text. Captured and visually inspected B.
- B→C switching preserved home, airport, citizenship and both needs text fields. C interests initially disabled completion with zero selections.
- Added custom interest Train journeys; selected four presets; count reached five and completion enabled. Completion displayed all five interests, retained home/airport/citizenship/needs, and progress reached 4/4.
- Independent C path: required city only; omitted airport; skipped citizenship, needs and zero-interest screen; reached completion successfully.
- Start over reset the flow and required-home gate. In-page variant buttons retained current state during comparison.
- Chrome desktop and narrow layouts inspected. Resize request 390×844 was constrained by browser window minimum to an actual 500×782 viewport. All three variants showed no horizontal document overflow at 500px. True 390px viewport remains unverified.
- Saved and visually inspected screenshots: A-soft-landing.jpg, B-travel-studio.jpg, C-departure-board.jpg, C-narrow-layout.jpg. Content is readable, with no clipping. Floating design switcher overlays the viewport intentionally; bottom padding allows content to scroll clear of it.
- DevTools direct screenshot file writes were rejected by configured workspace roots. Inline Chrome screenshot capture succeeded; the returned image bytes were saved locally as evidence.
- DevTools click waited for stability on continuously floating interest bubbles and timed out. Direct DOM clicks through DevTools exercised those controls successfully; no application error was observed.
- Console: no application errors; existing Lit development-mode warning only. Network: no fetch/XHR requests from preview flow.
- `npm --prefix frontend run build`: passed twice; existing >500kB application chunk warning. DEV-only prototype excluded from production bundle.
- `git diff --check`: passed. No automated tests added or run.

## Boundaries
Browser verification complete for prototype interactions above. Narrower mobile widths, production integration, actual Maps data, persistence, accessibility audit and authenticated onboarding are outside this prototype verification.

## Design evidence
- [A — Soft landing](plan/A-soft-landing.jpg)
- [B — Travel studio](plan/B-travel-studio.jpg)
- [C — Departure board](plan/C-departure-board.jpg)
- [C — Narrow layout](plan/C-narrow-layout.jpg)
