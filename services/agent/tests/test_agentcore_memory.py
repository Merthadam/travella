from __future__ import annotations

import asyncio
import json

from services.agent.memory import AgentCoreMemory, DisabledMemory


class FakeMemoryClient:
    def __init__(self):
        self.records = []
        self.created = []
        self.updated = []

    def list_memory_records(self, **kwargs):
        records = [item for item in self.records if kwargs["namespace"] in item["namespaces"]]
        return {"memoryRecordSummaries": records}

    def batch_create_memory_records(self, **kwargs):
        record = kwargs["records"][0]
        created = {**record, "memoryRecordId": "record-1"}
        self.records.append(created)
        self.created.append(kwargs)
        return {"successfulRecords": [{"memoryRecordId": "record-1"}], "failedRecords": []}

    def batch_update_memory_records(self, **kwargs):
        update = kwargs["records"][0]
        self.updated.append(kwargs)
        for index, record in enumerate(self.records):
            if record["memoryRecordId"] == update["memoryRecordId"]:
                self.records[index] = {**record, **update}
        return {"successfulRecords": [{"memoryRecordId": "record-1"}], "failedRecords": []}


def test_agentcore_profile_is_actor_scoped_replaceable_and_retrievable():
    client = FakeMemoryClient()
    memory = AgentCoreMemory(client, "memory-id")
    profile = {
        "departure_base": "Budapest",
        "citizenships": ["Hungarian"],
        "food_needs": "Peanut allergy",
        "accessibility_needs": "",
        "travel_interests": "Museums",
        "updated_at": "2026-10-04T10:00:00Z",
        "onboarding_complete": True,
        "email": "traveler@example.com",
    }

    assert asyncio.run(memory.sync_profile("cognito-subject-123", profile)) is True
    assert asyncio.run(memory.sync_profile("cognito-subject-123", {**profile, "departure_base": "Vienna"})) is True
    remembered = asyncio.run(memory.retrieve_relevant_memory("cognito-subject-123", "travel"))

    assert len(client.created) == 1
    assert len(client.updated) == 1
    assert "cognito-subject-123" not in client.created[0]["records"][0]["namespaces"][0]
    assert "traveler@example.com" not in client.created[0]["records"][0]["content"]["text"]
    assert json.loads(client.created[0]["records"][0]["content"]["text"])["departure_base"] == "Budapest"
    assert remembered["departure_base"] == "Vienna"
    assert remembered["updated_at"] == profile["updated_at"]


def test_disabled_agentcore_memory_is_a_noop():
    memory = DisabledMemory()
    assert memory.enabled is False
    assert asyncio.run(memory.sync_profile("subject", {"food_needs": "allergy"})) is False
    assert asyncio.run(memory.retrieve_relevant_memory("subject", "profile")) is None


def test_mirror_replace_retains_explicit_empty_values_and_excludes_private_metadata():
    client = FakeMemoryClient()
    memory = AgentCoreMemory(client, "memory-id")
    assert asyncio.run(memory.sync_profile("subject", {"default_airport": "VIE", "food_needs": "Vegetarian", "citizenships": ["AT"]}))
    cleared = {"departure_base": "Vienna", "home_city": {"name": "Vienna", "country_code": "AT", "source": "manual", "address": "Private address"},
               "default_airport": None, "food_needs": "", "accessibility_needs": "", "citizenships": [],
               "interest_ids": [], "custom_interests": [], "travel_interests": "", "updated_at": "current",
               "email": "private@example.test", "given_name": "Private", "_account_events": {"receipt": {}}, "onboarding_complete": True}
    assert asyncio.run(memory.sync_profile("subject", cleared))
    remembered = asyncio.run(memory.retrieve_relevant_memory("subject", "travel"))
    from services.shared.traveler_profile import profile_context
    assert remembered == profile_context(cleared) | {"updated_at": "current"}
    encoded = client.updated[0]["records"][0]["content"]["text"]
    assert all(value not in encoded for value in ["Private address", "private@example.test", "given_name", "_account_events", "onboarding_complete"])
