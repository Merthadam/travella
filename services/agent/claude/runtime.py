"""Shared Claude SDK runtime: isolation, bounded tools and cancellation.

SDK sessions are disposable. LangGraph selects chat or canvas generation. CRUD owns durable Plan data.
Callers supply their own prompts, output schemas and bounded loop policy.
"""

from __future__ import annotations

import asyncio
import hashlib
import inspect
import json
import math
import re
import shutil
import socket
import sys
from contextlib import aclosing, contextmanager
from datetime import UTC, datetime
from pathlib import Path
from tempfile import TemporaryDirectory
from urllib.parse import urlsplit

import claude_agent_sdk
from claude_agent_sdk import ClaudeAgentOptions, HookMatcher, ResultMessage, StreamEvent, query
from claude_agent_sdk._internal.transport.subprocess_cli import SubprocessCLITransport
from pydantic import ValidationError

from ..config import ResearchWorkerConfig
from .research_result import ReadEvidence, public_https_url

ASSETS = Path(__file__).resolve().parents[1] / "research_assets"
TOOLS = ["WebSearch", "WebFetch", "Skill"]
CHILD_ENV = (
    "HOME", "PATH", "TMPDIR", "CLAUDE_CONFIG_DIR", "ANTHROPIC_API_KEY",
    "CLAUDE_CODE_ENTRYPOINT", "CLAUDE_AGENT_SDK_VERSION", "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC",
    "CLAUDE_CODE_DISABLE_AUTO_MEMORY", "CLAUDE_CODE_MAX_RETRIES", "API_TIMEOUT_MS",
)


class ResearchWorkerError(RuntimeError):
    """Public failures contain a fixed code, never SDK exceptions or provider data."""

    def __init__(self, code: str = "research_unavailable") -> None:
        self.code = code
        super().__init__(code)


async def _public_dns(url: str) -> bool:
    import ipaddress

    try:
        host = urlsplit(public_https_url(url)).hostname
        records = await asyncio.get_running_loop().getaddrinfo(host, 443, type=socket.SOCK_STREAM)
        return bool(records) and all(ipaddress.ip_address(record[4][0]).is_global for record in records)
    except (ValueError, OSError):
        return False


def _deny() -> dict:
    return {"hookSpecificOutput": {
        "hookEventName": "PreToolUse", "permissionDecision": "deny",
        "permissionDecisionReason": "This research tool request is unavailable or exceeds its limit.",
    }}


class _EvidenceObserver:
    def __init__(self, config: ResearchWorkerConfig, reusable: list[dict]) -> None:
        self.config = config
        self.evidence: dict[str, ReadEvidence] = {}
        self.searches = 0
        self.fetches = 0
        self.approved_fetches: set[str] = set()
        self.unavailable = False
        for item in reusable[:9]:
            try:
                # Callers decide freshness; validate the minimal reusable shape here.
                evidence = ReadEvidence.model_validate({
                    key: item[key] for key in ReadEvidence.model_fields if key in item
                })
                self.evidence[evidence.evidence_id] = evidence
            except (ValidationError, TypeError):
                continue

    async def before(self, data, tool_use_id, context) -> dict:
        name, arguments = data.get("tool_name"), data.get("tool_input", {})
        if name == "StructuredOutput":
            return {}
        if name == "Skill":
            return {} if arguments.get("skill") == "travel-research" else _deny()
        if name == "WebSearch" and self.searches < self.config.max_searches:
            self.searches += 1
            return {}
        if name == "WebFetch" and self.fetches < self.config.max_fetches:
            self.fetches += 1
            url = arguments.get("url")
            if isinstance(url, str) and await _public_dns(url):
                self.approved_fetches.add(public_https_url(url))
                return {}
        return _deny()

    async def after(self, data, tool_use_id, context) -> dict:
        if data.get("tool_name") != "WebFetch":
            return {}
        response = data.get("tool_response")
        try:
            requested = public_https_url(data["tool_input"]["url"])
            # WebFetch's native output is {code, result, url, ...}. A redirect
            # response contains no read result; do not promote it to evidence.
            if not isinstance(response, dict) or response.get("code") != 200:
                raise ValueError("unread")
            url = public_https_url(response["url"])
            content = response.get("result")
            if (requested not in self.approved_fetches or url != requested
                    or not isinstance(content, str) or not content.strip()):
                raise ValueError("unread")
            evidence_id = "sdk_" + hashlib.sha256(url.encode()).hexdigest()[:24]
            evidence = ReadEvidence(
                evidence_id=evidence_id,
                title=str(response.get("title") or urlsplit(url).hostname)[:180],
                url=url,
                read_status="read",
                retrieved_at=datetime.now(UTC).isoformat(),
                content=" ".join(content.split())[:2400],
            )
            self.evidence[evidence_id] = evidence
            return {"hookSpecificOutput": {
                "hookEventName": "PostToolUse",
                "additionalContext": f"Observed page read. Citation evidence_id: {evidence_id}",
            }}
        except (ValueError, KeyError, TypeError):
            self.unavailable = True
            return {}

    async def failed(self, data, tool_use_id, context) -> dict:
        if data.get("tool_name") == "WebFetch":
            self.unavailable = True
        return {}


def _isolated_cli(root: Path) -> Path:
    """Drop inherited AWS/DB/user configuration before native Claude starts.

The SDK env option MERGES the parent environment. This tiny noninteractive exec
wrapper narrows it without modifying process-global os.environ (parallel runs).
No secret values are written to the wrapper or passed through CLI arguments.
"""
    native = Path(claude_agent_sdk.__file__).parent / "_bundled" / "claude"
    if not native.is_file():
        raise ResearchWorkerError("research_runtime_unavailable")
    wrapper = root / "claude-isolated"
    wrapper.write_text(
        f"#!{sys.executable} -I\n"
        "import os, sys\n"
        f"keys = {CHILD_ENV!r}\n"
        "env = {key: os.environ[key] for key in keys if key in os.environ}\n"
        f"os.execve({str(native)!r}, [{str(native)!r}, *sys.argv[1:]], env)\n",
        encoding="utf-8",
    )
    wrapper.chmod(0o700)
    return wrapper


