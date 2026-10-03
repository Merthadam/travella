---
status: complete
completed: 2026-10-03
---

# Summary: Make Plan chat the primary Plan screen

Opening, creating, or restoring a Plan now opens its full-page chat at `/plans/{id}`. The legacy `/conversation` URL loads the same chat and normalizes to the main Plan URL. The chat header anchors Travella at the far left, groups a Plans chevron beside it, and shows a compact current-Plan selector at the right before Account and Sign out. Both controls open the Plans drawer. The standalone workspace components remain in the codebase for future use.

Validation: 24 frontend tests passed, production build passed, the local Plan chat was inspected in Chrome, and both header controls opened the Plans drawer. The DevTools screenshot save was blocked by its configured workspace roots; details are in `artifacts/testing/2026-10-03-chat-top-nav/verification.md`.
