# Travella — Figma Make product context

Use this as product context for Figma Make. It defines the MVP behaviour and the decisions the interface must support. It intentionally does **not** prescribe a final visual design, component library, or layout.

## Product in one sentence

Travella is an authenticated, conversational travel-research and planning product where a traveler works with an agent, evaluates one destination/city, saves deliberate decisions to a map-based planning canvas, and is handed off to an external supplier to book.

## MVP boundary

- A Plan is owned by one authenticated Traveler.
- A Draft Plan may start with no destination. The MVP ends with **one final destination or city per Plan**; multi-destination routes and day-by-day itineraries are not included.
- Every Plan has one linked Conversation and an editable Planning Brief.
- The agent helps research and recommend, but never silently makes a Plan decision.
- A supplier redirect is **not** a Travella booking. Travella never shows a booking confirmation, ticket, payment status, or receipt.

## Core objects and language

- **Traveler:** the signed-in person.
- **Plan / Draft Plan:** the traveler’s saved planning workspace. In the MVP, plans stay drafts until deleted; there is no completed-plan state.
- **Conversation:** the agent interaction connected to one Plan.
- **Planning Brief:** structured, traveler-editable preferences and constraints collected through conversation, such as dates, budget, group, interests, accessibility, and transport tolerance.
- **Planning Canvas:** the map-first space for saved travel choices and places.
- **Map Pin:** a saved item on the canvas. **Custom Map Pin:** a traveler-created place, not a supplier result.
- **Selected Option:** a deliberate saved travel option, such as one stay, return flight, or car rental. The MVP permits one selected stay, flight, and car rental per Plan.
- **Supplier Redirect:** an explicit handoff from a saved eligible option to a verified external provider. It is not a booking result.
- **Provider:** a connected external travel supplier.

## Primary traveler journey

1. The Traveler registers or signs in, then sees only their own Plans.
2. They create a Draft Plan or resume an existing one.
3. In the Conversation, they describe an open-ended idea or name a destination.
4. The agent asks one useful question at a time, researches, and keeps the Planning Brief editable.
5. Once research completes, the agent presents a shortlist of up to five destination candidates with concise fit, caveats, confidence, and lightweight evidence indicators.
6. The Traveler explicitly chooses one destination/city.
7. The Planning Canvas becomes the working space for provider-backed options and places. Map is its default view; a categorized list is an alternate view of the same saved items.
8. The Traveler searches, filters, compares, and explicitly adds selected options or pins to the Plan.
9. From an eligible saved provider-backed option, they can refresh the offer and deliberately continue to that provider’s website in the same browser tab.
10. They can return later, or delete a Draft Plan and restore it for seven days.

## Conversation and research rules

- The agent is a progressive, light grilling session—not a long mandatory form.
- It may start low-risk research before knowing every preference.
- Ask only one preference or decision question at a time. The Traveler can skip, fast-forward, edit the brief, interrupt research, or change direction at any time.
- A new Traveler message immediately supersedes in-progress thinking. Never show an obsolete result afterwards.
- The first candidate shortlist has at most five destinations/cities. Do not reveal partial candidate cards while research is running; show a concise progress state until the complete shortlist is ready.
- Candidates show a simple confidence label: `Strong fit`, `Possible fit`, or `Weak fit`; a brief reason; an honest caveat; and compact source indicators. Weak fits appear only if there are not enough stronger matches.
- The agent must be candid when evidence is stale, conflicting, or thin; it asks how the Traveler wants to proceed rather than pretending certainty.
- Source indicators open a small in-app source panel first. Do not immediately redirect the Traveler away from Travella.
- A confirmed destination hides alternatives from the normal view but keeps them as quiet fallback context if the Traveler later wants to reconsider.

## Traveler authority and plan changes

