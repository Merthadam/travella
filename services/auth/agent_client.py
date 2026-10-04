"""Narrow server-to-server adapter for the plan-scoped agent API."""

import json
import re
from uuid import UUID

import httpx
from fastapi import HTTPException
from pydantic import ValidationError

from services.agent.http_contracts import AgentResponse, OnboardingRequest, OnboardingResponse


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

    def onboarding(self, *, token: str, body: bytes) -> tuple[int, dict]:
        try:
            request = OnboardingRequest.model_validate_json(body)
            with httpx.Client(
                base_url=self.base_url,
                timeout=45,
                follow_redirects=False,
                transport=self.transport,
                trust_env=False,
            ) as client:
                response = client.post(
                    "/v1/agent/onboarding/events",
                    headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
                    json=request.model_dump(mode="json"),
                )
            if response.status_code != 200:
                return self._safe_error(response.status_code)
            result = OnboardingResponse.model_validate(response.json())
            return 200, result.model_dump(mode="json")
        except (httpx.HTTPError, ValueError, TypeError, AttributeError, ValidationError):
            return 503, {"message": "Onboarding is temporarily unavailable. Try again."}

    async def stream(self, path: str, *, token: str, body: bytes):
        match = re.fullmatch(r"/v1/agent/plans/([0-9a-fA-F-]{36})/events/stream", path)
        if not match:
            yield self._sse({"type": "TERMINAL", "status": "error", "message": "Copilot is unavailable."})
            return
        try:
            UUID(match.group(1))
            async with httpx.AsyncClient(
                base_url=self.base_url,
                timeout=httpx.Timeout(120, connect=10, read=None),
                follow_redirects=False,
                transport=self.transport,
                trust_env=False,
            ) as client:
                async with client.stream(
                    "POST",
                    path,
                    headers={
                        "Authorization": f"Bearer {token}",
                        "Content-Type": "application/json",
                        "Accept": "text/event-stream",
                    },
                    content=body,
                ) as response:
                    if response.status_code != 200:
                        yield self._sse({"type": "TERMINAL", "status": "error", "message": self._safe_error(response.status_code)[1]["message"]})
                        return
                    async for chunk in response.aiter_bytes():
                        yield chunk
        except (httpx.HTTPError, ValueError, TypeError, AttributeError):
            yield self._sse({"type": "TERMINAL", "status": "error", "message": "Copilot is temporarily unavailable. Try again."})

    def cancel(self, path: str, *, token: str) -> tuple[int, dict]:
        match = re.fullmatch(r"/v1/agent/plans/([0-9a-fA-F-]{36})/events/([^/]+)/cancel", path)
        if not match:
            raise HTTPException(404, "Copilot is unavailable.")
        try:
            UUID(match.group(1))
            with httpx.Client(
                base_url=self.base_url,
                timeout=10,
                follow_redirects=False,
                transport=self.transport,
                trust_env=False,
            ) as client:
                response = client.post(
                    path,
                    headers={"Authorization": f"Bearer {token}"},
                )
            if response.status_code != 200:
                return self._safe_error(response.status_code)
            data = response.json()
            if not isinstance(data, dict) or not isinstance(data.get("cancelled"), bool):
                return 503, {"message": "Copilot is temporarily unavailable. Try again."}
            return 200, data
        except (httpx.HTTPError, ValueError, TypeError, AttributeError):
            return 503, {"message": "Copilot is temporarily unavailable. Try again."}

    @staticmethod
    def _sse(payload: dict) -> str:
        return f"data: {json.dumps(payload, separators=(',', ':'))}\n\n"

    @staticmethod
    def _safe_error(status_code: int) -> tuple[int, dict]:
        if status_code == 404:
            return 404, {"message": "This plan is unavailable."}
        if status_code == 422:
            return 422, {"message": "Check your message and try again."}
        if status_code in {401, 403}:
            return 403, {"message": "Copilot access is not enabled for this account."}
        return 503, {"message": "Copilot is temporarily unavailable. Try again."}
