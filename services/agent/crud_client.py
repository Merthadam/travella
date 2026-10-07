"""Authenticated HTTP adapters for authoritative Plan and Conversation data."""

from typing import Any
from uuid import UUID

import httpx
from fastapi import HTTPException

from services.crud.profile_schemas import ProfileOutput
from services.trip_context import ContextSnapshot


class CrudPlanReader:
    def __init__(self, base_url: str) -> None:
        self.base_url = base_url.rstrip("/")

    async def __call__(self, subject: str, plan_id: UUID, token: str) -> dict[str, Any] | None:
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.get(
                f"{self.base_url}/v1/plans/{plan_id}",
                headers={"Authorization": f"Bearer {token}"},
            )
        if response.status_code == 404:
            return None
        if response.status_code >= 400:
            raise HTTPException(503, "Plan service unavailable.")
        data = response.json()
        return data if data.get("lifecycle") == "active" else None


class CrudContextReader:
    def __init__(self, base_url: str) -> None:
        self.base_url = base_url.rstrip("/")

    async def context(self, plan_id: UUID, token: str) -> dict[str, Any]:
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.get(
                f"{self.base_url}/v1/plans/{plan_id}/agent-context",
                headers={"Authorization": f"Bearer {token}"},
            )
        if response.status_code >= 400:
            raise HTTPException(503, "Plan context unavailable.")
        return response.json()

    async def generation_context(self, plan_id: UUID, token: str) -> dict[str, Any]:
        """Read one stable authorized history span without the chat last-12 limit."""
        messages, cursor, cutoff, revision = [], 0, None, None
        async with httpx.AsyncClient(timeout=10) as client:
            while True:
                params = {"after_sequence": cursor, "limit": 50}
                if cutoff is not None:
                    params.update(cutoff_sequence=cutoff, expected_revision=revision)
                response = await client.get(
                    f"{self.base_url}/v1/plans/{plan_id}/generation-context",
                    headers={"Authorization": f"Bearer {token}"}, params=params,
                )
                if response.status_code >= 400:
                    raise HTTPException(response.status_code if response.status_code in {401, 404, 409} else 503,
                                        "Trip context changed or could not be loaded. Please retry.")
                page = response.json()
                if page.get("coverage_incomplete"):
                    raise HTTPException(422, "This conversation is too large to summarize completely. Your existing draft is unchanged.")
                messages.extend(page.get("messages", []))
                if len(messages) > 500:
                    raise HTTPException(422, "This conversation is too large to summarize completely.")
                cutoff, revision = page["cutoff_sequence"], page["revision"]
                next_cursor = page.get("next_after_sequence")
                if next_cursor is None:
                    return {**page, "messages": messages}
                if next_cursor <= cursor:
                    raise HTTPException(503, "Conversation history could not be loaded.")
                cursor = next_cursor

    async def context_run(self, plan_id: UUID, token: str, **payload) -> dict[str, Any]:
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.post(
                f"{self.base_url}/v1/plans/{plan_id}/research-context/run",
                headers={"Authorization": f"Bearer {token}"}, json=payload,
            )
        if response.status_code == 409:
            raise HTTPException(409, "Trip context changed or another reply is running. Please try again.")
        if response.status_code >= 400:
            raise HTTPException(503, "Trip context could not be saved. Please try again.")
        return ContextSnapshot.model_validate(response.json()).model_dump()

    async def edit_context(self, plan_id: UUID, token: str, *, event_id: str, revision: int, changes: list) -> dict:
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.patch(
                f"{self.base_url}/v1/plans/{plan_id}/research-context",
                headers={"Authorization": f"Bearer {token}", "Idempotency-Key": event_id, "If-Match": str(revision)},
                json={"changes": changes},
            )
        if response.status_code >= 400:
            raise HTTPException(response.status_code if response.status_code in {401, 404, 409, 422} else 503,
                                "Trip details could not be saved. Refresh and try again.")
        return ContextSnapshot.model_validate(response.json()).model_dump()

    async def profile(self, token: str) -> dict[str, Any]:
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.get(
                f"{self.base_url}/v1/traveler-profile",
                headers={"Authorization": f"Bearer {token}"},
            )
        if response.status_code >= 400:
            raise HTTPException(503, "Traveler profile unavailable.")
        return ProfileOutput.model_validate(response.json()).model_dump(mode="json")

    async def append(
        self, plan_id: UUID, token: str, *, event_id: str, role: str,
        content: str, generation: int,
        status: str = "complete",
    ) -> None:
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.post(
                f"{self.base_url}/v1/plans/{plan_id}/conversation/messages",
                headers={"Authorization": f"Bearer {token}"},
                json={"event_id": event_id, "role": role, "content": content, "generation": generation, "status": status},
            )
        if response.status_code >= 400:
            raise HTTPException(503, "Conversation persistence unavailable.")
