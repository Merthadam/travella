# Map-based home and automatic nearby airports

Implemented directly in the chosen B design. Full-address selection resolves the city and displays a real map; Google nearby search automatically loads known airport choices without selecting one. Search farther by name/code, select a map marker/card, clear or skip. Manual address/catalog fallbacks remain. Continue uses the existing revision/idempotency profile contract.

Backend stores bounded `home_city.address`, preserves legacy reads/retries and filters precise addresses from routine agent/memory projections. Existing profile data was preserved.

Build, live Google address/airport queries, actual authenticated desktop map selection, isolated FastAPI persistence/privacy checks and container source hashes passed. Local stack is healthy at http://localhost:5174; startup authentication passed.

**Verification remains incomplete:** Chrome screenshot capture and subsequent browser calls stalled. Mobile/screenshot inspection, final network/error-path checks, keyboard selection and browser save/reload remain open. No automated tests ran. See [verification](../../../artifacts/testing/2026-10-05-map-onboarding/verification.md) and [API checks](../../../artifacts/testing/2026-10-05-map-onboarding/api-verification.md).

Full address is required by this follow-up, including manual fallback; this supersedes the draft plan wording that described manual address as optional. Google address retention/regional policy review is not established by this implementation. No merge/push.
