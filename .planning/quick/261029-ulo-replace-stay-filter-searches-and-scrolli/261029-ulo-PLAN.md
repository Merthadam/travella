---
mode: quick
status: complete
---

# Wrapping stay filter chips

User requested no textboxes or internally scrolling lists. Use wrapping toggle chips for property types and amenities. Clicking a chip selects/deselects it; selected chips have a check mark and pressed state. Show the first twelve choices plus all selected options, with Show all / Show fewer for long catalogs. Expansion grows the page rather than adding a scrolling box. Preserve ten-per-category limits, recovery and API criteria.

1. Replace search and checkbox list controls with accessible toggle chips and expandable wrapping groups. Update focused behavior and integration tests.
2. Build, rebuild locally and exercise the authenticated real form on desktop/mobile, including expansion, toggling and reload. Capture and inspect screenshots, check requests/console, and clean up the isolated fixture.
