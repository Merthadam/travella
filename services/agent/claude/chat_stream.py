"""Project only the answer string from the SDK's streaming StructuredOutput tool.

Partial JSON is provisional display text. State and citations are accepted only
from the final validated result; all other SDK text/tool/thinking events stay private.
"""
from __future__ import annotations

from pydantic_core import from_json

from .runtime import ResearchWorkerError, _AnswerStream


class ChatAnswerStream:
    def __init__(self, callback, observer):
        self.observer = observer
        self.stream = _AnswerStream(callback, set())
        self.block = None
        self.buffer = ""
        self.answer = ""
        self.started = False

    async def feed(self, event: dict) -> None:
        kind = event.get("type")
        if kind == "message_start":
            self.block = None
        if kind == "content_block_start":
            block = event.get("content_block", {})
            if block.get("type") == "tool_use" and block.get("name") == "StructuredOutput":
                if self.started:
                    # A corrected result must not silently replace already displayed text.
                    raise ResearchWorkerError("chat_output_revised")
                self.started = True
                self.block = event.get("index")
                self.buffer = ""
                if block.get("input"):
                    await self._accept(block["input"])
        elif kind == "content_block_delta" and self.block is not None and event.get("index") == self.block:
            delta = event.get("delta", {})
            if delta.get("type") == "input_json_delta":
                fragment = delta.get("partial_json", "")
                if not isinstance(fragment, str) or len(self.buffer) + len(fragment) > 65536:
                    raise ResearchWorkerError("chat_output_invalid")
                self.buffer += fragment
                try:
                    partial = from_json(self.buffer, allow_partial="trailing-strings")
                except ValueError:
                    return
                await self._accept(partial)
        elif kind == "content_block_stop" and event.get("index") == self.block:
            self.block = None

    async def _accept(self, value) -> None:
        answer = value.get("answer") if isinstance(value, dict) else None
        if not isinstance(answer, str):
            return
        if len(answer) > 2000 or not answer.startswith(self.answer):
            raise ResearchWorkerError("chat_output_invalid")
        # Incomplete escaped Unicode can wait until the following input delta.
        try:
            answer.encode("utf-8")
        except UnicodeEncodeError:
            return
        suffix = answer[len(self.answer):]
        self.stream.urls = {item.url for item in self.observer.evidence.values()}
        await self.stream.add(suffix)
        self.answer = answer

    async def finish(self, answer: str) -> None:
        await self._accept({"answer": answer})
        await self.stream.add("", final=True)
