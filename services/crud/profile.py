"""Traveler profile persistence, isolated from Plan lifecycle data."""

import hashlib
import json
from datetime import datetime, timezone

from sqlalchemy import select, text
from sqlalchemy.orm import Session

from services.shared.traveler_profile import derive_legacy_fields, reference_catalog

from .contracts import LifecycleProblem
from .models import TravelerProfile
from .profile_schemas import AccountSectionMutation, OnboardingMutation, OnboardingProgress, ProfileOutput


class TravelerProfileRepository:
    def __init__(self, session: Session, *, clock=None) -> None:
        self.session = session
        self.clock = clock or (lambda: datetime.now(timezone.utc))

    def get(self, subject: str) -> TravelerProfile | None:
        return self.session.scalar(
            select(TravelerProfile).where(TravelerProfile.traveler_subject == subject)
        )

    def _lock(self, subject: str) -> None:
        # Row locking alone cannot serialize the first save of an absent row.
        if self.session.bind.dialect.name == "postgresql":
            key = int.from_bytes(hashlib.sha256(f"profile:{subject}".encode()).digest()[:8],
                                 byteorder="big", signed=True)
            self.session.execute(text("SELECT pg_advisory_xact_lock(:key)"), {"key": key})
        elif self.session.bind.dialect.name == "sqlite":
            self.session.connection().exec_driver_sql("BEGIN IMMEDIATE")

    def save(self, subject: str, payload: dict[str, object], complete: bool | None) -> TravelerProfile:
        self._lock(subject)
        row = self.get(subject)
        merged = {**(row.payload if row else {}), **payload}
        merged["revision"] = (row.payload.get("revision", 0) if row else 0) + 1
        # Old clients cannot overwrite the derived structured values or lower v2.
        if merged.get("home_city"):
            derive_legacy_fields(merged, "home")
        if merged.get("onboarding", {}).get("steps", {}).get("interests") == "completed":
            derive_legacy_fields(merged, "interests")
        complete = bool(complete or (row and row.onboarding_complete))
        row = self._store(subject, row, merged, complete)
        self.session.commit()
        self.session.refresh(row)
        return row

    def save_step(self, subject: str, mutation: OnboardingMutation) -> ProfileOutput:
        self._lock(subject)
        row = self.get(subject)
        payload = dict(row.payload) if row else {}
        event_id = str(mutation.event_id)
        digest = hashlib.sha256(json.dumps(mutation.model_dump(mode="json"),
                                          sort_keys=True).encode()).hexdigest()
        receipts = dict(payload.get("_onboarding_events", {}))
        if event_id in receipts:
            receipt = receipts[event_id]
            if receipt["digest"] != digest:
                # Pre-address home receipts hashed the same normalized request
                # without address=None. Accept that exact legacy digest only;
                # a changed address or any other changed field still conflicts.
                legacy_request = mutation.model_dump(mode="json")
                legacy_city = legacy_request["values"].get("home_city")
                if (mutation.step != "home" or mutation.action != "continue"
                        or not isinstance(legacy_city, dict)
                        or legacy_city.get("address") is not None):
                    raise LifecycleProblem("request_reused")
                legacy_city.pop("address", None)
                legacy_digest = hashlib.sha256(json.dumps(legacy_request,
                                                          sort_keys=True).encode()).hexdigest()
                if receipt["digest"] != legacy_digest:
                    raise LifecycleProblem("request_reused")
            return ProfileOutput.model_validate(receipt["response"])
        if payload.get("revision", 0) != mutation.expected_revision:
            raise LifecycleProblem("revision_conflict")
        progress = OnboardingProgress.model_validate(payload.get("onboarding", {}))
        if mutation.action == "continue":
            if mutation.step == "citizenship":
                allowed = {item["code"] for item in reference_catalog("countries")}
                allowed.update(payload.get("citizenships", []))
                if any(value not in allowed for value in mutation.values["citizenships"]):
                    raise LifecycleProblem("invalid_profile")
            payload.update(mutation.values)
            derive_legacy_fields(payload, mutation.step)
        setattr(progress.steps, mutation.step,
                "completed" if mutation.action == "continue" else "skipped")
        resolved = all(value != "pending" for value in progress.steps.model_dump().values())
        if resolved and payload.get("home_city"):
            progress.completed_version = 2
        payload["onboarding"] = progress.model_dump()
        payload["revision"] = mutation.expected_revision + 1
        row = self._store(subject, row, payload,
                          bool((row and row.onboarding_complete) or progress.completed_version == 2))
        result = ProfileOutput.from_row(row)
        # Private receipts are written in the same transaction as data/progress.
        # They are excluded from every public and memory projection.
        receipts[event_id] = {"digest": digest, "response": result.model_dump(mode="json")}
        # Retain the latest 64 successful onboarding mutations. Older retries
        # remain safe: their expected revision is stale and receives a conflict.
        # Sort by response revision because PostgreSQL JSONB reorders object keys.
        if len(receipts) > 64:
            receipts = dict(sorted(receipts.items(),
                                   key=lambda item: item[1]["response"]["revision"])[-64:])
        row.payload = {**payload, "_onboarding_events": receipts}
        self.session.commit()
        return result

    def save_section(self, subject: str, mutation: AccountSectionMutation) -> ProfileOutput:
        self._lock(subject)
        row = self.get(subject)
        payload = dict(row.payload) if row else {}
        event_id = str(mutation.event_id)
        digest = hashlib.sha256(json.dumps(mutation.model_dump(mode="json"),
                                          sort_keys=True).encode()).hexdigest()
        receipts = dict(payload.get("_account_events", {}))
        if event_id in receipts:
            if receipts[event_id]["digest"] != digest:
                raise LifecycleProblem("request_reused")
            return ProfileOutput.model_validate(receipts[event_id]["response"])
        if payload.get("revision", 0) != mutation.expected_revision:
            raise LifecycleProblem("revision_conflict")
        if mutation.section == "citizenship":
            allowed = {item["code"] for item in reference_catalog("countries")}
            allowed.update(payload.get("citizenships", []))
            if any(value not in allowed for value in mutation.values["citizenships"]):
                raise LifecycleProblem("invalid_profile")
        payload.update(mutation.values)
        derive_legacy_fields(payload, mutation.section)
        payload["revision"] = mutation.expected_revision + 1
        row = self._store(subject, row, payload, bool(row and row.onboarding_complete))
        # Read database-normalized timestamps before capturing the replay receipt.
        self.session.flush()
        self.session.refresh(row)
        result = ProfileOutput.from_row(row)
        receipts[event_id] = {"digest": digest, "response": result.model_dump(mode="json")}
        receipts = dict(sorted(receipts.items(),
                               key=lambda item: item[1]["response"]["revision"])[-64:])
        row.payload = {**payload, "_account_events": receipts}
        self.session.commit()
        return result

    def _store(self, subject, row, payload, complete):
        now = self.clock()
        if row is None:
            row = TravelerProfile(
                traveler_subject=subject,
                payload=payload,
                onboarding_complete=complete,
                updated_at=now,
            )
            self.session.add(row)
        else:
            row.payload = payload
            row.onboarding_complete = complete
            row.updated_at = now
        return row
