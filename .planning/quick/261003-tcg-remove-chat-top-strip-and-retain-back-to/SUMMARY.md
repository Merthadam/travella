---
status: complete
completed: 2026-10-03
---

# Summary: Make Plan chat the primary Plan screen

Opening, creating, or restoring a Plan now opens its full-page chat at `/plans/{id}`. The legacy `/conversation` URL loads the same chat and normalizes to the main Plan URL. The chat header keeps Travella, the current Plan title, Plans, Account, and Sign out. Plans opens a drawer for switching Plans. The standalone workspace components remain in the codebase for future use.

Validation: 24 frontend tests passed, production build passed, the authenticated local Plan route was inspected in Chrome, and the Plans drawer was opened and closed. The DevTools screenshot save was blocked by its configured workspace roots; details are in `artifacts/testing/2026-10-03-chat-top-nav/verification.md`.
