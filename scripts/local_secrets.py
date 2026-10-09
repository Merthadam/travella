#!/usr/bin/env python3
"""Share local application configuration via Secrets Manager, never printing values."""

from __future__ import annotations

import argparse
import getpass
import io
import json
import os
import sys
import tempfile
from pathlib import Path

import boto3
from botocore.config import Config
from botocore.exceptions import BotoCoreError, ClientError
from dotenv import dotenv_values
from dotenv.parser import parse_stream

ROOT_KEYS = frozenset(
    {
        "AWS_REGION",
        "COGNITO_USER_POOL_ID",
        "COGNITO_APP_CLIENT_ID",
        "COGNITO_ISSUER",
        "COGNITO_JWKS_URL",
        "SESSION_ENCRYPTION_KEY",
        "POSTGRES_PASSWORD",
        "ANTHROPIC_API_KEY",
        "ANTHROPIC_MODEL",
        "ANTHROPIC_API_KEY_SECRET_ARN",
        "AGENT_RESEARCH_MODEL",
        "AGENT_RESEARCH_MAX_TURNS",
        "AGENT_RESEARCH_TIMEOUT_SECONDS",
        "AGENT_RESEARCH_MAX_BUDGET_USD",
        "AGENT_RESEARCH_MAX_SEARCHES",
        "AGENT_RESEARCH_MAX_FETCHES",
        "AGENTCORE_MEMORY_ID",
        "AGENTCORE_MEMORY_NAMESPACE_TEMPLATE",
    }
)
MCP_KEYS = frozenset({"TAVILY_API_KEY", "GOOGLE_MAPS_SERVER_API_KEY", "LITE_API_KEY"})
FRONTEND_KEYS = frozenset({"VITE_GOOGLE_MAPS_API_KEY"})
ALLOWED_KEYS = ROOT_KEYS | MCP_KEYS | FRONTEND_KEYS
# Read old shared secrets without distributing retired model credentials/settings.
# Remote secret entries remain untouched for other checkouts until explicitly removed.
RETIRED_KEYS = frozenset({"OPENAI_API_KEY", "OPENAI_MODEL_ID", "AGENT_MODEL_PROVIDER",
                          "AGENT_RESEARCH_BACKEND", "BEDROCK_REGION", "BEDROCK_MODEL_ID"})
DESTINATIONS = {
    ".env": ROOT_KEYS,
    "services/mcps/.env": MCP_KEYS,
    "frontend/.env.local": FRONTEND_KEYS,
}
DEFAULT_SECRET = "travella/local-development"


class SetupError(Exception):
    """A safe, value-free message suitable for terminal output."""


def validate(values: object) -> dict[str, str]:
    if not isinstance(values, dict) or set(values) - (ALLOWED_KEYS | RETIRED_KEYS):
        raise SetupError("Secret must be a JSON object containing only supported setting names.")
    if any(not isinstance(v, str) or any(c in v for c in "\n\r\0") for v in values.values()):
        raise SetupError("Secret values must be single-line strings.")
    return values


def read_secret(client, secret_id: str) -> dict[str, str] | None:
    try:
        result = client.get_secret_value(SecretId=secret_id)
    except client.exceptions.ResourceNotFoundException:
        return None
    try:
        return validate(json.loads(result["SecretString"]))
    except (KeyError, ValueError, TypeError):
        raise SetupError("Secret must contain a JSON object in SecretString.") from None


def read_env(path: Path) -> dict[str, str]:
    if not path.exists():
        return {}
    if path.is_dir():
        if any(path.iterdir()):
            raise SetupError("An env path is a nonempty directory; it must be repaired manually.")
        # Docker creates an empty directory when a missing file is bind-mounted.
        return {}
    text = path.read_text()
    if any(binding.error for binding in parse_stream(io.StringIO(text))):
        raise SetupError("An env file could not be parsed; repair it before syncing.")
    return dict(dotenv_values(stream=io.StringIO(text), interpolate=False))


def collect(roots: list[Path]) -> dict[str, str]:
    """Current checkout wins; additional checkouts only fill missing settings."""
    result = {}
    for root in roots:
        for relative in (".env", "services/.env", "services/mcps/.env", "frontend/.env.local"):
            if not (root / relative).is_file():
                continue
            for key, value in read_env(root / relative).items():
                if key in ALLOWED_KEYS and value:
                    result.setdefault(key, value)
    return validate(result)


