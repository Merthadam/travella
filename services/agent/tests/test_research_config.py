import json
import traceback

import pytest

from services.agent.config import ResearchConfigurationError, ResearchWorkerConfig

KEY = "sk-ant-" + "test-only-credential" * 3
ARN = "arn:aws:secretsmanager:eu-north-1:123456789012:secret:research-test"


class SecretClient:
    def __init__(self, value=None, error=None):
        self.value = value
        self.error = error
        self.calls = []

    def get_secret_value(self, **kwargs):
        self.calls.append(kwargs)
        if self.error:
            raise self.error
        return {"SecretString": self.value}


@pytest.fixture(autouse=True)
def clean_environment(monkeypatch):
    from scripts.local_secrets import ROOT_KEYS

    for key in ROOT_KEYS:
        if key.startswith(("ANTHROPIC_", "AGENT_RESEARCH_")):
            monkeypatch.delenv(key, raising=False)


def test_local_key_is_private_and_config_is_frozen(monkeypatch):
    monkeypatch.setenv("ANTHROPIC_API_KEY", KEY)
    config = ResearchWorkerConfig.from_env()
    assert config.api_key == KEY
    assert KEY not in repr(config)
    assert config.max_turns == 8
    assert config.model == "claude-sonnet-4-6"
    with pytest.raises(AttributeError):
        config.model = "changed"


@pytest.mark.parametrize("value", [KEY, json.dumps({"ANTHROPIC_API_KEY": KEY, "OTHER": "secret"})])
def test_arn_is_authoritative_and_only_explicit_secret_is_read(monkeypatch, value):
    monkeypatch.setenv("ANTHROPIC_API_KEY_SECRET_ARN", ARN)
    monkeypatch.setenv("ANTHROPIC_API_KEY", "sk-ant-" + "ignored" * 8)
    client = SecretClient(value)
    assert ResearchWorkerConfig.from_env(secrets_client=client).api_key == KEY
    assert client.calls == [{"SecretId": ARN}]


def test_denied_secret_has_no_fallback_or_error_leak(monkeypatch, caplog):
    monkeypatch.setenv("ANTHROPIC_API_KEY_SECRET_ARN", ARN)
    monkeypatch.setenv("ANTHROPIC_API_KEY", KEY)
    client = SecretClient(error=RuntimeError(KEY))
    with pytest.raises(ResearchConfigurationError) as caught:
        ResearchWorkerConfig.from_env(secrets_client=client)
    assert KEY not in str(caught.value)
    assert caught.value.__suppress_context__
    assert KEY not in "".join(traceback.format_exception(caught.value))
    assert KEY not in caplog.text


@pytest.mark.parametrize(
    "value", [None, "", "invalid", "[]", '"key"', "{}", json.dumps({"ANTHROPIC_API_KEY": "bad"})]
)
def test_invalid_secret_shape_is_rejected(monkeypatch, value):
    monkeypatch.setenv("ANTHROPIC_API_KEY_SECRET_ARN", ARN)
    with pytest.raises(ResearchConfigurationError):
        ResearchWorkerConfig.from_env(secrets_client=SecretClient(value))


def test_missing_key_fails_without_calling_aws():
    client = SecretClient(KEY)
    with pytest.raises(ResearchConfigurationError):
        ResearchWorkerConfig.from_env(secrets_client=client)
    assert client.calls == []


@pytest.mark.parametrize(
    "field,value",
    [
        ("MAX_TURNS", "0"),
        ("MAX_TURNS", "1000"),
        ("TIMEOUT_SECONDS", "nan"),
        ("MAX_BUDGET_USD", "inf"),
        ("MAX_SEARCHES", "-1"),
        ("MAX_FETCHES", "100"),
    ],
)
def test_invalid_bounds_fail_without_echoing_values(monkeypatch, field, value):
    monkeypatch.setenv("ANTHROPIC_API_KEY", KEY)
    monkeypatch.setenv("AGENT_RESEARCH_" + field, value)
    with pytest.raises(ResearchConfigurationError):
        ResearchWorkerConfig.from_env()


def test_explicit_bounds_are_applied(monkeypatch):
    monkeypatch.setenv("ANTHROPIC_API_KEY", KEY)
    monkeypatch.setenv("AGENT_RESEARCH_MAX_TURNS", "5")
    monkeypatch.setenv("AGENT_RESEARCH_MAX_BUDGET_USD", "0.2")
    config = ResearchWorkerConfig.from_env()
    assert config.max_turns == 5
    assert config.max_budget_usd == 0.2


def test_model_and_arn_reject_untrusted_shapes(monkeypatch):
    monkeypatch.setenv("ANTHROPIC_API_KEY", KEY)
    monkeypatch.setenv("AGENT_RESEARCH_MODEL", "https://attacker.invalid")
    with pytest.raises(ResearchConfigurationError):
        ResearchWorkerConfig.from_env()
    monkeypatch.delenv("AGENT_RESEARCH_MODEL")
    monkeypatch.setenv("ANTHROPIC_API_KEY_SECRET_ARN", "not-an-arn")
    with pytest.raises(ResearchConfigurationError):
        ResearchWorkerConfig.from_env()


def test_runtime_client_uses_secret_region_and_does_not_mutate_environment(monkeypatch):
    import os

    import services.agent.config as config_module

    monkeypatch.setenv("ANTHROPIC_API_KEY_SECRET_ARN", ARN)
    requests = []
    client = SecretClient(KEY)

    def factory(service, **kwargs):
        requests.append((service, kwargs))
        return client

    monkeypatch.setattr(config_module.boto3, "client", factory)
    assert ResearchWorkerConfig.from_env().api_key == KEY
    assert requests[0][0] == "secretsmanager"
    assert requests[0][1]["region_name"] == "eu-north-1"
    assert requests[0][1]["config"].read_timeout == 10
    assert "ANTHROPIC_API_KEY" not in os.environ
