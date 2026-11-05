# Local chat credential recovery — 4 November 2026

Original failure: the provider rejected the configured key with HTTP 401 authentication_error, and the two chat attempts ended as Interrupted. The user reported the key had expired and asked to retry after updating it.

Refreshed shared settings using the existing local_secrets.py pull command. The provider models endpoint now returns 200 and includes the configured model. Cognito precheck passed. Rebuilt only the travella-checkout-map Compose project with the existing volumes, ports 5200/8020/8120, and matching browser origin. start-local-ready.sh passed health and example-account sign-in/session/sign-out checks. Source hashes for ConfirmationMapActions.jsx, bookingLocations.js and the agent runtime match the checkout.

Actual isolated Chrome DevTools verification used the authenticated example account and a new test Plan. Submitted a two-adult Les Deux Alpes ski trip request with dates, apartment preference, Budapest departure and flexible budget. The real model streamed a reply, completed without Interrupted, and the trip brief reached 5 of 6 details. After page reload, one assistant reply remained with text, no interruption status and no pending reply. Same-origin API and stream requests returned 200. Console showed only the existing Lit development warning, with no application errors.

[Completed reply screenshot](implementation/completed-ski-trip-reply.png) captured and visually inspected: readable response and composer, no overlap. No frontend or backend application code changed, so automated suites were not rerun. No booking or payment was performed. Only the temporary verification Plan was deleted; the user's original Plan and conversation were preserved.
