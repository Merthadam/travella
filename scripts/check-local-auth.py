#!/usr/bin/env python3
"""Check local account auth once, using the ignored example-account file."""

from __future__ import annotations

import json
import os
import time
from pathlib import Path
from urllib.parse import urlsplit

import httpx


def local_origin() -> str:
    origin = os.getenv(
        "TRAVELLA_LOCAL_ORIGIN",
        f"http://localhost:{os.getenv('TRAVELLA_FRONTEND_PORT', '5174')}",
    ).rstrip("/")
    parsed = urlsplit(origin)
    if (
        parsed.scheme != "http"
        or parsed.hostname not in {"localhost", "127.0.0.1"}
        or not parsed.port
        or parsed.path
        or parsed.query
        or parsed.fragment
        or parsed.username
        or parsed.password
    ):
        raise ValueError(
            "Local auth check requires an http://localhost:<port> or "
            "http://127.0.0.1:<port> origin."
        )
    return origin


def wait_for_auth(client: httpx.Client, timeout: int) -> bool:
    deadline = time.monotonic() + timeout
    while True:
        try:
            response = client.get("/health")
            if response.is_success:
                health = response.json()
                if health.get("auth_configured") is True:
                    return True
                print("Local auth is not configured; check Cognito settings in .env.")
                return False
        except (httpx.HTTPError, ValueError):
            pass
        if time.monotonic() >= deadline:
            print("Local auth did not become ready before the timeout.")
            return False
        time.sleep(2)


def main() -> int:
    try:
        origin = local_origin()
    except ValueError as error:
        print(error)
        return 2

    account_path = Path(
        os.getenv(
            "TRAVELLA_TEST_ACCOUNT_FILE",
            str(Path.home() / ".config" / "travella" / "test-account.json"),
        )
    ).expanduser()
    try:
        account = json.loads(account_path.read_text(encoding="utf-8"))
        email, password = account["email"], account["password"]
        if not isinstance(email, str) or not email or not isinstance(password, str) or not password:
            raise ValueError
    except (OSError, json.JSONDecodeError, KeyError, TypeError, ValueError):
        print(f"Example-account credentials are unavailable in {account_path}.")
        return 2

    try:
        wait_seconds = max(0, min(300, int(os.getenv("TRAVELLA_AUTH_WAIT_SECONDS", "90"))))
    except ValueError:
        print("TRAVELLA_AUTH_WAIT_SECONDS must be an integer from 0 to 300.")
        return 2

    headers = {"Origin": origin, "X-Travella-Request": "1"}
    with httpx.Client(
        base_url=origin,
        headers=headers,
        timeout=12,
        trust_env=False,
    ) as client:
        if not wait_for_auth(client, wait_seconds):
            return 1

        try:
            response = client.post("/auth/sign-in", json={"email": email, "password": password})
        except httpx.HTTPError as error:
            print(f"Local sign-in endpoint could not be reached ({type(error).__name__}).")
            return 1

        if not response.is_success:
            print(
                f"Example-account sign-in was rejected (HTTP {response.status_code}). "
                "No retry was attempted. Check the account file and Cognito state."
            )
            return 1

        try:
            state = response.json().get("state")
        except ValueError:
            state = None
        if state != "signed_in":
            client.post("/auth/sign-out", json={})
            print(
                "Example-account sign-in requires an interactive challenge; no retry was attempted."
            )
            return 1

        try:
            session = client.get("/auth/session")
        except httpx.HTTPError as error:
            session = None
            print(f"The authenticated session check could not be reached ({type(error).__name__}).")

        sign_out_ok = False
        try:
            signed_out = client.post("/auth/sign-out", json={})
            sign_out_ok = signed_out.is_success
        except httpx.HTTPError:
            pass

        if session is None or not session.is_success or not sign_out_ok:
            print("Local sign-in succeeded, but session verification or cleanup failed.")
            return 1

    try:
        session_state = session.json().get("state")
    except ValueError:
        session_state = None
    if session_state != "signed_in":
        print("Local sign-in returned a session that did not validate.")
        return 1

    print(
        "Local authentication is ready: sign-in, session check, and temporary sign-out succeeded."
    )
    print("The temporary check session was signed out; no credentials or tokens were displayed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
