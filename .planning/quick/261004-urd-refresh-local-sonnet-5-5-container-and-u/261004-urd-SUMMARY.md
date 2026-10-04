---
status: complete
---
# Local Sonnet 5.5 refresh

- Shared secret refreshed through the existing launcher; active model and research model both report claude-sonnet-5-5 through Claude Agent SDK.
- Removed hardcoded thinking.type=disabled in commit bda69a2. The selected model/SDK now uses its default thinking behavior; existing budgets remain in place. Default reasoning may affect latency and token use.
- Rebuilt with scripts/start-local-ready.sh; startup health and sign-in/session/sign-out passed.
- Running research_worker.py and sdk_conversation.py hashes match this checkout.
- URL: http://localhost:5174 . Database volumes preserved.
- No automated tests or live paid model requests performed. User to check chat manually.
