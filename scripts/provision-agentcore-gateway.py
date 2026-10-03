#!/usr/bin/env python3
"""Create and reconcile Travella's private AgentCore MCP Gateway."""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
from dataclasses import dataclass
from typing import Any, Mapping
from urllib.parse import urlparse


class ProvisioningError(RuntimeError):
    """An operator-actionable provisioning error safe to print."""


@dataclass(frozen=True)
class GatewayConfig:
    region: str
    name: str
    role_arn: str
    cognito_issuer: str
    cognito_discovery_url: str
    cognito_client_id: str
    cognito_audience: str
    cognito_scope: str
    interceptor_lambda_arn: str
    oauth_provider_arn: str
    oauth_issuer: str
    oauth_audience: str
    oauth_client_id: str
    oauth_scope: str
    research_endpoint: str
    map_endpoint: str
    protocol_version: str = "2025-03-26"
    gateway_id: str | None = None
    gateway_url: str | None = None
    gateway_access_token: str | None = None

    @classmethod
    def from_env(cls) -> "GatewayConfig":
        def value(name: str, default: str | None = None) -> str:
            raw = os.getenv(name, default)
            if raw is None or not raw.strip():
                raise ProvisioningError(f"missing required configuration: {name}")
            return raw.strip()

        return cls(
            region=value("AWS_REGION", "eu-north-1"),
            name=value("AGENTCORE_GATEWAY_NAME", "travella-mcp-gateway"),
            role_arn=value("AGENTCORE_GATEWAY_ROLE_ARN"),
            cognito_issuer=value("COGNITO_ISSUER"),
            cognito_discovery_url=value("COGNITO_DISCOVERY_URL"),
            cognito_client_id=value("COGNITO_CLIENT_ID"),
            cognito_audience=value("COGNITO_AUDIENCE"),
            cognito_scope=value("COGNITO_REQUIRED_SCOPE", "aws.cognito.signin.user.admin"),
            interceptor_lambda_arn=value("AGENTCORE_INTERCEPTOR_LAMBDA_ARN"),
            oauth_provider_arn=value("AGENTCORE_OAUTH_PROVIDER_ARN"),
            oauth_issuer=_required_value(
                "AGENTCORE_OAUTH_ISSUER",
                os.getenv("AGENTCORE_OAUTH_ISSUER") or os.getenv("MCP_GATEWAY_OAUTH_ISSUER"),
            ),
            oauth_audience=_required_value(
                "AGENTCORE_OAUTH_AUDIENCE",
                os.getenv("AGENTCORE_OAUTH_AUDIENCE") or os.getenv("MCP_GATEWAY_OAUTH_AUDIENCE"),
            ),
            oauth_client_id=_required_value(
                "AGENTCORE_OAUTH_CLIENT_ID",
                os.getenv("AGENTCORE_OAUTH_CLIENT_ID") or os.getenv("MCP_GATEWAY_OAUTH_CLIENT_ID"),
            ),
            oauth_scope=_required_value(
                "AGENTCORE_OAUTH_SCOPE",
                os.getenv("AGENTCORE_OAUTH_SCOPE") or os.getenv("MCP_GATEWAY_OAUTH_SCOPE"),
            ),
            research_endpoint=value("RESEARCH_MCP_ENDPOINT"),
            map_endpoint=value("MAP_MCP_ENDPOINT"),
            protocol_version=value("AGENTCORE_MCP_PROTOCOL_VERSION", "2025-03-26"),
            gateway_id=os.getenv("AGENTCORE_GATEWAY_ID") or None,
            gateway_url=os.getenv("AGENTCORE_GATEWAY_URL") or None,
            gateway_access_token=os.getenv("AGENTCORE_GATEWAY_ACCESS_TOKEN") or None,
        )


def _required_value(name: str, raw: str | None) -> str:
    if raw is None or not raw.strip():
        raise ProvisioningError(f"missing required configuration: {name}")
    return raw.strip()


def _https_url(name: str, value: str) -> None:
    parsed = urlparse(value)
    if parsed.scheme != "https" or not parsed.netloc:
        raise ProvisioningError(f"{name} must be an HTTPS URL")


