"""Two canvas components, one observed evidence registry and one bounded review."""
from __future__ import annotations

import asyncio
import hashlib
import json
import re
from dataclasses import replace
from datetime import UTC, datetime, timedelta

from ..canvas_contracts import CanvasResearchSummary
from ..config import ResearchWorkerConfig
from .canvas_loop import CanvasBudget, canvas_prompt, report_canvas_usage, reviewed_candidate
from .evidence import recent_evidence
from .research_result import ReadEvidence
from .runtime import ClaudeSdkRuntime, ResearchWorkerError, _EvidenceObserver


def _fresh(evidence: ReadEvidence) -> bool:
    try:
        read_at = datetime.fromisoformat(evidence.retrieved_at.replace("Z", "+00:00"))
        return bool(read_at.tzinfo and timedelta(0) <= datetime.now(UTC) - read_at <= timedelta(hours=24))
    except ValueError:
        return False


def research_projection(raw: dict, observer: _EvidenceObserver) -> dict:
    candidate = CanvasResearchSummary.model_validate(raw)
    # An empty structured response is parseable, but it is not completed
    # destination research. Let the bounded repair run try, then surface Retry.
    if not candidate.links or not any(item.sources for item in candidate.findings):
        raise ResearchWorkerError("canvas_research_incomplete")
    known_urls = {item.url for item in observer.evidence.values()}
    for text in ([item.summary for item in candidate.findings]
                 + [item.title for item in candidate.findings]
                 + [item.purpose for item in candidate.links]):
        for url in re.findall(r"https?://[^\s<>\]\)]+", text):
            if url.rstrip(".,;") not in known_urls:
                raise ResearchWorkerError("canvas_output_invalid")
    findings, links, seen = [], [], set()
    for finding in candidate.findings:
        sources = []
        evidence_items = []
        for ref in finding.sources:
            evidence = observer.evidence.get(ref.evidence_id)
            if not evidence or not ref.quote.strip() or ref.quote not in evidence.content:
                raise ResearchWorkerError("canvas_output_invalid")
            evidence_items.append(evidence)
            sources.append({"title": evidence.title[:120], "url": evidence.url})
        certainty = finding.certainty
        if certainty == "supported" and not sources:
            raise ResearchWorkerError("canvas_output_invalid")
        if certainty == "conflicting" and len({s["url"] for s in sources}) < 2:
            raise ResearchWorkerError("canvas_output_invalid")
        if finding.time_sensitive and any(not _fresh(e) for e in evidence_items):
            certainty = "uncertain"
        identity = hashlib.sha256(finding.title.casefold().encode()).hexdigest()[:20]
        if identity in seen:
            continue
        seen.add(identity)
        findings.append({"id": f"finding-{identity}", "title": finding.title,
                         "summary": finding.summary, "sources": sources,
                         "certainty": certainty,
                         "researchedAt": min((e.retrieved_at for e in evidence_items), default="")})
    for link in candidate.links:
        evidence = observer.evidence.get(link.evidence_id)
        if not evidence:
            raise ResearchWorkerError("canvas_output_invalid")
        identity = hashlib.sha256(evidence.url.encode()).hexdigest()[:20]
        if any(item["id"] == f"link-{identity}" for item in links):
            continue
        links.append({"id": f"link-{identity}", "title": evidence.title[:120],
                      "url": evidence.url, "purpose": link.purpose, "category": link.category})
    if observer.unavailable and len(findings) < 30:
        findings.append({"id": "finding-source-unavailable", "title": "Some pages were unavailable",
                         "summary": "Some source pages could not be read. Their information has not been verified.",
                         "sources": [], "certainty": "unavailable"})
    return {"findings": {"status": "ready", "items": findings},
            "links": {"status": "ready", "items": links}}


class _CanvasObserver(_EvidenceObserver):
    async def before(self, data, tool_use_id, context):
        if data.get("tool_name") == "Skill":
            from .runtime import _deny
            return _deny()
        return await super().before(data, tool_use_id, context)


class ClaudeCanvasResearchWorker:
    def __init__(self, config: ResearchWorkerConfig, *, worker=None):
        self.config = replace(config, max_searches=min(config.max_searches, 2),
                              max_fetches=min(config.max_fetches, 4))
        self.worker = worker if worker is not None else ClaudeSdkRuntime(self.config)

    async def run(self, *, destination: str, themes: dict, trip_context: dict,
                  reusable_evidence: list[dict] | None = None, usage: dict | None = None,
                  evidence_sink: list[dict] | None = None) -> dict:
        if not destination.strip():
            if usage is not None:
                usage.update(calls=0, cost_usd=0.0, usage_complete=True, stage="prepare", searches=0, reads=0)
            return {"findings": {"status": "empty", "items": []},
                    "links": {"status": "empty", "items": []}}
        observer = _CanvasObserver(self.config, recent_evidence(reusable_evidence or []))
        budget = CanvasBudget(min(self.config.max_budget_usd, 0.25),
                              min(self.config.timeout_seconds, 90))
        complete = cancelled = False

        def evidence():
            return [item.model_dump() for item in observer.evidence.values()]
        try:
            async with asyncio.timeout(min(self.config.timeout_seconds, 90)):
                with self.worker.session() as session:
                    async def invoke(stage, payload, schema, allowance):
                        root, cli = session
                        options = self.worker._options(root, cli, observer,
                                                       answer=stage == "review", budget=allowance)
                        options.system_prompt = canvas_prompt(
                            "canvas-review-v1" if stage == "review" else "canvas-research-v1")
                        options.include_partial_messages = False
                        options.max_turns = min(self.config.max_turns, 3 if stage == "review" else 8)
                        options.skills = []
                        options.setting_sources = []
                        options.tools = [] if stage == "review" else ["WebSearch", "WebFetch"]
                        options.allowed_tools = list(options.tools)
                        options.output_format = {"type": "json_schema", "schema": schema}
                        result = await self.worker._consume(json.dumps({
                            **payload, "read_evidence": evidence(),
                        }), options)
                        return result.structured_output, result.total_cost_usd
                    result = await reviewed_candidate(
                        invoke=invoke, payload={"destination": destination,
                                               "themes": themes, "trip_context": trip_context},
                        schema=CanvasResearchSummary.model_json_schema(),
                        validate=lambda raw: research_projection(raw, observer), budget=budget,
                        review_sources=evidence,
                    )
            if evidence_sink is not None:
                evidence_sink.extend(evidence())
            complete = True
            return result
        except asyncio.CancelledError:
            cancelled = True
            raise
        except ResearchWorkerError:
            raise
        except Exception:
            raise ResearchWorkerError("canvas_research_unavailable") from None
        finally:
            report_canvas_usage(budget, usage, group="research", complete=complete,
                                cancelled=cancelled, searches=observer.searches, reads=observer.fetches)
