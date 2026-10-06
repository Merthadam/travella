# Themes & preferences generation

## First slice

The existing Plan-scoped LangGraph has a `canvas_generation` node. An explicit
`canvas_action: "generate_themes"` routes directly to it instead of conversation
or research. It invokes `ClaudeThemesWorker` once through Claude Agent SDK.
LangGraph is the orchestrator; this worker is a separate isolated SDK invocation,
not an SDK parent agent asking another model to delegate through the Agent tool.
That avoids an extra model routing call for this single-purpose task.

The existing authenticated event endpoints and AgentCore `turn`/`stream` envelope
carry the action. The new field is validated in the shared request contract,
including at the auth-to-AgentCore forwarding boundary.

Example request body to the existing Plan events endpoint:

```json
{
  "plan_id": "<existing-plan-uuid>",
  "event_id": "<new-unique-event-id>",
  "canvas_action": "generate_themes"
}
```

`message` is optional additional traveler context. Candidate actions and forwarded
Trip Brief edits cannot be mixed with generation. Authorization and ownership are
checked before gathering Plan context. Concurrent runs retain the existing Plan
reservation and context lease; generation releases the lease without saving edits.

Success returns `status: "canvas_draft_ready"` and:

```json
{
  "canvas_draft": {
    "component": "TripThemes",
    "data": {
      "status": "ready",
      "items": [
        {
          "id": "theme-<stable-content-hash>",
          "kind": "theme",
          "text": "Local food",
          "source": "Conversation"
        }
      ]
    }
  }
}
```

This shape matches `frontend/src/design-system/schemas.js` and the approved
TripThemes component. Kinds: theme, pace, priority, must_do, avoid. A successful
empty summary has an empty items array. Browser errors never contain raw SDK
exceptions or source quotations. Stream responses carry the complete validated
`canvas_draft` in a STATE_SNAPSHOT and TERMINAL payload, followed by RUN_FINISHED.
No partial JSON is emitted.

## Input and grounding

- Relevant canonical profile fields are read-only advisory sources, labeled
  Saved preference. Precise address, citizenship, user identity and credentials
  are not part of the summary payload.
- Active brief and current trip context are labeled Trip context.
- Traveler messages from the existing bounded context are labeled Conversation.
  Assistant suggestions alone cannot support generated preferences.
- Latest clear trip corrections override older and saved preferences. This
  semantic rule is prompt-enforced; exact quotation matching does not prove the
  model interpreted a correction correctly.
- Each output item must cite an existing source and an exact substring. The
  backend validates those references and assigns display labels and stable ids.
- At most 20 items, 160 characters each. Payload ceiling: 32,000 characters.

The existing TurnContext supplies only the latest 12 messages (2,000 characters
per message), plus current structured state. This is not full historical recall.
Older preferences absent from both that window and saved state cannot reliably
be recovered. Brief source entries are bounded to 4,000 characters each. A later
rolling summary/history-retrieval phase can expand coverage without RAG now.
Ambiguous confirmations referring solely to assistant suggestions are omitted.

## Runtime and cost

Reuses existing Secrets Manager/configured Anthropic credentials and model. No
new provider or credential setup. Low reasoning effort, no web/file/MCP/skill
tools. One SDK structured invocation, with the existing maximum of three SDK
turns for structured output completion; no outer retry or research loop.
Configured budget ceiling is the lower of $0.10 and the existing worker budget;
deadline is the lower of 45 seconds and its configured timeout. These are limits,
not measured latency or cost promises. Existing SDK cancellation cleanup applies.

## Boundaries and next step

The result is a draft in the graph result/response, not a durable saved Plan or
long-term memory write. It is not restored on browser reload. There is currently
no frontend Generate action and the studio remains disconnected. Next is connecting
the approved component to this draft and deciding explicit acceptance/save behavior.
No new A2UI catalog messages are published before that integration.

## References

- Claude Agent SDK structured output: https://code.claude.com/docs/en/agent-sdk/structured-outputs
- SDK subagent distinction: https://code.claude.com/docs/en/agent-sdk/subagents