def validate_config(config: GatewayConfig) -> None:
    _https_url("COGNITO_ISSUER", config.cognito_issuer)
    _https_url("COGNITO_DISCOVERY_URL", config.cognito_discovery_url)
    _https_url("AGENTCORE_OAUTH_ISSUER", config.oauth_issuer)
    _https_url("RESEARCH_MCP_ENDPOINT", config.research_endpoint)
    _https_url("MAP_MCP_ENDPOINT", config.map_endpoint)
    if config.gateway_url:
        _https_url("AGENTCORE_GATEWAY_URL", config.gateway_url)
    for name, value in (
        ("MCP_GATEWAY_OAUTH_ISSUER", os.getenv("MCP_GATEWAY_OAUTH_ISSUER")),
        ("MCP_GATEWAY_OAUTH_AUDIENCE", os.getenv("MCP_GATEWAY_OAUTH_AUDIENCE")),
        ("MCP_GATEWAY_OAUTH_CLIENT_ID", os.getenv("MCP_GATEWAY_OAUTH_CLIENT_ID")),
        ("MCP_GATEWAY_OAUTH_SCOPE", os.getenv("MCP_GATEWAY_OAUTH_SCOPE")),
    ):
        if (
            value
            and value.strip()
            and value.strip()
            != {
                "MCP_GATEWAY_OAUTH_ISSUER": config.oauth_issuer,
                "MCP_GATEWAY_OAUTH_AUDIENCE": config.oauth_audience,
                "MCP_GATEWAY_OAUTH_CLIENT_ID": config.oauth_client_id,
                "MCP_GATEWAY_OAUTH_SCOPE": config.oauth_scope,
            }[name]
        ):
            raise ProvisioningError(f"outbound OAuth configuration does not match {name}")


def _target_contract(config: GatewayConfig, name: str, endpoint: str) -> dict[str, Any]:
    return {
        "name": name,
        "type": "MCP_SERVER",
        "endpoint": endpoint,
        "listingMode": "DYNAMIC",
        "credentialProviderType": "OAUTH",
        "credentialProviderArn": config.oauth_provider_arn,
        "oauthGrantType": "CLIENT_CREDENTIALS",
        "oauthScopes": [config.oauth_scope],
    }


def gateway_contract(config: GatewayConfig) -> dict[str, Any]:
    """Return a redacted desired-state contract for dry-run output."""
    return {
        "name": config.name,
        "region": config.region,
        "protocolType": "MCP",
        "roleArn": config.role_arn,
        "authorizerType": "CUSTOM_JWT",
        "authorizerConfiguration": {
            "customJWTAuthorizer": {
                "discoveryUrl": config.cognito_discovery_url,
                "allowedAudience": [config.cognito_audience],
                "allowedClients": [config.cognito_client_id],
                "allowedScopes": [config.cognito_scope],
            }
        },
        "interceptorConfigurations": [
            {
                "interceptor": {"lambda": {"arn": config.interceptor_lambda_arn}},
                "interceptionPoints": ["REQUEST"],
                "inputConfiguration": {"passRequestHeaders": True},
            }
        ],
        "targets": [
            _target_contract(config, "travella-research-mcp", config.research_endpoint),
            _target_contract(config, "travella-map-mcp", config.map_endpoint),
        ],
    }


def _gateway_request(config: GatewayConfig) -> dict[str, Any]:
    desired = gateway_contract(config)
    return {
        "name": desired["name"],
        "roleArn": desired["roleArn"],
        "protocolType": "MCP",
        "protocolConfiguration": {"mcp": {"supportedVersions": [config.protocol_version]}},
        "authorizerType": desired["authorizerType"],
        "authorizerConfiguration": desired["authorizerConfiguration"],
        "interceptorConfigurations": desired["interceptorConfigurations"],
    }


def _target_request(config: GatewayConfig, name: str, endpoint: str) -> dict[str, Any]:
    return {
        "name": name,
        "targetConfiguration": {
            "mcp": {
                "mcpServer": {
                    "endpoint": endpoint,
                    "listingMode": "DYNAMIC",
                }
            }
        },
        "credentialProviderConfigurations": [
            {
                "credentialProviderType": "OAUTH",
                "credentialProvider": {
                    "oauthCredentialProvider": {
                        "providerArn": config.oauth_provider_arn,
                        "scopes": [config.oauth_scope],
                        "grantType": "CLIENT_CREDENTIALS",
                    }
                },
            }
        ],
    }


