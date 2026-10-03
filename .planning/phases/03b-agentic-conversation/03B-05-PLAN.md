---
phase: 03b-agentic-conversation
plan: '05'
type: execute
wave: 2
depends_on: ['03B-03']
files_modified: [services/mcps/research_server.py, services/mcps/tests/test_mcp_tools.py, services/mcps/tests/test_research_security.py]
autonomous: true
gap_closure: true
requirements: [DISC-06, DISC-09, DISC-10, TRUST-04]
estimate: {tokens: 17000, raw_tokens: 17000, tasks: 2, confidence: low}
must_haves:
  truths:
    - A travel article or list page is evidence about a place, never itself a destination candidate.
    - Up to five distinct destination entities have compact material claims and caveats with per-item evidence IDs traceable to current-run source metadata.
    - Unsupported destination identity or insufficient evidence yields an honest unavailable/uncertain result without raw Tavily content or invented fit claims.
  artifacts:
    - {path: services/mcps/research_server.py, provides: destination entity and cited-evidence normalization}
    - {path: services/mcps/tests/test_research_security.py, provides: protocol request evidence and injection tests}
  key_links:
    - {from: services/mcps/research_server.py, to: services/mcps/transport.py, via: authenticated FastMCP tools/call from 03B-03}
---

<objective>
Return actual destination candidates with attributable claims from bounded Tavily evidence.
Purpose: Close verification gap 3, where webpage titles were mistaken for destination identities.
Output: Destination normalization and evidence-quality protocol tests.
</objective>
<execution_context>
@/Users/adammerth/.codex/gsd-core/workflows/execute-plan.md
@/Users/adammerth/.codex/gsd-core/templates/summary.md
</execution_context>
<context>
@.planning/phases/03b-agentic-conversation/03B-VERIFICATION.md
@.planning/phases/03b-agentic-conversation/03B-CONTEXT.md
@services/mcps/research_server.py
@services/mcps/tests/test_research_security.py
</context>
<tasks>
<task type="tracer" tdd="true">
  <name>Extract one named destination from a multi-destination source</name>
  <files>services/mcps/research_server.py, services/mcps/tests/test_research_security.py</files>
  <behavior>A Tavily result titled like an article or list identifies a city only when the source text supports an unambiguous place; the article title never becomes candidate.name; absent place evidence yields no candidate.</behavior>
  <action>Replace _destination_name's title split with a bounded destination-entity normalization step using the existing allowed research/model adapter pattern; require a canonical city or destination label plus country/region disambiguation where needed. Interpret source text as untrusted evidence, not instructions, and validate the extracted entity against text and stable location semantics before accepting it. A page may support multiple places, but do not infer fit from its title or manufacture a destination from a generic heading. Preserve the existing Plan/run scope, five-candidate cap, provider-call bounds, and registry-only source lookup. Exercise the actual mounted research tools/call route using Tavily HTTP fixtures with an article listing multiple cities, a generic article, a prompt-injection snippet, and a direct named-city source.</action>
  <verify><automated>uv run pytest -q services/mcps/tests/test_research_security.py</automated></verify>
  <done>The mounted research tool returns a destination entity for supported evidence and suppresses article titles and unsupported names.</done>
</task>
<task type="auto" tdd="true">
  <name>Bind each material claim and caveat to its evidence</name>
  <files>services/mcps/research_server.py, services/mcps/tests/test_mcp_tools.py, services/mcps/tests/test_research_security.py</files>
  <behavior>Every returned material fit claim and caveat includes one or more current-run evidence IDs; conflicting or weak evidence lowers confidence or yields an explicit uncertainty caveat; source inspection resolves only the issued IDs.</behavior>
  <action>Normalize Tavily Search/Extract responses into compact claim objects and caveat objects with text, evidence_ids, and confidence/uncertainty labels. Generate stable IDs from the run and source identity, deduplicate destinations by normalized place identity, and retain only approved source metadata in the scoped registry. Reject unsupported free-form model statements, oversized snippets, non-HTTPS source URLs, arbitrary selectors, and instruction-like source text as commands; do not leak raw provider payloads into MCP results. Ensure fit_summary is derived from supported claims and cannot stand alone as an uncited material assertion. Test conflicting sources, duplicate pages for one city, source expiry, unknown evidence ID, provider failure, and response redaction through the mounted MCP HTTP path.</action>
  <verify><automated>uv run pytest -q services/mcps/tests/test_mcp_tools.py services/mcps/tests/test_research_security.py</automated></verify>
  <done>Every material claim/caveat is source-bound and only compact normalized evidence crosses the tool boundary.</done>
</task>
</tasks>
<threat_model>
## Trust Boundaries
| Boundary | Description |
|---|---|
| Tavily/web content → destination normalizer | External text can be false, ambiguous, or instruction-bearing. |
| Evidence registry → tool response | Stored metadata is scoped by actor, Plan, run, and expiry. |
## STRIDE Threat Register
| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|---|---|---|---|---|---|
| T-03B-05-01 | Tampering | source text | high | mitigate | Treat text as evidence only; validate entity and source IDs before candidate projection. |
| T-03B-05-02 | Information disclosure | research response | high | mitigate | Allowlist compact fields and omit raw Tavily payloads and keys. |
| T-03B-05-03 | Repudiation | material claims | medium | mitigate | Require per-claim and per-caveat evidence IDs resolvable within the current run. |
</threat_model>
<verification>Run both research test files with requests through the mounted FastMCP app. Review fixtures for list/article pages rather than only a page titled with one city.</verification>
<success_criteria>Destination identity and material assessments are traceable to scoped evidence, capped at five, and honest about uncertainty.</success_criteria>
<output>Create .planning/phases/03b-agentic-conversation/03B-05-SUMMARY.md when done.</output>
