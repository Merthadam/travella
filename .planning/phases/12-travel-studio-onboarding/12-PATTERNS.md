# Reuse map

- Onboarding routing: AccountApp.routeAfterSignIn + FirstLoginOnboarding initialProfile/onComplete props. Preserve managed authentication and onExpired behavior.
- UI structure: frontend/src/features/plans/ decomposition is the model for features/onboarding/. Use existing Tailwind theme; do not append a second global stylesheet or grow AccountApp with step markup.
- API client: frontend/src/api.js request wrapper -> auth proxy -> services/auth/crud_client.py allowlist -> CRUD router. Every new method/path must pass all four boundaries.
- Durable writes: TravelerProfileRepository currently whole-payload save. Add atomic step merge/revision/idempotency rather than using blind replacement for resume.
- Profile memory: auth AgentClient.sync_profile + agent TravelerProfileMemoryRequest + AgentCoreMemory.PROFILE_FIELDS + canonical profile read. Update each boundary explicitly.
- Places: PlansApp's existing loader and private map_server show current key locations, but legacy autocomplete and Plan-only MCP are not new onboarding APIs. Extract reusable browser loader, use supported new autocomplete adapter.