def _items(client: Any, operation: str, **kwargs: Any) -> list[dict[str, Any]]:
    items: list[dict[str, Any]] = []
    token: str | None = None
    while True:
        request = dict(kwargs)
        if token:
            request["nextToken"] = token
        response = getattr(client, operation)(**request)
        items.extend(response.get("items", []))
        token = response.get("nextToken")
        if not token:
            return items


def _gateway_matches(actual: Mapping[str, Any], desired: Mapping[str, Any]) -> bool:
    return all(
        actual.get(key) == desired[key]
        for key in (
            "name",
            "roleArn",
            "protocolType",
            "authorizerType",
            "authorizerConfiguration",
            "interceptorConfigurations",
        )
    )


def _target_matches(actual: Mapping[str, Any], desired: Mapping[str, Any]) -> bool:
    return (
        actual.get("name") == desired["name"]
        and actual.get("targetConfiguration") == desired["targetConfiguration"]
        and actual.get("credentialProviderConfigurations")
        == desired["credentialProviderConfigurations"]
    )


def _status_ok(status: Any) -> bool:
    return str(status or "").upper() in {
        "ACTIVE",
        "AVAILABLE",
        "READY",
        "SYNCHRONIZED",
        "SYNCHRONIZED_WITH_WARNINGS",
    }


def _require_id(response: Mapping[str, Any], key: str) -> str:
    value = response.get(key)
    if not value:
        raise ProvisioningError(f"AWS response omitted required {key}")
    return str(value)


def _describe_gateway(client: Any, gateway_id: str, desired: Mapping[str, Any]) -> dict[str, Any]:
    for attempt in range(12):
        described = client.get_gateway(gatewayIdentifier=gateway_id)
        if not _gateway_matches(described, desired):
            raise ProvisioningError(
                "Gateway describe does not match the requested authorizer/interceptor contract"
            )
        if _status_ok(described.get("status")):
            return described
        status = str(described.get("status", "unknown")).upper()
        if status in {"CREATING", "UPDATING", "DELETING"} and attempt < 11:
            time.sleep(1)
            continue
        raise ProvisioningError(
            f"Gateway is not ready (status={described.get('status', 'unknown')})"
        )
    raise ProvisioningError("Gateway describe did not reach a ready state")


def _catalog_check(config: GatewayConfig) -> dict[str, Any]:
    if not config.gateway_url or not config.gateway_access_token:
        raise ProvisioningError(
            "AGENTCORE_GATEWAY_URL and AGENTCORE_GATEWAY_ACCESS_TOKEN are required for catalog verification"
        )
    import httpx

    endpoint = config.gateway_url.rstrip("/")
    if not endpoint.endswith("/mcp"):
        endpoint += "/mcp"
    headers = {
        "Authorization": f"Bearer {config.gateway_access_token}",
        "Content-Type": "application/json",
        "Accept": "application/json, text/event-stream",
    }
    with httpx.Client(timeout=20.0) as http:
        for request_id, method, params in (
            (
                1,
                "initialize",
                {
                    "protocolVersion": config.protocol_version,
                    "capabilities": {},
                    "clientInfo": {"name": "travella-provisioner", "version": "1"},
                },
            ),
            (2, "tools/list", {}),
        ):
            response = http.post(
                endpoint,
                headers=headers,
                json={"jsonrpc": "2.0", "id": request_id, "method": method, "params": params},
            )
            if response.status_code >= 400:
                raise ProvisioningError(
                    f"Gateway catalog request failed with HTTP {response.status_code}"
                )
            data = response.json()
            if data.get("error"):
                raise ProvisioningError("Gateway catalog returned an MCP error")
            if method == "tools/list":
                tools = data.get("result", {}).get("tools")
                if not isinstance(tools, list):
                    raise ProvisioningError("Gateway tools/list response omitted tools")
                names = {tool.get("name") for tool in tools if isinstance(tool, Mapping)}
                expected = {
                    "research_destination_candidates",
                    "get_candidate_sources",
                    "resolve_candidate_locations",
                    "get_candidate_map_projection",
                }
                missing = expected - names
                if missing:
                    raise ProvisioningError("Gateway catalog is missing expected tools")
                return {"status": "verified", "tool_count": len(names), "tools": sorted(names)}
    raise ProvisioningError("Gateway catalog verification did not complete")


