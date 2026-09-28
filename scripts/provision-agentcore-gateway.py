#!/usr/bin/env python3
"""Provision or reconcile the Travella AgentCore MCP Gateway.

``--dry-run`` is safe offline and prints a redacted contract.  Live creation
requires AWS credentials and is deliberately explicit.
"""

from __future__ import annotations

import argparse
import json
import os
from typing import Any


def gateway_contract() -> dict[str, Any]:
    region = os.getenv("AWS_REGION", "eu-north-1")
    gateway_name = os.getenv("AGENTCORE_GATEWAY_NAME", "travella-mcp-gateway")
    return {
        "name": gateway_name,
        "region": region,
        "protocol": "MCP",
        "authorizer": {"type": "COGNITO_JWT", "user_pool_id": "<configured-at-deploy-time>", "client_id": "<configured-at-deploy-time>"},
        "interceptor": {"type": "REQUEST", "module": "services.mcps.gateway_interceptor", "pass_request_headers": ["Authorization"]},
        "targets": [
            {"name": "travella-research-mcp", "type": "MCP_SERVER", "endpoint": os.getenv("RESEARCH_MCP_ENDPOINT", "https://<private-host>/research/mcp"), "outbound_auth": "OAUTH2_CLIENT_CREDENTIALS"},
            {"name": "travella-map-mcp", "type": "MCP_SERVER", "endpoint": os.getenv("MAP_MCP_ENDPOINT", "https://<private-host>/map/mcp"), "outbound_auth": "OAUTH2_CLIENT_CREDENTIALS"},
        ],
        "tool_catalog": {"visibility": "DEFAULT", "synchronize_targets": True},
    }


def provision(contract: dict[str, Any]) -> dict[str, Any]:
    import boto3

    client = boto3.client("bedrock-agentcore-control", region_name=contract["region"])
    # Keep live API calls isolated here so dry-run remains dependency-light.
    existing = client.list_gateways().get("items", [])
    gateway = next((item for item in existing if item.get("name") == contract["name"]), None)
    if gateway:
        gateway_id = gateway.get("gatewayId") or gateway.get("id")
    else:
        response = client.create_gateway(name=contract["name"], protocolType="MCP")
        gateway_id = response.get("gatewayId") or response.get("id")
    return {"gateway_id": gateway_id, "contract": contract, "action": "reconcile targets with AgentCore MCP_SERVER target API"}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    contract = gateway_contract()
    if args.dry_run:
        print(json.dumps({"dry_run": True, "contract": contract}, indent=2, sort_keys=True))
        return
    print(json.dumps(provision(contract), indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
