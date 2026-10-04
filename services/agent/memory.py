"""Traveler-scoped AgentCore Memory adapter.

CRUD owns the canonical profile. AgentCore stores a replaceable, advisory
snapshot that can be retrieved for later Plan turns; onboarding stays stateless.
"""

from __future__ import annotations

import asyncio
import hashlib
import json
import os
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any, Protocol


class MemoryAdapter(Protocol):
    @property
    def enabled(self) -> bool: ...

    async def sync_profile(self, traveler_scope: str, profile: dict[str, Any]) -> bool: ...

    async def retrieve_relevant_memory(
        self, traveler_scope: str, topic: str
    ) -> dict[str, Any] | None: ...


@dataclass(frozen=True)
class DisabledMemory:
    enabled: bool = False
    namespace_template: str = "traveler/{actorId}"

    def namespace(self, traveler_scope: str) -> str:
        return self.namespace_template.replace("{actorId}", traveler_scope)

    async def sync_profile(self, traveler_scope: str, profile: dict[str, Any]) -> bool:
        del traveler_scope, profile
        return False

    async def retrieve_relevant_memory(
        self, traveler_scope: str, topic: str
    ) -> dict[str, Any] | None:
        del traveler_scope, topic
        return None


class AgentCoreMemory:
    """Persist one deterministic profile record in a private actor namespace."""

    PROFILE_FIELDS = (
        "departure_base",
        "citizenships",
        "food_needs",
        "accessibility_needs",
        "travel_interests",
        "updated_at",
    )

    def __init__(
        self,
        client: Any,
        memory_id: str,
        namespace_template: str = "traveler/__ACTOR_ID__/profile",
    ) -> None:
        self.client = client
        self.memory_id = memory_id
        self.namespace_template = namespace_template

    @property
    def enabled(self) -> bool:
        return True

    def namespace(self, traveler_scope: str) -> str:
        actor_id = hashlib.sha256(traveler_scope.encode("utf-8")).hexdigest()
        return self.namespace_template.replace("__ACTOR_ID__", actor_id).replace(
            "{actorId}", actor_id
        )

    async def sync_profile(self, traveler_scope: str, profile: dict[str, Any]) -> bool:
        safe_profile = {key: profile.get(key) for key in self.PROFILE_FIELDS}
        record = {
            "content": {"text": json.dumps(safe_profile, ensure_ascii=False, separators=(",", ":"))},
            "timestamp": datetime.now(UTC),
            "namespaces": [self.namespace(traveler_scope)],
            "metadata": {
                "record_type": {"stringValue": "traveler_profile"},
                "updated_at": {"stringValue": str(profile.get("updated_at") or "")},
            },
        }
        return await asyncio.to_thread(self._upsert_profile, record)

    def _upsert_profile(self, record: dict[str, Any]) -> bool:
        namespace = record["namespaces"][0]
        response = self.client.list_memory_records(
            memoryId=self.memory_id, namespace=namespace, maxResults=100
        )
        summaries = response.get("memoryRecordSummaries", [])
        records = [
            item for item in summaries
            if self._is_profile_record(item)
        ]
        while response.get("nextToken"):
            response = self.client.list_memory_records(
                memoryId=self.memory_id,
                namespace=namespace,
                maxResults=100,
                nextToken=response["nextToken"],
            )
            records.extend(
                item for item in response.get("memoryRecordSummaries", [])
                if self._is_profile_record(item)
            )

        if records:
            record_id = records[0]["memoryRecordId"]
            result = self.client.batch_update_memory_records(
                memoryId=self.memory_id,
                records=[{
                    "memoryRecordId": record_id,
                    "content": record["content"],
                    "timestamp": record["timestamp"],
                    "namespaces": record["namespaces"],
                    "metadata": record["metadata"],
                }],
            )
            return bool(result.get("successfulRecords")) and not result.get("failedRecords")

        result = self.client.batch_create_memory_records(
            memoryId=self.memory_id,
            records=[{
                **record,
                "requestIdentifier": hashlib.sha256(
                    (namespace + record["content"]["text"]).encode("utf-8")
                ).hexdigest()[:64],
            }],
        )
        return bool(result.get("successfulRecords")) and not result.get("failedRecords")

    async def retrieve_relevant_memory(
        self, traveler_scope: str, topic: str
    ) -> dict[str, Any] | None:
        del topic  # The profile record is exact and actor-scoped, not semantic search.
        return await asyncio.to_thread(self._read_profile, self.namespace(traveler_scope))

    @staticmethod
    def _is_profile_record(item: dict[str, Any]) -> bool:
        marker = item.get("metadata", {}).get("record_type")
        if isinstance(marker, dict):
            marker = marker.get("stringValue")
        return marker == "traveler_profile"

    def _read_profile(self, namespace: str) -> dict[str, Any] | None:
        response = self.client.list_memory_records(
            memoryId=self.memory_id, namespace=namespace, maxResults=100
        )
        summaries = list(response.get("memoryRecordSummaries", []))
        while response.get("nextToken"):
            response = self.client.list_memory_records(
                memoryId=self.memory_id,
                namespace=namespace,
                maxResults=100,
                nextToken=response["nextToken"],
            )
            summaries.extend(response.get("memoryRecordSummaries", []))
        records = [
            item for item in summaries
            if self._is_profile_record(item)
        ]
        if not records:
            return None
        try:
            value = json.loads(records[0]["content"]["text"])
        except (KeyError, TypeError, ValueError):
            return None
        if not isinstance(value, dict):
            return None
        return {key: value.get(key) for key in self.PROFILE_FIELDS}


def create_memory_adapter() -> MemoryAdapter:
    memory_id = os.getenv("AGENTCORE_MEMORY_ID", "").strip()
    if not memory_id:
        return DisabledMemory()
    import boto3

    return AgentCoreMemory(
        boto3.client("bedrock-agentcore", region_name=os.getenv("AWS_REGION", "eu-north-1")),
        memory_id,
        os.getenv("AGENTCORE_MEMORY_NAMESPACE_TEMPLATE", "traveler/__ACTOR_ID__/profile"),
    )
