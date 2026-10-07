#!/usr/bin/env python3
"""Create ignored local-only MCP service credentials without printing them."""

from __future__ import annotations

import os
import secrets
from pathlib import Path


def main() -> int:
    path = Path(__file__).resolve().parents[1] / "services" / "mcps" / ".env.local-auth"
    path.parent.mkdir(parents=True, exist_ok=True)
    values = {
        "MCP_GATEWAY_OAUTH_ISSUER": "https://travella.local.invalid/mcp-auth",
        "MCP_GATEWAY_OAUTH_AUDIENCE": "travella-local-mcp",
        "MCP_GATEWAY_OAUTH_CLIENT_ID": "travella-local-agent",
        "MCP_GATEWAY_OAUTH_SCOPE": "travella.mcp",
        "MCP_GATEWAY_OAUTH_JWT_KEY": secrets.token_urlsafe(48),
        "MCP_ASSERTION_SIGNING_SECRET": secrets.token_urlsafe(48),
        "MCP_ASSERTION_AUDIENCE": "travella-mcp",
        "CANVAS_EVIDENCE_SIGNING_KEY": secrets.token_urlsafe(48),
    }
    content = "# Generated for local development. Ignored by Git and Docker builds.\n"
    content += "".join(f"{name}={value}\n" for name, value in values.items())

    try:
        descriptor = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    except FileExistsError:
        # Upgrade existing local setup without rotating credentials or canvas signatures.
        if path.is_symlink():
            raise RuntimeError("Local auth file must not be a symlink.")
        existing = path.read_text()
        if not any(line.startswith("CANVAS_EVIDENCE_SIGNING_KEY=") for line in existing.splitlines()):
            with path.open("a") as output:
                output.write("\nCANVAS_EVIDENCE_SIGNING_KEY=" + secrets.token_urlsafe(48) + "\n")
            os.chmod(path, 0o600)
        print("Local service credentials ready; existing values preserved.")
        return 0

    with os.fdopen(descriptor, "w", encoding="utf-8") as output:
        output.write(content)
    os.chmod(path, 0o600)
    print("Created ignored local MCP auth credentials.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
