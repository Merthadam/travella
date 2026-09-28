from __future__ import annotations

import importlib.util
import sys
from pathlib import Path

import pytest

_SCRIPT = Path(__file__).parents[3] / "scripts" / "provision-agentcore-gateway.py"
_SPEC = importlib.util.spec_from_file_location("provision_gateway", _SCRIPT)
assert _SPEC and _SPEC.loader
gateway = importlib.util.module_from_spec(_SPEC)
sys.modules[_SPEC.name] = gateway
_SPEC.loader.exec_module(gateway)


def config(**overrides: str) -> gateway.GatewayConfig:
    values = {
        "region": "eu-north-1",
        "name": "travella-mcp-gateway",
        "role_arn": "arn:aws:iam::123456789012:role/TravellaGateway",
        "cognito_issuer": "https://cognito.example",
        "cognito_discovery_url": "https://cognito.example/.well-known/openid-configuration",
        "cognito_client_id": "travella-client",
        "cognito_audience": "travella-audience",
        "cognito_scope": "travella/agent",
        "interceptor_lambda_arn": "arn:aws:lambda:eu-north-1:123456789012:function:travella-interceptor",
        "oauth_provider_arn": "arn:aws:bedrock-agentcore:eu-north-1:123456789012:oauth2credentialprovider/provider",
        "oauth_issuer": "https://service.example",
        "oauth_audience": "travella-mcp",
        "oauth_client_id": "travella-gateway",
        "oauth_scope": "travella.mcp",
        "research_endpoint": "https://research.internal.example/mcp",
        "map_endpoint": "https://map.internal.example/mcp",
    }
    values.update(overrides)
    return gateway.GatewayConfig(**values)


class FakeControlPlane:
    def __init__(self, cfg: gateway.GatewayConfig, *, existing: bool = False) -> None:
        self.cfg = cfg
        self.calls: list[tuple[str, dict]] = []
        self.gateway = gateway._gateway_request(cfg) | {"gatewayId": "gw-1", "status": "ACTIVE"} if existing else None
        self.targets: dict[str, dict] = {}
        if existing:
            for name, endpoint in (("travella-research-mcp", cfg.research_endpoint), ("travella-map-mcp", cfg.map_endpoint)):
                self.targets[name] = gateway._target_request(cfg, name, endpoint) | {"targetId": f"target-{name.split('-')[1]}", "status": "READY"}

    def list_gateways(self, **kwargs: object) -> dict:
        self.calls.append(("list_gateways", kwargs))
        return {"items": [{"name": self.gateway["name"], "gatewayId": "gw-1"}]} if self.gateway else {"items": []}

    def get_gateway(self, **kwargs: object) -> dict:
        self.calls.append(("get_gateway", kwargs))
        return self.gateway

    def create_gateway(self, **kwargs: object) -> dict:
        self.calls.append(("create_gateway", kwargs))
        self.gateway = dict(kwargs) | {"gatewayId": "gw-1", "status": "ACTIVE"}
        return self.gateway

    def update_gateway(self, **kwargs: object) -> dict:
        self.calls.append(("update_gateway", kwargs))
        gateway_id = kwargs.pop("gatewayIdentifier")
        self.gateway = dict(kwargs) | {"gatewayId": gateway_id, "status": "ACTIVE"}
        return self.gateway

    def list_gateway_targets(self, **kwargs: object) -> dict:
        self.calls.append(("list_gateway_targets", kwargs))
        return {"items": [{"name": name, "targetId": target["targetId"]} for name, target in self.targets.items()]}

    def get_gateway_target(self, **kwargs: object) -> dict:
        self.calls.append(("get_gateway_target", kwargs))
        return self.targets[kwargs["targetId"] if kwargs["targetId"] in self.targets else next(name for name, target in self.targets.items() if target["targetId"] == kwargs["targetId"])]

    def create_gateway_target(self, **kwargs: object) -> dict:
        self.calls.append(("create_gateway_target", kwargs))
        name = kwargs["name"]
        target_id = f"target-{len(self.targets) + 1}"
        self.targets[name] = dict(kwargs) | {"targetId": target_id, "status": "READY"}
        return self.targets[name]

    def update_gateway_target(self, **kwargs: object) -> dict:
        self.calls.append(("update_gateway_target", kwargs))
        target_id = kwargs.pop("targetId")
        name = kwargs["name"]
        self.targets[name] = dict(kwargs) | {"targetId": target_id, "status": "READY"}
        return self.targets[name]

    def synchronize_gateway_targets(self, **kwargs: object) -> dict:
        self.calls.append(("synchronize_gateway_targets", kwargs))
        return {"targets": [{"targetId": target_id, "status": "READY"} for target_id in kwargs["targetIdList"]]}


