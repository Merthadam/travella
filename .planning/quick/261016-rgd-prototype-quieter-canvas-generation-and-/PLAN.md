---
status: complete
---

# Quiet canvas navigation prototypes

Question: how should travelers move between Research and Canvas and prepare a canvas without a prominent generation button?

User rejected the previous broad canvas layouts. Preserve the existing conversation and actual A2UI Trip Brief. Build three narrow alternatives on the authenticated Plans page, on a throwaway branch, using memory-only sample data.

1. Add simple tabs with a quiet toolbar link (A), a view selector and conversational invitation (B), and tabs with preparation inside the empty Canvas view (C). Keep explicit flight review and confirmation. Add a URL-backed switcher, reset and state inspection.
2. Exercise all three through Chrome DevTools as the example account. Capture desktop/mobile, baseline, review, empty/loading/error/result states. Verify no prototype mutations reach the API, inspect screenshots and console/network, build and run affected existing component tests.
3. Capture prototype/evidence on `prototype/plan-navigation-20261016`, update GSD state and present the three working links. Await a design choice before production implementation. Broader stability work remains outstanding; no bug-free claim.
