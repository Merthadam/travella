"""Plan ownership is checked before every search; searches never mutate a Plan."""

import asyncio
import json
import time
from collections import defaultdict, deque
from uuid import UUID
from fastapi import APIRouter, Depends, Header, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import ValidationError
from .travel_client import TravelClient
from .travel_contracts import INPUTS, OUTPUTS, TravelInvocation

ERRORS = {
    "provider_timeout": (504, "The search took too long. Try again."),
    "provider_unavailable": (503, "Travel search is temporarily unavailable. Try again."),
    "provider_response_invalid": (502, "The provider returned an incomplete response. Try again."),
}


def register_travel_routes(app, identity_dependency, read_plan, client=None):
    client = client or TravelClient()
    attempts = defaultdict(deque)
    slots = asyncio.Semaphore(8)

    async def dispatch(invocation, identity, authorization):
        token = (authorization or "").removeprefix("Bearer ").strip()
        await read_plan(identity.subject, invocation.plan_id, token)
        try:
            criteria = (
                INPUTS[invocation.action]
                .model_validate(invocation.criteria)
                .model_dump(mode="json")
            )
        except (ValidationError, KeyError):
            return JSONResponse(
                {
                    "code": "invalid_search",
                    "message": "Check your search criteria and travel dates.",
                },
                status_code=422,
            )
        now = time.monotonic()
        for key in list(attempts):
            if not attempts[key] or attempts[key][-1] < now - 60:
                del attempts[key]
        if len(attempts) > 2000:
            return JSONResponse({"message": "Please try again shortly."}, status_code=429)
        queue = attempts[identity.subject]
        while queue and queue[0] < now - 60:
            queue.popleft()
        if len(queue) >= 45:
            return JSONResponse(
                {"message": "Please wait a minute before searching again."}, status_code=429
            )
        queue.append(now)
        try:
            async with asyncio.timeout(128):
                async with slots:
                    raw = await client.call(
                        "travel_search",
                        {"action": invocation.action, "criteria": criteria},
                        subject=identity.subject,
                        plan_id=str(invocation.plan_id),
                        authorization_token=authorization,
                    )
            if raw.get("status") == "unavailable":
                code = raw.get("code") if raw.get("code") in ERRORS else "provider_unavailable"
                status, message = ERRORS[code]
                return JSONResponse({"code": code, "message": message}, status_code=status)
            return OUTPUTS[invocation.action].model_validate(raw).model_dump(mode="json")
        except TimeoutError:
            return JSONResponse(
                {"code": "provider_timeout", "message": ERRORS["provider_timeout"][1]},
                status_code=504,
            )
        except Exception:
            return JSONResponse(
                {
                    "code": "provider_response_invalid",
                    "message": ERRORS["provider_response_invalid"][1],
                },
                status_code=502,
            )

    router = APIRouter(prefix="/v1/agent/plans/{plan_id}/travel")

    @router.api_route("/{action:path}", methods=["GET", "POST"])
    async def route(
        plan_id: UUID,
        action: str,
        request: Request,
        identity=Depends(identity_dependency),
        authorization: str | None = Header(default=None),
    ):
        if action not in INPUTS or (request.method == "POST") != (
            action in {"hotels/search", "flights/search"}
        ):
            raise HTTPException(404, "Search unavailable.")
        try:
            body = await request.body()
            if len(body) > 8192:
                raise ValueError()
            criteria = json.loads(body) if request.method == "POST" else dict(request.query_params)
            invocation = TravelInvocation(plan_id=plan_id, action=action, criteria=criteria)
        except (ValueError, ValidationError):
            return JSONResponse(
                {"code": "invalid_search", "message": "Check your search criteria."},
                status_code=422,
            )
        return await dispatch(invocation, identity, authorization)

    app.include_router(router)
    return dispatch
