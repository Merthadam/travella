---
status: complete
---
# Map location chooser removed

Source: 6dd02e1. Removed candidate chooser and retained automatic local map framing. Saved destination, pin behavior and place cards are unchanged.

28 focused tests, build, authenticated Chrome reload/filter/Show all places checks, unchanged saved snapshot and desktop/mobile visual checks passed. Existing build/Google development warnings only.

Evidence: artifacts/testing/2026-10-24-map-location-chooser/verification.md. Local stack rebuilt at http://localhost:5174 with matching source hash. No push/merge. Card redesign deferred by user.
