---
name: travella-testing
description: Mandatory verification and screenshot evidence for Travella frontend changes, UI plans/designs, and FastAPI backend CRUD changes. Use before implementing and before delivering any such change.
---

# Travella testing requirements

These requirements come from the project owner. Apply the frontend and backend gates together when a change spans both. Documentation-only changes do not require running the application; UI planning/design still requires visual evidence.

## Before making changes

Identify the affected user journey or CRUD operations and the observable acceptance criteria. Discover the current application startup commands, test commands, and URLs from the repository; do not assume ports or invent successful runs. Use the local/test environment and records created for the verification run.

Save evidence under `artifacts/testing/<date>-<task>/`: `plan/` for UI plans/designs, `implementation/` for browser screenshots, and `verification.md` for the checks and outcomes. Use descriptive filenames and keep credentials, tokens, and unrelated personal data out of evidence. Keep these artifacts available for the user's review; link them in the delivery response.

## Frontend: required for every change

1. Use **Chrome DevTools** to inspect and exercise the running application. Prefer the Chrome DevTools MCP tools. Automated end-to-end tests may supplement this required browser check. A build, lint pass, screenshot alone, or component/unit test alone does not satisfy the gate.
2. Always authenticate as the example user `travella.local@example.com` for authenticated journeys. Read the supplied password from `~/.config/travella/test-account.json` (keys `email` and `password`). Keep the password out of tracked files, reports, screenshots, and terminal output. Explicit login/logout tests may inspect signed-out states, then use the same example account to sign in.
3. Capture screenshots of the UI plan/design or mockup before implementation and the actual implementation after exercising it. Preserve available before-state screenshots for existing UI. If no visual plan exists, make a small reviewable sketch or rendered preview of the intended change and capture it. Use Chrome DevTools for browser captures; an external design tool's export/capture can document its source design. For changes to Travella Plans or the Planning Canvas, include the affected plan states in the implementation evidence.
4. Exercise the complete affected user journey end to end where feasible. At minimum, interact with the changed feature in the real browser and verify its observable result. Check relevant error/empty/loading states and responsive layouts when the change affects them. For persisted changes, reload or revisit and confirm the state survived.
5. Inspect Chrome DevTools console messages and network requests for failures related to the change. Diagnose and fix regressions, then rerun the failed path. Visually inspect the saved screenshots for clipping, overlap, unreadable content, and incorrect states.

If Chrome DevTools, credentials, or a running app are unavailable, continue useful independent work and record the exact blocker. Keep browser verification incomplete; do not silently substitute another browser tool or claim the change is fully tested.

## Backend CRUD: required for every change

Exercise every changed create, read, update, and delete operation against FastAPI through its HTTP API. Choose the project's integration tests (for example, pytest with FastAPI TestClient/httpx), direct HTTP requests to the test service, or its interactive API documentation. Use the actual application handlers and a test database to establish persistence behavior; mocks alone do not satisfy this gate.

- Assert response status and relevant payload fields, plus the observable stored result. A successful status alone is insufficient.
- Create: read back the new record and verify its fields and ownership.
- Read: check relevant detail/list behavior and missing-record responses.
- Update: read back the record and verify the changed values and important preserved fields.
- Delete: confirm absence or the documented soft-delete/recovery behavior with subsequent reads.
- Exercise applicable invalid input, unauthenticated access, ownership boundaries, and not-found cases. Use isolated fixtures for additional identities when an ownership check needs them; the browser example user remains the default account.
- Clean up only records created for the test. Run existing relevant regression tests and add or update focused integration coverage for changed CRUD behavior where the project supports it.

For each changed operation, record the executed command/test or sanitized request, expected and actual outcomes, and persistence checks in `verification.md`. When a full CRUD sequence is needed to set up or verify one changed operation, exercise that sequence as well.

## Delivery gate

Deliver verified work only after the applicable checks pass and evidence has been inspected. The final response must briefly state what was exercised, the observed result, and links to the plan/implementation screenshots and verification record. Explicitly identify failed, skipped, or blocked checks and any resulting limitation. If verification remains blocked, describe the work as incomplete or unverified; never represent a proposed test as an executed one.
