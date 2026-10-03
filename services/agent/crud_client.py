"""Authenticated HTTP adapters for authoritative Plan and Conversation data."""

from typing import Any
from uuid import UUID

import httpx
from fastapi import HTTPException


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