def write_env(path: Path, managed: frozenset[str], values: dict[str, str]) -> None:
    if path.is_symlink():
        raise SetupError("Refusing to replace a symlinked env file.")
    if path.is_dir():
        path.rmdir()  # Only empty directories; never remove contained data.
    original = path.read_text() if path.exists() else ""
    bindings = list(parse_stream(io.StringIO(original)))
    if any(binding.error for binding in bindings):
        raise SetupError("An env file could not be parsed; repair it before syncing.")
    # Preserve comments and unrelated worktree settings verbatim, including multiline values.
    text = "".join(b.original.string for b in bindings if b.key not in managed)
    if text and not text.endswith("\n"):
        text += "\n"
    for key in sorted(managed):
        if key in values:
            # Single quotes keep dollar signs literal in both Compose and python-dotenv.
            escaped = values[key].replace("'", "\\'")
            text += f"{key}='{escaped}'\n"
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, temporary = tempfile.mkstemp(prefix=".env.sync-", dir=path.parent)
    try:
        with os.fdopen(fd, "w") as output:
            output.write(text)
        os.replace(temporary, path)
    finally:
        Path(temporary).unlink(missing_ok=True)


def pull(root: Path, values: dict[str, str]) -> None:
    validate(values)
    # Validate all destinations before writing any of them.
    for relative in DESTINATIONS:
        path = root / relative
        if path.is_symlink():
            raise SetupError("Refusing to replace a symlinked env file.")
        read_env(path)
    for relative, keys in DESTINATIONS.items():
        # Remove misplaced shared keys (e.g. a backend key in frontend configuration).
        write_env(root / relative, ALLOWED_KEYS | RETIRED_KEYS, {k: v for k, v in values.items() if k in keys})


def run(args, client) -> None:
    values = read_secret(client, args.secret_id)
    if args.command == "bootstrap":
        imported = collect([args.root, *args.from_checkout])
        merged = {**imported, **(values or {})}  # Never replace existing cloud settings here.
        if not merged:
            raise SetupError("No supported settings found. Add them once before bootstrapping.")
        if values is None:
            client.create_secret(
                Name=args.secret_id,
                SecretString=json.dumps(merged),
                Description="Shared Travella local development settings",
            )
        elif merged != values:
            client.put_secret_value(SecretId=args.secret_id, SecretString=json.dumps(merged))
        print("Shared development secret ready; existing cloud settings preserved.")
        return
    if values is None:
        raise SetupError("Shared secret is missing. Run local_secrets.py bootstrap first.")
    if args.command == "set":
        if not sys.stdin.isatty():
            raise SetupError("Run set in an interactive terminal for a hidden credential prompt.")
        value = getpass.getpass(f"New value for {args.key} (hidden): ")
        if not value:
            raise SetupError("Empty value rejected; shared secret unchanged.")
        values[args.key] = value
        validate(values)
        client.put_secret_value(SecretId=args.secret_id, SecretString=json.dumps(values))
        print("Shared setting updated. Restart local services to fetch it in each worktree.")
        return
    pull(args.root, values)
    print("Shared settings refreshed in ignored env files (owner read/write only).")
    required = {
        "COGNITO_USER_POOL_ID",
        "COGNITO_APP_CLIENT_ID",
        "COGNITO_ISSUER",
        "COGNITO_JWKS_URL",
        "SESSION_ENCRYPTION_KEY",
        "TAVILY_API_KEY",
        "GOOGLE_MAPS_SERVER_API_KEY",
        "VITE_GOOGLE_MAPS_API_KEY",
    }
    if not values.get("ANTHROPIC_API_KEY_SECRET_ARN"):
        required.add("ANTHROPIC_API_KEY")
    missing = sorted(k for k in required if not values.get(k))
    if missing:
        raise SetupError("Shared settings missing: " + ", ".join(missing))


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=["bootstrap", "pull", "set"])
    parser.add_argument("key", nargs="?", choices=sorted(ALLOWED_KEYS))
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument("--from-checkout", type=Path, action="append", default=[])
    parser.add_argument("--secret-id", default=os.getenv("TRAVELLA_SECRETS_ID", DEFAULT_SECRET))
    parser.add_argument("--region", default=os.getenv("TRAVELLA_SECRETS_REGION", "eu-north-1"))
    parser.add_argument("--profile", default=os.getenv("AWS_PROFILE"))
    args = parser.parse_args()
    if args.command == "set" and not args.key:
        parser.error("set requires a setting name")
    try:
        session = boto3.Session(profile_name=args.profile, region_name=args.region)
        client = session.client(
            "secretsmanager",
            config=Config(
                connect_timeout=5,
                read_timeout=15,
                retries={"mode": "standard", "total_max_attempts": 2},
            ),
        )
        run(args, client)
    except ClientError as error:
        print(
            "Secrets Manager request failed ("
            + error.response["Error"]["Code"]
            + "). Check AWS login, region, secret name, and permissions.",
            file=sys.stderr,
        )
        return 1
    except (BotoCoreError, OSError) as error:
        print(
            f"Unable to sync shared settings ({type(error).__name__}). "
            "Check AWS login/network and local file access.",
            file=sys.stderr,
        )
        return 1
    except SetupError as error:
        print(str(error), file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
