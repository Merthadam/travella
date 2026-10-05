"""Narrow server-to-server adapter for the plan-scoped agent API."""

import asyncio
import base64
import hashlib
import json
import re
import time
from urllib.parse import quote
from uuid import UUID

import boto3
import httpx
from botocore.exceptions import BotoCoreError, ClientError
from fastapi import HTTPException
from pydantic import ValidationError

from services.agent.http_contracts import (
    AgentRequest,
    AgentResponse,
    OnboardingRequest,
    OnboardingResponse,
)
from services.shared.traveler_profile import PROFILE_FIELDS


class AgentClient:
    def __init__(
        self,
        base_url: str,
        *,
        transport=None,
        runtime_arn: str | None = None,
        runtime_region: str | None = None,
    ):
        self.base_url = base_url.rstrip("/")
        self.transport = transport
        self.runtime_arn = runtime_arn.strip() if runtime_arn else None
        self.runtime_region = runtime_region.strip() if runtime_region else None

    def _runtime_url(self) -> str:
        if not self.runtime_arn or not self.runtime_region:
            raise ValueError("AgentCore Runtime configuration is incomplete")
        arn = quote(self.runtime_arn, safe="")
        return (
            f"https://bedrock-agentcore.{self.runtime_region}.amazonaws.com"
            f"/runtimes/{arn}/invocations?qualifier=DEFAULT"
        )

    @staticmethod
    def _runtime_session(token: str, scope: str) -> str:
        # The auth boundary has already verified this JWT. Read sub only to keep the
        # opaque Runtime session stable when Cognito rotates the access token.
        subject = token
        try:
            encoded = token.split(".")[1]
            claims = json.loads(base64.urlsafe_b64decode(encoded + "=" * (-len(encoded) % 4)))
            if isinstance(claims.get("sub"), str) and claims["sub"]:
                subject = claims["sub"]
        except (IndexError, ValueError, TypeError, json.JSONDecodeError):
            pass
        return hashlib.sha256(f"{subject}:{scope}".encode("utf-8")).hexdigest()

    def _runtime_headers(self, token: str, scope: str, *, accept: str = "application/json") -> dict[str, str]:
        return {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "Accept": accept,
            "X-Amzn-Bedrock-AgentCore-Runtime-Session-Id": self._runtime_session(token, scope),
        }

    def _runtime_call(self, operation: str, payload: dict, *, token: str, scope: str,
                      timeout: float = 120, attempts: int = 3):
        try:
            with httpx.Client(
                timeout=timeout,
                follow_redirects=False,
                transport=self.transport,
                trust_env=False,
            ) as client:
                for attempt in range(attempts):
                    response = client.post(
                        self._runtime_url(),
                        headers=self._runtime_headers(token, scope),
                        json={"operation": operation, "payload": payload},
                    )
                    if response.status_code != 409 or attempt == attempts - 1:
                        break
                    time.sleep(0.15 * (attempt + 1))
            if response.status_code != 200:
                return self._runtime_safe_error(response.status_code)
            value = response.json()
            if not isinstance(value, dict):
                return 503, {"message": "Copilot returned an invalid response."}
            return 200, value
        except (httpx.HTTPError, ValueError, TypeError, AttributeError):
            return 503, {"message": "Copilot is temporarily unavailable. Try again."}

    def turn(self, path: str, *, token: str, body: bytes) -> tuple[int, dict]:
        match = re.fullmatch(r"/v1/agent/plans/([0-9a-fA-F-]{36})/events", path)
        if not match:
            raise HTTPException(404, "Copilot is unavailable.")
        try:
            plan_id = UUID(match.group(1))
        except ValueError:
            raise HTTPException(404, "Copilot is unavailable.") from None

        if self.runtime_arn:
            try:
                request = AgentRequest.model_validate_json(body)
            except ValidationError:
                return 422, {"message": "Check your message and try again."}
            status, result = self._runtime_call(
                "turn",
                request.model_dump(mode="json"),
                token=token,
                scope=f"plan:{plan_id}",
            )
            if status != 200:
                return status, result
            try:
                response = AgentResponse.model_validate(result)
            except ValidationError:
                return 503, {"message": "Copilot returned an invalid response."}
            if response.plan_id != plan_id:
                return 503, {"message": "Copilot returned an invalid response."}
            return 200, response.model_dump(mode="json")

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
            if self.runtime_arn:
                status, result = self._runtime_call(
                    "onboarding",
                    request.model_dump(mode="json"),
                    token=token,
                    scope="onboarding",
                )
                if status != 200:
                    return status, result
                response = OnboardingResponse.model_validate(result)
                return 200, response.model_dump(mode="json")
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

    def sync_profile(self, *, token: str, profile: dict) -> str:
        """Mirror an already-saved CRUD profile; return only a safe status."""
        allowed = {
            key: profile.get(key)
            for key in (*PROFILE_FIELDS, "updated_at")
            if key in profile
        }
        if self.runtime_arn:
            status, response = self._runtime_call(
                "profile_sync", allowed, token=token, scope="traveler-profile", timeout=10, attempts=1
            )
            if status != 200:
                return "unavailable"
            status_value = response.get("status")
            return status_value if status_value in {"synced", "disabled"} else "unavailable"
        try:
            with httpx.Client(
                base_url=self.base_url,
                timeout=10,
                follow_redirects=False,
                transport=self.transport,
                trust_env=False,
            ) as client:
                response = client.put(
                    "/v1/agent/traveler-profile/memory",
                    headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
                    json=allowed,
                )
            if response.status_code != 200:
                return "unavailable"
            status = response.json().get("status")
            return status if status in {"synced", "disabled"} else "unavailable"
        except (httpx.HTTPError, ValueError, TypeError, AttributeError):
            return "unavailable"

    async def stream(self, path: str, *, token: str, body: bytes):
        match = re.fullmatch(r"/v1/agent/plans/([0-9a-fA-F-]{36})/events/stream", path)
        if not match:
            yield self._sse({"type": "TERMINAL", "status": "error", "message": "Copilot is unavailable."})
            return
        if self.runtime_arn:
            try:
                request = AgentRequest.model_validate_json(body)
                async with httpx.AsyncClient(
                    timeout=httpx.Timeout(120, connect=10, read=None),
                    follow_redirects=False,
                    trust_env=False,
                ) as client:
                    for attempt in range(3):
                        async with client.stream(
                            "POST",
                            self._runtime_url(),
                            headers=self._runtime_headers(
                                token, f"plan:{request.plan_id}", accept="text/event-stream"
                            ),
                            json={"operation": "stream", "payload": request.model_dump(mode="json")},
                        ) as response:
                            if response.status_code == 409 and attempt < 2:
                                await asyncio.sleep(0.15 * (attempt + 1))
                                continue
                            if response.status_code != 200:
                                yield self._sse({
                                    "type": "TERMINAL",
                                    "status": "error",
                                    "message": self._runtime_safe_error(response.status_code)[1]["message"],
                                })
                                return
                            async for chunk in response.aiter_bytes():
                                yield chunk
                            return
            except (httpx.HTTPError, ValueError, TypeError, AttributeError, ValidationError):
                yield self._sse({
                    "type": "TERMINAL",
                    "status": "error",
                    "message": "Copilot is temporarily unavailable. Try again.",
                })
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
            plan_id = UUID(match.group(1))
            if self.runtime_arn:
                try:
                    client = boto3.client("bedrock-agentcore", region_name=self.runtime_region)
                    client.stop_runtime_session(
                        agentRuntimeArn=self.runtime_arn,
                        runtimeSessionId=self._runtime_session(token, f"plan:{plan_id}"),
                        qualifier="DEFAULT",
                    )
                    return 200, {"cancelled": True}
                except ClientError as exc:
                    if exc.response.get("Error", {}).get("Code") == "ResourceNotFoundException":
                        return 200, {"cancelled": False}
                    return self._safe_error(503)
                except BotoCoreError:
                    return self._safe_error(503)
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

    @staticmethod
    def _runtime_safe_error(status_code: int) -> tuple[int, dict]:
        if status_code in {401, 403}:
            return 403, {"message": "Copilot access is not enabled for this account."}
        return 503, {"message": "Copilot is temporarily unavailable. Try again."}
