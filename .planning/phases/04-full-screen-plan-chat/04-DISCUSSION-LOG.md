# Phase 4 Discussion Log

## Conversation decisions

| Topic | Decision | Source |
|---|---|---|
| Entry into chat | Replace the Plan's current conversation drawer with a full-page chat | User selection |
| Existing transcript | Load the Plan's existing conversation history | User selection |
| During generation | Show Stop; disable sending until stopped or complete | User selection |
| Stop result | Keep partial text visible and mark the reply stopped | User selection |
| Sources | Show source links inline beneath the relevant reply | User selection |
| Composer keys | Enter sends; Shift+Enter adds a line | User selection |
| Connection failure | Keep partial text, mark interrupted, offer Retry | User selection |
| Streaming boundary | Include minimal end-to-end transport for assistant text only | User selection |

## Scope held for this phase

The deliverable is the first full-screen GPT-like Plan chat, including the minimum transport changes required for live assistant text. The Agent's existing server-side context remains in use. Context/state streaming, progress UI, memory expansion, and new research capabilities are deferred.

## Prototype decision

Three interactive chat alternatives were previously explored. The user accepted the simple full-page pure-chat direction. Use the Clean Chat direction with inline sources; do not add a context drawer or create another prototype round.
