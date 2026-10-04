"""No provider calls: verify the worker's capability, provenance and lifecycle boundary."""

import asyncio
from pathlib import Path

import pytest
from claude_agent_sdk import ResultMessage, StreamEvent
from pydantic import ValidationError

from services.agent.claude import research_worker as module
from services.agent.claude.research_result import ResearchResult, public_https_url
from services.agent.claude.research_worker import ClaudeResearchWorker, ResearchWorkerError
from services.agent.config import ResearchWorkerConfig

URL = "https://www.visitportugal.com/en/lisbon"


def result(**overrides):
    values = dict(subtype="success", duration_ms=1, duration_api_ms=1, is_error=False,
                  num_turns=1, session_id="private-sdk-session", total_cost_usd=0.01)
    return ResultMessage(**(values | overrides))


class FakeTransport:
    instances = []

    def __init__(self, *, prompt, options):
        self.closed = False
        self.options = options
        self.instances.append(self)

    async def close(self):
        self.closed = True


async def fetch(options, *, code=200, returned_url=URL):
    before = options.hooks["PreToolUse"][0].hooks[0]
    allowed = await before({"tool_name": "WebFetch", "tool_input": {"url": URL}}, "t1", {})
    assert not allowed
    after = options.hooks["PostToolUse"][0].hooks[0]
    observed = await after({
        "tool_name": "WebFetch", "tool_input": {"url": URL},
        "tool_response": {"code": code, "url": returned_url, "result": "Lisbon has riverside walks."},
    }, "t1", {})
    if not observed:
        return None
    return observed["hookSpecificOutput"]["additionalContext"].split()[-1]


def worker(query_fn, **overrides):
    return ClaudeResearchWorker(ResearchWorkerConfig(api_key="secret-key", **overrides),
                                query_fn=query_fn, transport_factory=FakeTransport)


async def run(instance, callback=None):
    return await instance.run(message="Tell me about Lisbon", context={},
                              research_intent="factual_research", candidates=[],
                              reusable_evidence=[], on_text_delta=callback)


@pytest.fixture(autouse=True)
def public_dns(monkeypatch):
    async def allowed(url):
        return True
    monkeypatch.setattr(module, "_public_dns", allowed)
    FakeTransport.instances = []


def test_only_observed_reads_reach_answer_and_actual_deltas_stream():
    deltas, directories, options_seen = [], [], []

    async def sdk(*, prompt, options, transport):
        options_seen.append(options)
        directories.append(Path(options.cwd).parent)
        if options.tools:
            evidence_id = await fetch(options)
            # Internal research text must never reach the caller's callback.
            yield StreamEvent("1", "secret-session", {
                "type": "content_block_delta", "delta": {"type": "text_delta", "text": "private"},
            })
            yield result(structured_output={"evidence_ids": [evidence_id], "uncertainty": []})
        else:
            assert "Lisbon has riverside walks." in prompt
            for chunk in ("Lisbon has ", "riverside walks."):
                yield StreamEvent("2", "secret-session", {
                    "type": "content_block_delta", "delta": {"type": "text_delta", "text": chunk},
                })
                if chunk.endswith(" "):
                    assert deltas[-1] == chunk  # callback fires before the next SDK event
            yield result()

    async def callback(part):
        deltas.append(part)

    outcome = asyncio.run(run(worker(sdk), callback))
    assert outcome["answer"] == "".join(deltas) == "Lisbon has riverside walks."
    assert outcome["evidence"][0]["url"] == URL
    assert outcome["evidence"][0]["read_status"] == "read"
    assert all(item.closed for item in FakeTransport.instances)
    assert all(not path.exists() for path in directories)
    first, last = options_seen
    assert first.tools == ["WebSearch", "WebFetch", "Skill"]
    assert first.skills == ["travel-research"]
    assert first.strict_mcp_config and not first.mcp_servers
    assert first.setting_sources == ["project"]
    assert first.permission_mode == "dontAsk"
    assert first.extra_args == {"no-session-persistence": None}
    assert not first.resume and not first.continue_conversation
    assert last.tools == [] and last.skills == [] and last.setting_sources == []
    assert first.max_budget_usd == 0.375 and last.max_budget_usd == 0.49


@pytest.mark.parametrize("structured", [
    None, {"evidence_ids": ["invented"], "uncertainty": []},
    {"evidence_ids": [], "uncertainty": [], "answer": "forged"},
])
def test_missing_malformed_or_fabricated_evidence_is_rejected(structured):
    async def sdk(**kwargs):
        yield result(structured_output=structured)
    with pytest.raises(ResearchWorkerError, match="research_output_invalid"):
        asyncio.run(run(worker(sdk)))
    assert all(item.closed for item in FakeTransport.instances)


