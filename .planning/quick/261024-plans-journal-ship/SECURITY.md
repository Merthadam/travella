---
status: passed
threats_open: 0
reviewed_base: 08007cc622d563cab9772fa6cbfacae78263e320
reviewed_source: 52ec4fb plus integration with main
---

# Plans journal shipping security review

Scoped inline review of the journal frontend and CRUD projection diff, including the merge resolution preserving the account menu and inactive conversation handling. This is not a repository-wide audit.

- Ownership: `PlanRepository.get/list/_locked_plan` continue filtering by the authenticated subject. Newly loaded Canvas/research relationships belong to that Plan. HTTP projection tests verify anonymous rejection, another traveler's 404/empty list and missing-record handling.
- Data projection: only derived title, destination, stage, dates and saved-place count are returned. No raw context, conversation, tokens or provider payloads added to browser output. Read-only summaries leave durable title, revision and activity unchanged; manual titles retain precedence.
- Mutations: journal controls reuse `usePlanAction`, existing normalized-title validation, exact challenge/revision binding and idempotency keys. Uncertain results retry the same request. Conflict requires explicit retry. Soft deletion/recovery behavior is unchanged.
- Rendering: React escapes names, destinations and contributor text. Card hrefs use server-returned Plan IDs. Photo-credit hrefs require HTTPS without embedded credentials and use noopener/noreferrer. No new HTML injection or executable provider content.
- Photos: existing public browser Maps integration loads destination photos, with attribution and unavailable fallback. Photo objects/URLs are mount-local; no new secret credentials or persistent payload cache introduced.
- Merge resolution preserves `AccountMenu` and `PlanConversation inactive`, including account suspension and guarded logout. No authorization or session middleware changed.

Evidence: 73 CRUD tests passed, 7 optional PostgreSQL-specific skips; 87 integrated frontend tests passed, including access/private-state and account-transition coverage. Existing browser evidence covers exact rename persistence, retry, soft-delete/readback/restore and photo delivery failure. No open threat identified in the reviewed change.
