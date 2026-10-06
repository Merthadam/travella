# Standalone planning component catalog v1

## Boundary
Inputs: validated fixture data delivered through A2UI v0.9 messages. Outputs: typed local UI actions recorded in a preview event log. No fetches, persistence, agent calls or production state. The components must not import app authentication, useTripContext, backend API clients or provider SDKs. Network Maps loading belongs in a future injected adapter.

Catalog id: `urn:travella:catalog:planning-components:v1`. Preview surface: `planning-components-preview`. Installed packages remain @a2ui/react and @a2ui/web_core 0.12.0 with v0_9 imports. Use a local Catalog/MessageProcessor and A2uiSurface, matching the existing Trip Brief pattern. No remote catalogs or arbitrary HTML/CSS from messages.

## Component schemas
Common metadata: stable `id`, `status: empty|loading|ready|error`, optional plain-text error (<=240 chars), optional source label (`you|conversation|memory|research`) and updatedAt. Catalog props bind only to `/components/<id>` in the preview data model. Reject unknown types/fields/bindings and duplicate ids. Seven singleton instances in composed preview; individual gallery cases may use separate surfaces.

| Type | Data contract | Local action contract |
|---|---|---|
| TripEssentials | dates `{start?,end?,note?,flexible}`; travelers integer1–50 or null; budget `{label?,noFixedBudget}` | `edit_essentials` with typed changed fields |
| DestinationMap | places max20 `{id,name,placeId?,position?:{lat,lng},role:candidate|final}`; finalPlaceId optional; pins max50 `{id,name,category:stay|airport|food|activity|other,position,description?}` | `inspect_place`, `choose_destination`, `add_pin`, `edit_pin`, `remove_pin`, `filter_pins` with typed local payloads |
| TripThemes | items max20 `{id,kind:theme|pace|priority|must_do|avoid,text<=160,source?}` | `edit_theme`, `add_theme`, `remove_theme` |
| FlightsEntry | need `undecided|needed|not-needed`; origin/destination labels; dates summary; travelers label; availability `preview|unavailable|ready`; optional selectedSummary | `open_flights` |
| AccommodationEntry | need; destination label; dates/travelers summary; same availability; optional selectedSummary | `open_accommodation` |
| ResearchFindings | items max30 `{id,title<=120,summary<=600,sources<=5,status:supported|uncertain|conflicting|unavailable,researchedAt?}` | `expand_finding`, `remove_finding`, `open_source` |
| ImportantLinks | items max20 `{id,title<=120,url<=2048,purpose<=240,category:official|transport|attraction|practical|other,sourceLabel?}` | `open_link`, `add_link`, `edit_link`, `remove_link` |

Sources are `{title,url}` display metadata in this phase; fixtures visibly identify sample evidence. No fixture is claimed freshly researched. Schema validation covers ISO date ordering, mutually exclusive flexible/exact dates and noFixedBudget/label, numeric coordinate ranges, unique ids, max one final destination, matching final reference and bounded payload <=64KiB. Null/empty values render `Not set`, not invented defaults.

## A2UI rendering and future generation
The locally registered `PlanningCanvas` layout root references children by stable ids. It accepts only the seven component types and a fixed slot policy. Fixtures exercise createSurface, updateComponents and updateDataModel through the real MessageProcessor. A mock generator emits valid fixture message sequences; it is explicitly labeled Simulate generation. It performs no inference.

The agent can later target these component types/props. Runtime authorization, state ownership, schema conversion from backend domain objects, evidence validation and AG-UI transport are deferred. An A2UI action here is just a callback/event, not a successful server write.

Fixed order: essentials full-width; destination map plus themes; flights plus accommodation; findings plus links. Missing components collapse gaps. Each component is independently renderable and does not require all other cards.

## Interaction model
Local edits use Save/Cancel, updating only preview state; Reset restores all fixtures. Hide removes only the component from the composition; Restore brings it back. Event log shows safe action name/component id/fixture payload for design inspection. No browser localStorage, user memory or database writes. Stable ids preserve focus through updates.

Flights and Accommodation open separate local preview shells with Back to canvas; show known fixture inputs and a clear sample/unavailable message. No provider search engine, checkout, full offer galleries or real bookings. The preview route state is local to the gallery; production routes are unchanged.

DestinationMap accepts an injectable map adapter interface `{places, selectedId, onSelect}`. Default fixture adapter renders a clearly labeled schematic map plus accessible place list; it must not impersonate actual Google tiles/attribution. Design the dimensions, markers, selection and failure states for a future Google Maps adapter. Real coordinates/keys/provider lookup are not required for this phase. Choosing a fixture destination changes only local sample data.

## Safety/accessibility
Render text through React, no raw HTML. Link props accept public HTTPS URLs without credentials; reject javascript/data/file URLs, private literal hosts and malformed values. Preview “open” records the action or opens a clearly labeled sample link only after a click; never auto-navigate or fetch previews. New external tabs use noopener/noreferrer. Production server validation will be a separate integration responsibility.

Each type handles empty/loading/ready/error, long text and missing optional fields. Card-level failure does not clear sibling components. Keyboard focus, >=44px targets, accessible labels, non-color status indicators, reduced motion and responsive layouts are mandatory design requirements.

## Map pin design
Pins are independent of the single final destination: a hotel, airport and attraction can coexist without changing destination selection. Category determines a consistent color+icon: stays blue #356AC3, airports violet #7656B5, food terracotta #B75539, activities green #28785E, other slate #5C697A. Treat this palette as a design proposal. Use visible labels/tooltips, icons and a category legend so color is not the sole cue.

The local preview supports Add place (choose a fixture place and category), select pin to reveal a compact detail card, change category, remove pin and toggle category visibility. Keep the selected pin and accessible list in sync. Fixtures cover zero/one/many pins, overlapping positions, long labels, no pins after filtering and a selected pin being removed. Category filters are local UI state, not a generated Plan decision. No geocoding or external place search.

The future Google adapter can use AdvancedMarkerElement/PinElement for category colors, border, glyph and selected emphasis. Agent generation later adds typed pin data, not styles or executable marker content. Map IDs/keys and actual Maps integration remain outside this phase.