@pytest.mark.parametrize("code,returned_url", [(403, URL), (200, "https://other.example/page")])
def test_failed_or_redirected_reads_do_not_become_citations(code, returned_url):
    async def sdk(*, options, **kwargs):
        assert await fetch(options, code=code, returned_url=returned_url) is None
        yield result(structured_output={"evidence_ids": [], "uncertainty": []})
    outcome = asyncio.run(run(worker(sdk)))
    assert outcome["evidence"] == []
    assert "couldn’t read" in outcome["answer"]
    assert "Some source pages could not be read." in outcome["uncertainty"]


def test_tool_caps_unknown_skills_and_private_urls_are_denied(monkeypatch):
    async def dns(url):
        return not url.startswith("https://127.")
    monkeypatch.setattr(module, "_public_dns", dns)
    observer = module._EvidenceObserver(ResearchWorkerConfig(api_key="key", max_searches=1), [])

    async def check():
        for name, args in [("Bash", {}), ("Read", {}), ("mcp__anything", {}),
                           ("Skill", {"skill": "another"}),
                           ("WebFetch", {"url": "https://127.0.0.1"})]:
            assert (await observer.before({"tool_name": name, "tool_input": args}, None, {}))[
                "hookSpecificOutput"]["permissionDecision"] == "deny"
        search = {"tool_name": "WebSearch", "tool_input": {"query": "Lisbon"}}
        assert await observer.before(search, None, {}) == {}
        assert await observer.before(search, None, {}) != {}
    asyncio.run(check())


def test_failure_is_sanitized_and_temp_directory_is_removed():
    dirs = []

    async def sdk(*, options, **kwargs):
        dirs.append(Path(options.cwd).parent)
        raise RuntimeError("ANTHROPIC_API_KEY=secret-key and private provider response")
        yield  # async generator protocol

    with pytest.raises(ResearchWorkerError) as error:
        asyncio.run(run(worker(sdk)))
    assert str(error.value) == "research_unavailable"
    assert not dirs[0].exists() and FakeTransport.instances[0].closed


def test_cancel_closes_transport_before_private_directory_cleanup():
    started = asyncio.Event()
    dirs = []

    async def sdk(*, options, **kwargs):
        dirs.append(Path(options.cwd).parent)
        started.set()
        await asyncio.Event().wait()
        yield result()

    async def scenario():
        task = asyncio.create_task(run(worker(sdk)))
        await started.wait()
        task.cancel()
        with pytest.raises(asyncio.CancelledError):
            await task
        assert FakeTransport.instances[0].closed
        assert not dirs[0].exists()
    asyncio.run(scenario())


def test_timeout_is_safe_and_closes_transport():
    async def sdk(**kwargs):
        await asyncio.Event().wait()
        yield result()
    with pytest.raises(ResearchWorkerError, match="research_timeout"):
        asyncio.run(run(worker(sdk, timeout_seconds=0.02)))
    assert FakeTransport.instances[0].closed


def test_budget_exhaustion_stops_before_answer_call():
    async def sdk(**kwargs):
        yield result(total_cost_usd=1, structured_output={"evidence_ids": [], "uncertainty": []})
    with pytest.raises(ResearchWorkerError, match="research_budget_exceeded"):
        asyncio.run(run(worker(sdk)))
    assert len(FakeTransport.instances) == 1


def test_turn_limit_uses_observed_evidence_and_marks_uncertainty():
    async def sdk(*, options, **kwargs):
        if options.tools:
            await fetch(options)
            yield result(subtype="error_max_turns", is_error=True)
        else:
            yield StreamEvent("answer", "session", {
                "type": "content_block_delta", "delta": {"type": "text_delta", "text": "Lisbon has walks."},
            })
            yield result()
    outcome = asyncio.run(run(worker(sdk)))
    assert outcome["answer"] == "Lisbon has walks."
    assert outcome["evidence"][0]["url"] == URL
    assert "limit" in outcome["uncertainty"][0]


def test_split_invented_url_never_reaches_stream_callback():
    chunks = []

    async def scenario():
        stream = module._AnswerStream(chunks.append, {URL})
        await stream.add("Supported text. htt")
        await stream.add("ps://invented.example")
        with pytest.raises(ResearchWorkerError, match="research_output_invalid"):
            await stream.add("/made-up ")
    asyncio.run(scenario())
    assert "".join(chunks) == "Supported text. "


@pytest.mark.parametrize("url", [
    "http://example.org", "https://user:password@example.org", "https://127.0.0.1",
    "https://169.254.169.254/latest", "https://host.local/x", "https://example.org:bad/",
    "https://example.org/a b", "https://example.org\\@127.0.0.1/",
])
def test_source_url_validation(url):
    with pytest.raises(ValueError):
        public_https_url(url)


def test_unknown_citation_links_are_rejected():
    with pytest.raises(ValidationError):
        ResearchResult(answer="See https://invented.example/facts", evidence=[],
                       evidence_ids=[], uncertainty=[])
