---
status: complete
commit: bdec68a
---
# Google place descriptions and saved website enrichment

Replaced the generated Note editor with live Google editorial descriptions. Saved Google identities are matched exactly before fetching details; unavailable descriptions remain absent. Existing pin descriptions stay compatible but are no longer displayed. Opening an older place discovers and autosaves an available website and deduplicated Useful website. Chat and map previews display signed provider editorial text, unchanged and attributed; no generative/review summary fallback.

SamPotei's website now persists in the existing user Plan. Google supplies no editorial summary for SamPotei. Live Sforzesco Castle and Yakusugi Land checks exercised available descriptions. A real Yakushima chat search returned four suggestions; preview did not add pins; explicit Add saved one pin and website/link; reload preserved them. Both isolated test Plans were soft-deleted and canvas reads returned 404.

Validation: 49 focused frontend tests and 20 provider/CRUD tests passed; 13 affected tests rerun after capacity adjustment passed; production build passed. Chrome DevTools authenticated desktop/mobile journeys, screenshots and provider/API network checks passed. Local stack rebuilt; example-account readiness and deployed-source hashes matched.

The user-reported Maps search failure was visible in previous chat history, while map rendering remained healthy. Current Google geocoding, connector, authenticated Agent→MCP and real chat search all succeeded. Earlier failure cause remains unknown; no unsupported permanent-fix claim. Screenshot-tool stalls were recovered by replacing the managed test tab.

Evidence: artifacts/testing/2026-10-24-google-place-details/verification.md (design, before state, desktop/mobile and chat/map screenshots).
