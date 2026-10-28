# Combined Trip essentials prototypes

Question: Which single component best combines practical preparation, occasional open decisions, editable trip preferences and contextual resources?

Three structurally distinct variants on the existing authenticated /plans/:id route, gated in development by ?prototype=trip-essentials&variant=A|B|C. Keep the real map, flight/stay cards, header and data reads. Replace only themes/findings/links and their generation controls. Simulate all new interactions in memory; no model calls or durable mutations. Sample advice is explicitly illustrative, not verified destination guidance.

A: compact overview with advice rows and an open-decision panel. B: topic-based field guide with a reading pane. C: preparation checklist grouped by journey stage. Every variant combines preferences, useful advice, linked evidence/resources and a decision. Shared floating switcher, URL navigation and keyboard arrows; ignore editable fields. Inspectable prototype state plus ready/generating/empty sample controls.

Use the existing local prototype Vite config pattern, a dedicated free port, and example-account auth. Browser exercise all variants, choice/preference/source actions, URL reload, keyboard/input safeguards, mobile and appearance, and empty/generating states. Build (no prototype unit tests), inspect console/network and save/view screenshots under artifacts/testing/2026-10-26-trip-essentials/plan. Capture on prototype/trip-essentials-20261026; await user design selection before implementation. Dedicated future Claude research subagent is a candidate architecture decision, not implemented or benchmarked here.