def test_preflight_rejects_insecure_endpoint_before_control_plane() -> None:
    invalid = config(research_endpoint="http://research.internal.example/mcp")
    with pytest.raises(gateway.ProvisioningError, match="HTTPS"):
        gateway.provision(invalid, client=object(), verify_catalog=False)


def test_provision_constructs_authenticated_gateway_and_two_mcp_targets() -> None:
    cfg = config()
    client = FakeControlPlane(cfg)
    result = gateway.provision(cfg, client=client, verify_catalog=False)

    assert result["status"] == "verified"
    create_gateway = next(args for name, args in client.calls if name == "create_gateway")
    assert create_gateway["authorizerType"] == "CUSTOM_JWT"
    assert create_gateway["interceptorConfigurations"][0]["inputConfiguration"]["passRequestHeaders"] is True
    assert create_gateway["interceptorConfigurations"][0]["interceptionPoints"] == ["REQUEST"]
    create_targets = [args for name, args in client.calls if name == "create_gateway_target"]
    assert {args["name"] for args in create_targets} == {"travella-research-mcp", "travella-map-mcp"}
    for args in create_targets:
        assert args["targetConfiguration"]["mcp"]["mcpServer"]["listingMode"] == "DYNAMIC"
        provider = args["credentialProviderConfigurations"][0]
        assert provider["credentialProviderType"] == "OAUTH"
        assert provider["credentialProvider"]["oauthCredentialProvider"]["grantType"] == "CLIENT_CREDENTIALS"


def test_requests_match_installed_botocore_operation_models() -> None:
    import boto3
    from botocore.validate import validate_parameters

    cfg = config()
    client = boto3.client("bedrock-agentcore-control", region_name=cfg.region)
    validate_parameters(gateway._gateway_request(cfg), client.meta.service_model.operation_model("CreateGateway").input_shape)
    for name, endpoint in (("travella-research-mcp", cfg.research_endpoint), ("travella-map-mcp", cfg.map_endpoint)):
        request = gateway._target_request(cfg, name, endpoint)
        request_with_id = {"gatewayIdentifier": "gw-1", **request}
        validate_parameters(request_with_id, client.meta.service_model.operation_model("CreateGatewayTarget").input_shape)


def test_second_run_converges_and_updates_changed_endpoint() -> None:
    first = config()
    client = FakeControlPlane(first)
    gateway.provision(first, client=client, verify_catalog=False)
    changed = config(research_endpoint="https://research-v2.internal.example/mcp")
    gateway.provision(changed, client=client, verify_catalog=False)
    updates = [args for name, args in client.calls if name == "update_gateway_target"]
    assert len(updates) == 1
    assert updates[0]["name"] == "travella-research-mcp"
    assert updates[0]["targetConfiguration"]["mcp"]["mcpServer"]["endpoint"] == changed.research_endpoint


def test_oauth_verifier_mismatch_is_rejected(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("MCP_GATEWAY_OAUTH_SCOPE", "different.scope")
    with pytest.raises(gateway.ProvisioningError, match="MCP_GATEWAY_OAUTH_SCOPE"):
        gateway.validate_config(config())


def test_missing_configuration_is_reported_without_aws_mutation(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("AGENTCORE_GATEWAY_ROLE_ARN", raising=False)
    with pytest.raises(gateway.ProvisioningError, match="AGENTCORE_GATEWAY_ROLE_ARN"):
        gateway.GatewayConfig.from_env()


def test_partial_control_plane_failure_is_sanitized(monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]) -> None:
    class FailingClient(FakeControlPlane):
        def create_gateway(self, **kwargs: object) -> dict:
            raise RuntimeError("provider secret should never be printed")

    cfg = config()
    client = FailingClient(cfg)
    with pytest.raises(RuntimeError):
        gateway.provision(cfg, client=client, verify_catalog=False)
    monkeypatch.setenv("AGENTCORE_GATEWAY_ROLE_ARN", cfg.role_arn)
    assert "provider secret" not in capsys.readouterr().err


def test_interceptor_lambda_returns_documented_short_circuit_for_bad_event() -> None:
    from services.mcps.gateway_interceptor import lambda_handler

    response = lambda_handler({"interceptorInputVersion": "unsupported"})
    assert response["interceptorOutputVersion"] == "1.0"
    transformed = response["mcp"]["transformedGatewayResponse"]
    assert transformed["statusCode"] == 403
    assert "error" in transformed["body"]