def provision(
    config: GatewayConfig, *, client: Any = None, verify_catalog: bool = True
) -> dict[str, Any]:
    validate_config(config)
    if client is None:
        import boto3

        client = boto3.client("bedrock-agentcore-control", region_name=config.region)
    gateway_payload = _gateway_request(config)
    gateways = _items(client, "list_gateways", maxResults=100)
    existing = next((item for item in gateways if item.get("name") == config.name), None)
    if (
        config.gateway_id
        and existing
        and existing.get("gatewayId") not in {None, config.gateway_id}
    ):
        raise ProvisioningError("AGENTCORE_GATEWAY_ID does not match the named Gateway")
    if existing:
        gateway_id = str(existing.get("gatewayId") or existing.get("id") or "")
        if not gateway_id:
            raise ProvisioningError("existing Gateway omitted its identifier")
        described = client.get_gateway(gatewayIdentifier=gateway_id)
        if not _gateway_matches(described, gateway_payload):
            client.update_gateway(gatewayIdentifier=gateway_id, **gateway_payload)
    else:
        response = client.create_gateway(**gateway_payload)
        gateway_id = _require_id(response, "gatewayId")
    gateway = _describe_gateway(client, gateway_id, gateway_payload)

    desired_targets = {
        "travella-research-mcp": config.research_endpoint,
        "travella-map-mcp": config.map_endpoint,
    }
    targets = _items(client, "list_gateway_targets", gatewayIdentifier=gateway_id, maxResults=100)
    target_ids: dict[str, str] = {}
    for name, endpoint in desired_targets.items():
        desired = _target_request(config, name, endpoint)
        existing_target = next((item for item in targets if item.get("name") == name), None)
        if existing_target:
            target_id = str(existing_target.get("targetId") or "")
            if not target_id:
                raise ProvisioningError(f"existing target {name} omitted its identifier")
            current = client.get_gateway_target(gatewayIdentifier=gateway_id, targetId=target_id)
            if not _target_matches(current, desired):
                client.update_gateway_target(
                    gatewayIdentifier=gateway_id, targetId=target_id, **desired
                )
        else:
            response = client.create_gateway_target(gatewayIdentifier=gateway_id, **desired)
            target_id = _require_id(response, "targetId")
        target_ids[name] = target_id

    sync_response = client.synchronize_gateway_targets(
        gatewayIdentifier=gateway_id, targetIdList=list(target_ids.values())
    )
    if not sync_response.get("targets"):
        raise ProvisioningError("AWS did not return synchronized targets")
    described_targets: dict[str, dict[str, Any]] = {}
    for name, target_id in target_ids.items():
        for attempt in range(12):
            target = client.get_gateway_target(gatewayIdentifier=gateway_id, targetId=target_id)
            if not _target_matches(target, _target_request(config, name, desired_targets[name])):
                raise ProvisioningError(
                    f"target {name} describe does not match endpoint/auth configuration"
                )
            if _status_ok(target.get("status")):
                break
            status = str(target.get("status", "unknown")).upper()
            if status in {"CREATING", "UPDATING", "SYNCHRONIZING", "SYNCING"} and attempt < 11:
                time.sleep(1)
                continue
            raise ProvisioningError(
                f"target {name} is not ready (status={target.get('status', 'unknown')})"
            )
        else:
            raise ProvisioningError(f"target {name} did not reach a ready state")
        described_targets[name] = {"target_id": target_id, "status": target.get("status")}
    catalog = (
        _catalog_check(config)
        if verify_catalog
        else {"status": "skipped", "reason": "offline control-plane verification"}
    )
    return {
        "status": "verified",
        "gateway_id": gateway_id,
        "gateway_status": gateway.get("status"),
        "targets": described_targets,
        "catalog": catalog,
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="validate and print desired state without contacting AWS",
    )
    args = parser.parse_args(argv)
    try:
        config = GatewayConfig.from_env()
        validate_config(config)
        if args.dry_run:
            print(
                json.dumps(
                    {"dry_run": True, "contract": gateway_contract(config)},
                    indent=2,
                    sort_keys=True,
                )
            )
            return 0
        print(json.dumps(provision(config), indent=2, sort_keys=True))
        return 0
    except ProvisioningError as exc:
        print(f"provisioning failed: {exc}", file=sys.stderr)
        return 2
    except Exception as exc:
        print(
            f"provisioning failed: AWS control-plane operation was unsuccessful ({type(exc).__name__})",
            file=sys.stderr,
        )
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
