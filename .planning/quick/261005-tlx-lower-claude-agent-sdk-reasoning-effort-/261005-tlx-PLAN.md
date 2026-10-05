---
quick_id: 261005-tlx
type: quick
status: planned
---

# Lower reasoning and compact travel replies

User request: decrease model reasoning and make system prompts informative, helpful, and compact.

1. Set low effort in the shared Claude Agent SDK options, retaining model-compatible default thinking behavior.
2. Share a concise reply-style instruction between conversational and researched answers. Preserve evidence, uncertainty, and state rules.
3. Rebuild the existing local container through travella-local, preserving volumes. Record startup/source freshness results without automated tests or paid model calls.

Scope: services/agent/claude/research_worker.py and sdk_conversation.py, plus quick-task artifacts and STATE.md. No model, graph, tool, or budget redesign.

Execution: inline GSD quick workflow. Acceptance of actual reply quality and savings remains manual.
