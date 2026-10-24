# Single-canvas layout prototypes

Question: which information hierarchy makes a generated Plan easiest to explore and refine without returning to raw research?

Accepted: one canvas, no Research/Canvas stepper or back-to-conversation link; research continues in contextual chat. Destination changes/rebuilds remain deliberate production actions. Three alternatives requested; no production selection yet.

1. Add development-only rendering to the existing authenticated /plans host, using its real header/auth and read-only data loading. Three structurally distinct layouts share a fictional Lisbon fixture: A map-led floating controls; B places-led editorial list and compact map; C balanced list/map/chat split. All edits, chat and Save actions are in-memory simulations. Use existing design tokens.
2. Run separate Vite prototype server; authenticate example account once; exercise each variant, place details, chat proposal, explicit add/save, supporting details, URL/keyboard switcher and responsive behavior through Chrome DevTools. Save/inspect screenshots and console/network evidence.
3. Commit on throwaway branch, record verification and pending user choice. Do not implement a production design or mutate durable Plans.

Acceptance: one canvas throughout; compact trip summary; map and places visible early; no duplicated save guidance; details expand in place; sample map/data clearly labelled; arrows preserve variant URL and ignore editable fields. State visible in preview controls. Preview survives variant navigation, resets on reload by design. Production build succeeds.
