# Deferred integration boundary

The user explicitly chose standalone component design first. No AI-SPEC is needed for this phase because no model invocation, prompt, tool, retrieval flow or agent behavior is being built.

The later phase can integrate the approved catalog with existing Claude Agent SDK → LangGraph/AgentCore → AG-UI and CRUD state. It must separately decide persistence, source validation, ownership, race handling, cancellation and provider capability. None of those choices is silently locked by this component phase.

Components expose validated input schemas and typed actions now. Live Google Maps adapter, LiteAPI exploration, AG-UI events, save/resume and actual agent generation remain deferred. The local mock generator is only a design aid, visibly labeled and restricted to the development gallery.
