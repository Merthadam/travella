"""Narrow server-to-server lifecycle adapter. Never forwards cookies or browser identity."""

import re
from uuid import UUID

import httpx
from fastapi import HTTPException
from pydantic import TypeAdapter, ValidationError

from services.crud.contracts import PROBLEMS
from services.crud.profile_schemas import ProfileOutput
from services.trip_context import ContextSnapshot, ContextSurface
from services.crud.schemas import (
    BriefMutationOutput,
    BriefOutput,
    ChallengeOutput,
    DestinationMutationOutput,
    DestinationOutput,
    PlanOutput,
    PlanPage,
)

SAFE_ERRORS = {code: message for code, (_, message) in PROBLEMS.items()} | {
    "not_found": "Plan unavailable.",
    "unauthenticated": "Sign-in required.",
    "request_pending": "Retry the same request.",
    "unavailable": "Plans are temporarily unavailable.",
}


class CrudClient:
    def __init__(self, base_url: str, *, transport=None):
        self.base_url = base_url
        self.transport = transport

    def cancel_research_run(self, plan_id: str, event_id: str, *, token: str) -> bool:
        """Release a durable lease when AgentCore terminates the worker session."""
        try:
            UUID(plan_id)
            with httpx.Client(base_url=self.base_url, timeout=10, follow_redirects=False,
                              transport=self.transport, trust_env=False) as client:
                response = client.post(f"/v1/plans/{plan_id}/research-context/run",
                                       headers={"Authorization": f"Bearer {token}"},
                                       json={"event_id": event_id, "action": "cancel"})
            return response.status_code == 200
        except (httpx.HTTPError, ValueError):
            return False

    def request(self, method: str, path: str, *, token: str, headers, params, body: bytes):
        if path == "/v1/traveler-profile":
            plan_id = action = destination_id = None
            allowed = {"GET", "PUT"}
            profile_route = True
        else:
            profile_route = False
            match = re.fullmatch(
            r"/v1/plans(?:/([0-9a-fA-F-]{36})(?:/(activity|title|restore|challenges|brief|research-context|destinations|conversation/messages)(?:/([0-9a-fA-F-]{36}))?)?)?",
            path,
            )
            if not match:
                raise HTTPException(404, "Plan unavailable.")
            plan_id, action, destination_id = match.groups()
            allowed = (
                {
                    None: {"GET", "DELETE"},
                    "activity": {"POST"},
                    "title": {"PATCH"},
                    "restore": {"POST"},
                    "challenges": {"POST"},
                    "brief": {"GET", "PATCH"},
                    "research-context": {"GET", "PATCH"},
                    "destinations": {"GET", "POST"},
                    "conversation/messages": {"GET"},
                }[action]
                if plan_id
                else {"GET", "POST"}
            )
        if plan_id:
            try:
                UUID(plan_id)
            except ValueError:
                raise HTTPException(404, "Plan unavailable.") from None
        if destination_id:
            try:
                UUID(destination_id)
            except ValueError:
                raise HTTPException(404, "Plan unavailable.") from None
        if destination_id and (action != "destinations" or method != "DELETE"):
            raise HTTPException(405, "Request method not supported.")
        if destination_id:
            allowed = {"DELETE"}
        if method not in allowed:
            raise HTTPException(405, "Request method not supported.")
        forwarded = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
        for name in ("idempotency-key", "if-match", "x-plan-challenge"):
            if name in headers:
                forwarded[name] = headers[name]
        query = {key: value for key, value in params.items() if key in {"view", "limit", "cursor"}}
        try:
            with httpx.Client(
                base_url=self.base_url,
                timeout=10,
                follow_redirects=False,
                transport=self.transport,
                trust_env=False,
            ) as client:
                response = client.request(
                    method, path, headers=forwarded, params=query, content=body
                )
            if response.status_code >= 400:
                data = response.json()
                code = data.get("code", "unavailable")
                code = code if code in SAFE_ERRORS else "unavailable"
                return response.status_code, {"code": code, "message": SAFE_ERRORS[code]}
            if response.status_code != 200:
                raise ValueError("Unexpected upstream status")
            schema = (
                (ContextSurface if method == "GET" else ContextSnapshot)
                if action == "research-context"
                else
                ProfileOutput
                if profile_route
                else
                ChallengeOutput
                if action == "challenges"
                else BriefOutput
                if action == "brief" and method == "GET"
                else BriefMutationOutput
                if action == "brief" and method == "PATCH"
                else TypeAdapter(list[DestinationOutput])
                if action == "destinations" and method == "GET" and not destination_id
                else TypeAdapter(list[dict])
                if action == "conversation/messages" and method == "GET"
                else DestinationOutput
                if action == "destinations" and method == "GET" and destination_id
                else DestinationMutationOutput
                if action == "destinations" and method == "POST"
                else dict
                if action == "destinations" and method == "DELETE"
                else PlanPage
                if method == "GET" and not plan_id
                else PlanOutput
            )
            if schema is dict:
                return 200, response.json()
            if isinstance(schema, TypeAdapter):
                return 200, schema.dump_python(schema.validate_python(response.json()), mode="json")
            return 200, schema.model_validate(response.json()).model_dump(mode="json")
        except (httpx.HTTPError, ValueError, TypeError, AttributeError, ValidationError):
            # A transport failure may follow a committed write. Preserve the request ID on retry.
            return 503, {"code": "unavailable", "message": "Plans are temporarily unavailable."}
