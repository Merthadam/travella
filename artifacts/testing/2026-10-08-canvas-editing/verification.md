# Canvas editing verification

## Scope

Approved C Place explorer, continuous canvas side chat, dedicated LangGraph/Claude Agent SDK editor, authenticated area-bound Google Places MCP, temporary previews, explicit draft additions and existing Save plan persistence.

Design evidence: `../2026-10-08-canvas-activity-chat/plan/C-place-explorer.png` and `C-mobile.png`. Selected design recorded in sketch 004 README.

## Environment

- Checkout: `zircon-poet`, branch `feat/canvas-activity-editing`.
- Local origin: `http://localhost:5174`.
- Browser: Chrome DevTools, authenticated example-account session.
- Isolated verification Plan: `366e2312-e31e-430c-9919-bfadc7e41033` (Canvas editing check).
- Initial context: Salzburg, Austria; two adults; flexible dates; no fixed budget; accommodation needed, flights not needed.
- Existing database volumes and unrelated Plans retained.

## Execution log

- Existing Cognito pool/client precheck passed.
- Created a fresh Plan through the UI and set its research context through the actual authenticated API; readback revision 2 and chosen destination matched.
- Renamed only the verification Plan through the existing confirmation/challenge API; revision 2 returned.
- Captured existing mobile canvas before implementation.
- Python compile check passed for changed agent modules; `git diff --check` passed at the initial integration point.
- No automated tests added or run.

## Observed results

| Check | Result |
| --- | --- |
| Container and auth | Rebuilt the single local stack; sign-in → session → sign-out readiness passed. Database volumes preserved. |
| Source freshness | Changed SDK, service, MCP client, React components and styles matched running container copies; final CSS rebuild repeated after responsive fixes. |
| Private Maps transport | Actual authenticated MCP resolve returned Salzburg bounds; restricted search returned five real gardens/parks. Unauthenticated tool call returned 403. |
| Generation handoff | Both themes and research groups completed. The assistant handoff appeared in the same conversation. Duplicate local banner was removed and confirmed absent on reload. |
| Unsaved context | Added “Quiet gardens and photography” manually. The next editing request included it with source `You`; agent search accepted this unsaved snapshot. |
| Real editor loop | Asked for three gardens without adding. Received three Google Places cards and 53 assistant text deltas. All result coordinates lay inside the returned destination rectangle. No pins were added by discovery. |
| C interaction | Selected rows changed expanded details and real Google photos with author attribution. Ratings and Maps links were displayed from provider data. |
| Preview | Show on map displayed a temporary outlined marker while the pin count stayed zero. |
| Add and deduplicate | Add created one purple activity pin and Added ✓. “Add the first two” then added only the missing second place; total two pins. |
| Explicit area | Search this map area sent the visible map rectangle. Returned result was inside that exact rectangle; existing pins were unchanged. |
| Provenance rejection | Altered a returned suggestion name without changing its ticket. Stream terminated with error, zero state snapshots, and a refresh message. No draft operation applied. |
| Stop | Started another request and pressed Stop. Reply stopped label appeared; two existing pins remained; editing unlocked. |
| Save boundary | Before Save, GET canvas still returned null despite draft additions. Explicit Save returned revision 3 with two activity pins and the manual preference. Reload reopened the saved canvas with both pins and the preference intact; conversation history contained nine messages. |
| Preview label correction | In the final frontend, previewed and added a third real place. Preview label cleared, Added ✓ appeared, and count became three. |
| Mobile | At 390×844, fixed composer positioning and a conflicting grid rule found during inspection. Composer bottom is 844px; history scrolls independently; map card is 358px wide; document width is 390px with no horizontal overflow. Both tabs exercised. |
| Console/network | No browser errors. 25 inspected fetch/XHR requests after final navigation had no failed HTTP/network requests. Existing Lit dev-mode and Google marker-event advisory warnings remain. |
| Static build | Vite production build passed (existing large-chunk advisory). Python compile and whitespace checks passed. No automated tests added or run. |
| Final rebuild | Rebuilt again after mobile CSS fixes. Auth readiness and source hashes passed. Reloaded at 390×844 with no inline style overrides: composer bottom 844px, scrollable history, three saved pins. |
| Cleanup | Soft-deleted only this run's verification Plan through its confirmation/challenge API. Active read returned 404; deleted-view read returned lifecycle `deleted`. Other Plans and account preferences were preserved. |

## Evidence

- `implementation/before-mobile.jpg` — prior canvas.
- `implementation/desktop-place-explorer.jpg` — actual C cards, photo, attribution and composer.
- `implementation/mobile-place-explorer.jpg` — mobile list/detail with fixed composer.
- `implementation/mobile-map.jpg` — full-width mobile map and three activity pins.

Screenshots were inspected. Evidence focuses on the changed cards/map and excludes unrelated saved traveler needs. Chrome's screenshot file-path permission failed; screenshots were obtained through Chrome DevTools image output and saved to the evidence directory instead.

## Limits and environment note

- Current shared AWS secret refresh was rejected by the existing local launcher with `Secret must be a JSON object containing only supported setting names.` Rebuilds therefore used the explicitly supported `TRAVELLA_SECRETS_MODE=local` path with existing credentials. Live auth, SDK and Maps calls worked. No shared secret was altered.
- Actual local MCP transport was exercised. Deployed AgentCore Gateway transport was not deployed or exercised in this task.
- Conversation text and saved pins resume. Suggestion cards/photos remain ephemeral and can be refreshed by asking again; this phase does not persist provider search results.
- A provider outage, a network loss midway through text, a full 50-pin draft and one-hour ticket expiry were not forced. Tamper rejection, Stop, successful streaming and persistence were exercised.
