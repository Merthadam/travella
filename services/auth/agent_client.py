"""Narrow server-to-server adapter for the plan-scoped agent API."""

import re
from uuid import UUID

import httpx
from fastapi import HTTPException
from pydantic import ValidationError

from services.agent.http_contracts import AgentResponse


class AgentClient:
    def __init__(self, base_url: str, *, transport=None):
        self.base_url = base_url.rstrip("/")
        self.transport = transport

    def turn(self, path: str, *, token: str, body: bytes) -> tuple[int, dict]:
        match = re.fullmatch(r"/v1/agent/plans/([0-9a-fA-F-]{36})/events", path)
        if not match:
            raise HTTPException(404, "Copilot is unavailable.")
        try:
            plan_id = UUID(match.group(1))
        except ValueError:
            raise HTTPException(404, "Copilot is unavailable.") from None

        try:
            with httpx.Client(
                base_url=self.base_url,
                timeout=120,
                follow_redirects=False,
                transport=self.transport,
                trust_env=False,
            ) as client:
                response = client.post(
                    path,
                    headers={
                        "Authorization": f"Bearer {token}",
                        "Content-Type": "application/json",
                    },
                    content=body,
                )
            if response.status_code != 200:
                return self._safe_error(response.status_code)
            result = AgentResponse.model_validate(response.json())
            if result.plan_id != plan_id:
                return 503, {"message": "Copilot returned an invalid response."}
            return 200, result.model_dump(mode="json")
        except (httpx.HTTPError, ValueError, TypeError, AttributeError, ValidationError):
            return 503, {"message": "Copilot is temporarily unavailable. Try again."}

    @staticmethod
    def _safe_error(status_code: int) -> tuple[int, dict]:
        if status_code == 404:
            return 404, {"message": "This plan is unavailable."}
        if status_code == 422:
            return 422, {"message": "Check your message and try again."}
        if status_code in {401, 403}:
            return 403, {"message": "Copilot access is not enabled for this account."}
        return 503, {"message": "Copilot is temporarily unavailable. Try again."}
