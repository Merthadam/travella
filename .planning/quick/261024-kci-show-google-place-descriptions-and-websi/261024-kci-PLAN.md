---
status: complete
---
# Google place details for existing and new places

User requests missing website on their existing saved SamPotei pin and actual Google description instead of the AI-generated Note. Direct implementation preference already accepted; GSD quick executed inline.

1. Replace saved place Note/editor with live exact-identity Google details. Query provider only on opening a saved place. Resolve its Google ID by matching the existing SHA-256 identifier, fetch optional websiteURI and editorialSummary, show verbatim description with attribution, and never substitute AI output. Retain old persisted description for compatibility but stop displaying/copying generated reasons. Display a safe existing website immediately when available; retry transient detail errors.
2. User-authorized enrichment of old pins: when opening one, save its discovered website and deduplicated Useful website through existing CRUD autosave. Defer while busy; do not resurrect removed places or overwrite existing URLs. Keep editorial summaries transient. Extend signed suggestion projection with optional Google editorial summary and render it instead of the model's Why it fits text in chat/map previews.
3. Provider/contract/frontend tests, actual API-backed persistence checks, build, authenticated Chrome DevTools existing-place and test-plan journeys, desktop/mobile evidence. Preserve user data and clean up only test-created records. Record limitations, update STATE, commit.

Acceptance: existing SamPotei shows the website when supplied by Google; no Note/Edit note or model-generated description appears; missing editorial summaries are omitted; unmatched identities never show a different business's data; new suggestions use exact provider summaries; URLs persist and dedupe safely.

Additional user report: Google Maps is not working. Initial map rendering was healthy; later browser chat evidence identified failed place discovery. Verify Google geocoding, connector search, authenticated Agent→MCP transport and actual chat search in an isolated Plan. Do not attribute the failure to a specific cause without evidence.
