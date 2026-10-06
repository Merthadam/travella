---
phase: "14"
slug: dynamic-planning-canvas-components
status: proposed
shadcn_initialized: false
preset: none
created: "2026-10-06"
---
# Phase 14 — UI design contract

## Design system
Tool/library: existing React/CSS and custom A2UI catalog; no new design-system dependency. Use existing app typography with system sans fallback. Use simple inline SVG icons with visible text, not a new icon package. References: accepted compact container pattern and the planning sketch below. This is a proposed combined layout, not a claimed user selection of prototype A/B/C.

## Composition
Fixed responsive dashboard, maximum width 1200px. The standalone preview includes a representative header only. Do not alter the production header, chat, sidebar or Plan navigation. Gallery controls switch component/state fixtures and the composed preview.
1. TripEssentials strip spans the width.
2. DestinationMap takes 8/12 columns; TripThemes takes 4/12.
3. Compact FlightsEntry and AccommodationEntry share a row equally.
4. ResearchFindings takes 8/12; ImportantLinks takes 4/12.
Only generated/eligible components occupy slots; no empty grid holes. Below 900px all sections stack in the same reading order. At 390px, padding16 and no horizontal scroll. Cards can grow with content; no fixed-height text clipping.

## Component behavior
Map preview uses labeled schematic fixture markers, a distinct final marker, text fallback and accessible candidate list. Marker tap emits a local inspect action. Final selection changes only sample data. A future Google adapter must preserve real attribution; this preview must not imitate Google tiles or imply live lookup.
Essentials shows unknown values as `Not set`, flexible dates and no fixed budget as resolved. Themes are plain chips/groups with provenance on inspect, never a second copy of essentials. Editing uses labeled controls and a visible Save/Cancel; save changes local preview state only.
Flight/stay cards show need status and known trip inputs, `Explore flights` / `Explore accommodation`, plus honest service status. Preview data is visibly labeled. Local browsing shells retain Back to canvas and state that provider search is not connected.
Findings show a short title, 1–3 line summary, source/date and uncertainty where applicable; expand for more. Links show title, domain and a one-sentence purpose; external click opens a new tab. No rich previews or auto-fetch.
A small component menu allows Hide/Restore; hiding does not delete underlying facts. Explicit item removal is separate and changes only local fixture state. Simulated updates preserve the current preview selection; Reset restores fixtures.

## Spacing, type, color
Spacing scale4/8/16/24/32/48px. Desktop page padding32; card padding24; grid gaps24. Mobile padding16/gap16. Card radius16; borders1px (intentional non-spacing exception).
Body16/1.5, label13/1.4, card heading20/1.3, page title32/1.2. Body400, labels500, headings600. No tiny metadata below12px.
Canvas #f7f8f2; cards #ffffff; ink #213e35; muted #53665b; border #dce3d9; green #284f40; soft green #edf2e7. Green highlights selected/final states and primary actions. Error #9a3434 with explicit words/icons. Verify actual contrast on rendered controls; don't rely on color alone.

## Motion and accessibility
160–220ms opacity/short translate on component appearance, subtle updated highlight; no continuous pulse, card jumping or extra progress bar. Honor prefers-reduced-motion. Keep keyboard focus through updates, named regions/headings, >=44px targets, visible focus rings, one polite announcement per simulated update, no token-by-token screen-reader announcements from canvas. A simulated busy state demonstrates disabled editing while keeping reading/navigation available.

## Copywriting
| State | Copy |
|---|---|
| Empty canvas | Your trip starts here. Useful details will appear as you plan. |
| Unknown field | Not set |
| Agent busy | Updating your trip… |
| Failed canvas update | This component couldn’t update. Try again. |
| Stale edit | This preview changed. Reset it to try again. |
| Map failure | The map couldn’t load. Your destination details are still available. |
| Provider not implemented | Search is not available yet. |
| Draft evidence | Research finding |
| User link | Added by you · not verified |

## UI considerations
| Case | Required behavior | Verification |
|---|---|---|
| Zero/one/many components | No grid gaps, duplicate singleton or unintended blank shell | Browser fixture/manual |
| Long text/URLs | Wrap; expand findings; no overflow | 390px screenshot |
| Partial missing values | `Not set`, no invented defaults | Browser fixture inspection |
| Loading/reconnect | Retain last valid fixture content; disable only mutations | Simulated interruption |
| Bad type/path/event | Reject update; previous valid fixture cards stay visible | Invalid fixture/manual |
| Unsupported provider | No sample inventory or functioning-search claim | Browse both shells |
| Reduced motion/keyboard | No motion and stable focus; list fallback for map | Browser |
| Light/dark app setting | Components inherit existing theme tokens; include a dark fixture if the current theme supports it | Browser |

## Evidence and review
Planning sketch: artifacts/testing/2026-10-06-dynamic-canvas-plan/plan/canvas-layout.html; desktop/mobile captures alongside it. Map in sketch is explicitly schematic, not Google Maps or real geodata. Existing card evidence remains in 2026-10-05-planning-cards.
Inline review: copy, visual hierarchy, spacing, typography, local registry and state coverage specified. No third-party registry blocks. Final visual acceptance remains the user’s review during execution; don't label this user-approved.

## Scope override
All screenshots and interactions are standalone fixtures. No live agent, provider or persistence connection is part of this phase. Design error/loading/busy states with the gallery controls, not real network runs.

## Visual refinement and map pins (latest user feedback)
Keep the accepted composition but avoid a uniform stack of equally weighted white boxes. Use a deep forest trip header with an editorial serif title (system Georgia fallback; no remote font needed), stronger essentials values, softer warm-paper canvas and restrained category accents. Map is the visual anchor. Flight/stay containers remain compact, with a clear icon, route/base summary and directional CTA. Themes use selective colored chips instead of a wall of identical pills. Research sections have quieter separators and stronger source hierarchy.

Map pins use the five category colors/icons defined in COMPONENT-CONTRACT. A compact wrapping legend toggles categories. Add place opens a local fixture picker with category; selecting a pin shows title/category/short note and edit/remove. Selected marker uses outline/scale as well as color. Preserve accessible list navigation and >=44px interactive targets. For overlapping points, show an accessible stacked count/list in the fixture design; clustering integration can be added with the real map adapter later.

Include no-pins, filtered-empty, many-pins and selected-detail designs. This is sample interaction design, not live Maps functionality.
