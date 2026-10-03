# Plan chat as the primary Plan screen

## Acceptance criteria

- Opening, creating, or restoring a Plan takes the traveler directly to its chat.
- The chat lives at `/plans/{id}`; the old `/plans/{id}/conversation` route remains compatible.
- Chat header anchors Travella at the far left, groups a Plans chevron beside it, and shows a compact current-Plan selector at the right before Account and Sign out.
- The Plans drawer stays closed on entry and opens on demand to choose a Plan.
- Plan workspace components remain available in source for later use.

## Checks performed

- `npm --prefix frontend test -- --run` — passed, 4 files and 24 tests.
- `npm --prefix frontend run build` — passed.
- `git diff --check` — passed.
- Rebuilt the local app using `docker-compose -p travella-local-single -f compose.local-single.yaml up -d --build app` — completed.
- In Chrome, opened `http://localhost:5174/plans/ccca3184-cf0b-42cd-bcfb-1df7f0a41726`. The saved conversation rendered directly at the main Plan URL, and the header showed Travella, the Plan title, Plans, Account, and Sign out with no Back to Plan control.
- Opened the Plans switcher. The drawer loaded the Plans list, including the current Plan, and closed again when the switcher was selected.
- Opened the drawer from the right-side current-Plan selector as well as the left-side Plans chevron.
- Added an automated flow with two Plans that selects another Plan from the drawer and confirms its chat and main Plan URL load.
- Chrome DevTools inspected the live page and confirmed Plan, destinations, conversation history, brief, and drawer list requests returned HTTP 200. After the container recreation, an initial `/auth/session` request returned 500; the local chat still loaded in the browser. This session-refresh issue is unrelated to the header changes.
- Visually inspected the current browser viewport (~735 px wide). The header and chat controls fit without overlap.

## Evidence limitation

The screenshot was inspected in-session through the browser UI, but saving it into the required artifact directory failed. Chrome DevTools returned: “Access denied: path … is not within any of the configured workspace roots.” The attempt targeted `artifacts/testing/2026-10-03-chat-top-nav/implementation/chat-top-nav.png`. No saved implementation screenshot is available. Existing earlier design evidence is at `artifacts/testing/2026-10-03-country-researcher/plan/variant-a-clean-chat.png`.
