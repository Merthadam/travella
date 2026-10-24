# Persist Google Maps descriptions

User requests that provider descriptions be retained after the first fetch and appear immediately on reopening. Direct implementation preference applies. Keep approved card layout, original text and attribution.

- Add optional validated googleDetails object (summary, language, provider place ID) to saved pins across browser/CRUD/agent contracts. A successful lookup with no summary is remembered too; failed/unmatched lookups remain retryable.
- Save fetched details and available website atomically through existing canvas autosave. New signed chat/map additions retain their supplied original provider description immediately. Never use legacy generated notes as a fallback.
- Skip details requests when saved metadata exists; preserve it through undo, reload and generation. Do not persist photo URLs.
- Verify meaningful frontend tests and FastAPI CRUD create/read/update/remove/recovery, malformed input and authorization cases. Browser: first fetch/save, reload, cached description present without any details API request, existing plan backfill, and actual chat/map addition path where feasible. Use dedicated container at localhost:5175; preserve database.

Design evidence reuses the approved ready-state card screenshot: that same state must render immediately from saved data. Before screenshot shows the unwanted transient loading state.