- The Traveler can manually edit or remove any Planning Brief entry. Their manual change is authoritative over an agent inference.
- No destination, Selected Option, Map Pin, or other durable Plan change happens without explicit Traveler confirmation.
- If changing an already chosen destination would invalidate destination-specific selections or pins, identify what will be cleared and require confirmation before clearing it.
- Full raw research results are temporary. Compact candidate assessments and evidence references may be retained for recovery; unselected raw results should not feel like permanently saved Plan data.

## Planning Canvas and saved choices

- The Planning Canvas is map-first. It must distinguish saved Map Pins from temporary map-search results.
- The Traveler can toggle between Map and List views. The List view categorizes the exact same saved items.
- A selected pin exposes enough detail and clear actions to inspect, save, replace, or remove it as appropriate.
- Custom Map Pins can be created for places the Traveler wants to remember; they cannot initiate a supplier redirect.
- Provider-backed search is available only for modes with a real functional provider connection. Unsupported modes should be hidden, not faked.

## Search and compare behaviour

- The MVP supports return flights, accommodation, car rental with the same pick-up/return location, and places.
- Search results are provisional research, not saved Plan decisions.
- Show one canonical option card from the connected provider for a search mode. Do not imply multi-provider price aggregation in the MVP.
- The Traveler can adjust criteria, filters, and sort, compare options, and ask to see more.
- Before an exact-date result proceeds to the add-to-Plan confirmation, Travella rechecks availability and material terms.
- On a provider error or timeout, retain any last completed results, say the refresh failed, and offer Retry. Do not invent fallback price or availability.

## External supplier handoff rules

- Only an eligible, saved, provider-backed Selected Option can start a Supplier Redirect.
- The Traveler can manually choose **Refresh current offer**. There is no background price or availability refresh.
- Just before departure, Travella rechecks the exact option. If price, availability, or material terms changed, stop and ask the Traveler to explicitly accept the new terms.
- If unavailable, keep the saved option visible and clearly mark it unavailable; do not redirect.
- The final handoff view must show provider name, verified destination domain, current terms, and a plain statement that Travella is not booking or confirming anything.
- Only a separate explicit **Continue to [provider]** action opens the provider in the same browser tab.
- When the Traveler returns, the only handoff status is **Opened provider; booking status unknown**.

## Account and plan lifecycle

- Authentication screens include registration, sign-in, email verification, password recovery, optional authenticator-app two-step verification, and sign-out.
- After a valid sign-in, an authorized private destination can reopen; otherwise open **My plans**.
- My plans supports creating, resuming, deleting, and restoring Draft Plans. Deleted Plans remain recoverable for seven days.
- A normal sign-out ends the current browser session and sends the next sign-in to My plans.

## Important states to cover in a prototype

- Unauthenticated: sign in, registration, neutral password-recovery confirmation, email-verification and two-step challenge.
- My plans: no plans, active draft plans, recently deleted plans with restore.
- New Draft Plan: no destination yet, empty Planning Canvas, Conversation ready for an intent.
- Research: concise progress state; completed candidate shortlist; updating prior shortlist; uncertainty/needs-input state.
- Destination exploration: candidate details, source-panel access, explicit destination confirmation, destination-change impact confirmation.
- Canvas: map view, list view, selected pin/detail, temporary results versus saved pins, empty canvas, custom pin.
- Travel-option search: initial criteria, results, comparison, no results, provider error with Retry, add-to-Plan confirmation.
- Supplier handoff: current offer, changed terms requiring acceptance, unavailable option, final external-handoff confirmation, failed handoff with Retry, returned/unknown booking status.

## Explicit non-goals for this MVP

- In-app checkout, payments, passenger details, tickets, receipts, booking confirmation, cancellation, refunds, or booking-status tracking.
- Multi-city trips, routes, or day-by-day itinerary planning.
- Automatic plan changes, autonomous booking, or automatic addition of recommendations to a plan.
- Social sign-in, profile editing, and booking-email import.
- Fake provider availability or demo data presented as real.

## Product tone

Make the product feel calm, capable, and direct. It should help a Traveler move faster, make uncertainty visible without drama, and preserve their control at every consequential choice.