async def _emit(callback, text: str) -> None:
    if callback and text:
        pending = callback(text)
        if inspect.isawaitable(pending):
            await pending


class _AnswerStream:
    """Hold the final token so a URL can be checked before any of it is shown."""

    def __init__(self, callback, urls: set[str]) -> None:
        self.callback = callback
        self.urls = urls
        self.pending = ""

    async def add(self, part: str, *, final: bool = False) -> None:
        self.pending += part
        if final:
            split = len(self.pending)
        else:
            boundaries = list(re.finditer(r"\s+", self.pending))
            split = boundaries[-1].end() if boundaries else 0
        ready, self.pending = self.pending[:split], self.pending[split:]
        for url in re.findall(r"https?://[^\s<>\]\)]+", ready):
            try:
                if public_https_url(url.rstrip(".,;")) not in self.urls:
                    raise ValueError("unobserved source")
            except ValueError:
                raise ResearchWorkerError("research_output_invalid") from None
        await _emit(self.callback, ready)


class ClaudeSdkRuntime:
    def __init__(self, config: ResearchWorkerConfig, *, query_fn=None, transport_factory=None) -> None:
        self.config = config
        self._query = query_fn or query
        self._transport_factory = transport_factory or SubprocessCLITransport

    @contextmanager
    def session(self):
        """One disposable SDK filesystem shared by the calls in a single turn."""
        with TemporaryDirectory(prefix="travella-sdk-") as directory:
            root = Path(directory)
            for name in ("project", "home", "tmp", "config"):
                (root / name).mkdir(mode=0o700)
            shutil.copytree(ASSETS / ".claude", root / "project" / ".claude")
            yield root, _isolated_cli(root)

    async def structured(self, *, session, system: str, payload: dict, schema: dict,
                         budget: float):
        """SDK-validated control result; no browser-visible text or external tools."""
        root, cli = session
        options = self._options(root, cli, _EvidenceObserver(self.config, []),
                                answer=True, budget=budget)
        options.system_prompt = system
        options.max_turns = 3
        options.include_partial_messages = False
        options.output_format = {"type": "json_schema", "schema": schema}
        result = await self._consume(json.dumps(payload), options)
        return result.structured_output, result.total_cost_usd

    def _options(self, root: Path, cli: Path, observer: _EvidenceObserver,
                 *, answer: bool, budget: float) -> ClaudeAgentOptions:
        return ClaudeAgentOptions(
            model=self.config.model,
            # Lower reasoning spend without disabling model-required adaptive thinking.
            effort="low",
            tools=[] if answer else TOOLS.copy(),
            allowed_tools=[] if answer else TOOLS.copy(),
            permission_mode="dontAsk",
            skills=[] if answer else ["travel-research"],
            setting_sources=[] if answer else ["project"],
            cwd=str(root / "project"), cli_path=str(cli),
            mcp_servers={}, strict_mcp_config=True,
            max_turns=1 if answer else self.config.max_turns,
            max_budget_usd=budget,
            include_partial_messages=answer,
            settings=json.dumps({"autoMemoryEnabled": False}),
            extra_args={"no-session-persistence": None},
            env={
                "HOME": str(root / "home"), "PATH": "/usr/bin:/bin",
                "TMPDIR": str(root / "tmp"), "CLAUDE_CONFIG_DIR": str(root / "config"),
                "ANTHROPIC_API_KEY": self.config.api_key,
                "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC": "1",
                "CLAUDE_CODE_DISABLE_AUTO_MEMORY": "1", "CLAUDE_CODE_MAX_RETRIES": "0",
                "API_TIMEOUT_MS": str(int(self.config.timeout_seconds * 1000)),
            },
            stderr=lambda _: None,
            hooks=None if answer else {
                "PreToolUse": [HookMatcher(hooks=[observer.before])],
                "PostToolUse": [HookMatcher(hooks=[observer.after])],
                "PostToolUseFailure": [HookMatcher(hooks=[observer.failed])],
            },

        )

    async def _consume(self, prompt: str, options: ClaudeAgentOptions, *, structured_stream=None):
        transport = self._transport_factory(prompt=prompt, options=options)
        result = None
        try:
            async with aclosing(self._query(prompt=prompt, options=options, transport=transport)) as stream:
                async for event in stream:
                    if isinstance(event, ResultMessage):
                        result = event
                    elif (options.include_partial_messages and isinstance(event, StreamEvent)
                          and event.parent_tool_use_id is None):
                        data = event.event
                        if structured_stream is not None:
                            await structured_stream.feed(data)
                            continue
        finally:
            # The pinned SDK closes its iterator's transport, but raw asyncio
            # cancellation can interrupt that cleanup. A separate shielded task
            # guarantees termination/reaping before deleting the private run dir.
            cleanup = asyncio.create_task(transport.close())
            try:
                await asyncio.shield(cleanup)
            except asyncio.CancelledError:
                await cleanup
                raise
        if result is None or result.is_error or result.subtype != "success":
            raise ResearchWorkerError("research_incomplete")
        cost = result.total_cost_usd
        ceiling = options.max_budget_usd
        if cost is None or not math.isfinite(cost) or cost < 0 or cost > ceiling:
            raise ResearchWorkerError("research_budget_exceeded")
        return result

