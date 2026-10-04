"""Traveler profile persistence, isolated from Plan lifecycle data."""

from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from .models import TravelerProfile


class TravelerProfileRepository:
    def __init__(self, session: Session, *, clock=None) -> None:
        self.session = session
        self.clock = clock or (lambda: datetime.now(timezone.utc))

    def get(self, subject: str) -> TravelerProfile | None:
        return self.session.scalar(
            select(TravelerProfile).where(TravelerProfile.traveler_subject == subject)
        )

    def save(self, subject: str, payload: dict[str, object], complete: bool) -> TravelerProfile:
        row = self.get(subject)
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
        self.session.commit()
        self.session.refresh(row)
        return row
