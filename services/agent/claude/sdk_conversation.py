"""One Claude Agent SDK loop per chat turn: optional research, answer and edits."""
from __future__ import annotations

import asyncio
import json
import logging
from datetime import UTC, datetime

from pydantic import Field

from services.trip_context import TripContext, TurnResult, apply_changes

from ..config import ResearchWorkerConfig
from ..turn import TurnContext, load_prompt
from .chat_stream import ChatAnswerStream
from .evidence import recent_evidence
from .research_result import ResearchResult
from .runtime import ClaudeSdkRuntime, ResearchWorkerError, _EvidenceObserver


class ChatResult(TurnResult):
    needs_input: bool
    evidence_ids: list[str] = Field(default_factory=list, max_length=9)


class ClaudeSdkConversationClient:
    provider = "claude-agent-sdk"

    def __init__(self, config: ResearchWorkerConfig, *, worker=None) -> None:
        self.config = config
        self.model = config.model
        self.worker = worker if worker is not None else ClaudeSdkRuntime(config)

    async def complete_conversation(self, *, message: str, context: TurnContext,
                                    authorization_token: str = "", on_text_delta=None,
                                    reusable_evidence=None) -> dict:
        # Credentials/identity remain outside the model context.
        del authorization_token
        bounded = context.bounded()
        observer = _EvidenceObserver(self.config, recent_evidence(reusable_evidence or []))
        answer_stream = ChatAnswerStream(on_text_delta, observer)
        payload = {
            "current_date_utc": datetime.now(UTC).date().isoformat(),
            "current_message": message[:2000],
            "conversation_history": list(bounded.recent_messages),
            "plan_brief": bounded.brief,
            "trip_context": bounded.trip_context,
            "traveler_preferences": bounded.traveler_profile,
            "read_evidence": [item.model_dump() for item in observer.evidence.values()],
        }
        try:
            async with asyncio.timeout(self.config.timeout_seconds):
                with self.worker.session() as (root, cli):
                    options = self.worker._options(root, cli, observer, answer=False,
                                                   budget=self.config.max_budget_usd)
                    options.system_prompt = load_prompt("chat-v1")
                    options.include_partial_messages = True
                    options.output_format = {"type": "json_schema", "schema": ChatResult.model_json_schema()}
                    result = await self.worker._consume(json.dumps(payload), options,
                                                          structured_stream=answer_stream)
                    reply = ChatResult.model_validate(result.structured_output)
                    # Validate all state edits before emitting a successful terminal event.
                    updated = apply_changes(TripContext.model_validate(bounded.trip_context),
                                            reply.state_changes, now=datetime.now(UTC).isoformat(),
                                            message=message)
                    if any(key not in observer.evidence for key in reply.evidence_ids):
                        raise ResearchWorkerError("chat_unobserved_citation")
                    evidence = [observer.evidence[key] for key in reply.evidence_ids]
                    ResearchResult(answer=reply.answer, evidence=evidence,
                                   evidence_ids=reply.evidence_ids, uncertainty=[], candidate_names=[])
                    await answer_stream.finish(reply.answer)
                    logging.getLogger(__name__).info(
                        "chat_usage calls=1 cost_usd=%s searches=%s reads=%s",
                        result.total_cost_usd, observer.searches, observer.fetches,
                    )
                    return {
                        "decision": "question" if reply.needs_input else "respond",
                        "assistant_text": reply.answer,
                        "question": reply.answer if reply.needs_input else None,
                        "state_changes": [item.model_dump() for item in reply.state_changes],
                        "trip_context": updated.model_dump(),
                        "research_evidence": [item.model_dump() for item in evidence],
                        "research_evidence_ids": reply.evidence_ids,
                        "research_sources": [{"evidence_id": item.evidence_id, "title": item.title,
                                              "url": item.url} for item in evidence],
                        "_read_evidence": [item.model_dump() for item in observer.evidence.values()],
                    }
        except asyncio.CancelledError:
            raise
        except Exception as error:
            # Fixed error class/code only; no prompts, provider output or secrets.
            logging.getLogger(__name__).warning("chat_failed code=%s", error.code if isinstance(error, ResearchWorkerError) else type(error).__name__)
            raise ResearchWorkerError("conversation_unavailable") from None
