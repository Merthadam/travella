"""SQLAlchemy durable models for the Plan lifecycle."""

from __future__ import annotations

import enum
import uuid
from datetime import datetime

from sqlalchemy import (
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Integer,
    LargeBinary,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class PlanLifecycle(str, enum.Enum):
    ACTIVE = "active"
    DELETED = "deleted"


class TitleSource(str, enum.Enum):
    AUTOMATIC = "automatic"
    MANUAL = "manual"


class WorkingView(str, enum.Enum):
    CONVERSATION = "conversation"
    WORKSPACE = "workspace"


class ReceiptStatus(str, enum.Enum):
    SUCCEEDED = "succeeded"
    CONFLICT = "conflict"
    GONE = "gone"


class Plan(Base):
    __tablename__ = "plans"
    __table_args__ = (
        Index(
            "ix_plans_traveler_lifecycle_activity",
            "traveler_subject",
            "lifecycle",
            "last_activity_at",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    traveler_subject: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    lifecycle: Mapped[PlanLifecycle] = mapped_column(
        Enum(PlanLifecycle, native_enum=False), default=PlanLifecycle.ACTIVE, nullable=False
    )
    revision: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    title: Mapped[str] = mapped_column(String(120), default="Untitled plan", nullable=False)
    title_source: Mapped[TitleSource] = mapped_column(
        Enum(TitleSource, native_enum=False), default=TitleSource.AUTOMATIC, nullable=False
    )
    destination_summary: Mapped[str | None] = mapped_column(String(255), nullable=True)
    last_working_view: Mapped[WorkingView] = mapped_column(
        Enum(WorkingView, native_enum=False), default=WorkingView.CONVERSATION, nullable=False
    )
    last_activity_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    recovery_deadline: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    conversation: Mapped["Conversation"] = relationship(
        back_populates="plan", uselist=False, cascade="all, delete-orphan"
    )
    receipts: Mapped[list["PlanActionReceipt"]] = relationship(
        back_populates="plan", cascade="all, delete-orphan"
    )
    challenges: Mapped[list["PlanChallenge"]] = relationship(
        back_populates="plan", cascade="all, delete-orphan"
    )


class Conversation(Base):
    __tablename__ = "conversations"
    __table_args__ = (UniqueConstraint("plan_id", name="uq_conversations_plan_id"),)

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    plan_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("plans.id", ondelete="CASCADE"), nullable=False, unique=True, index=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    plan: Mapped[Plan] = relationship(back_populates="conversation")


class DestinationPin(Base):
    __tablename__ = "destination_pins"
    __table_args__ = (UniqueConstraint("plan_id", "place_id", name="uq_destination_pins_plan_place"),)

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    plan_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("plans.id", ondelete="CASCADE"), nullable=False, index=True
    )
    place_id: Mapped[str] = mapped_column(String(255), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    address: Mapped[str] = mapped_column(String(512), nullable=False, default="")
    latitude: Mapped[float] = mapped_column(nullable=False)
    longitude: Mapped[float] = mapped_column(nullable=False)
    granularity: Mapped[str] = mapped_column(String(32), nullable=False, default="city")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class PlanActionReceipt(Base):
    __tablename__ = "plan_action_receipts"
    __table_args__ = (
        UniqueConstraint("traveler_subject", "request_id", name="uq_receipt_traveler_request"),
        Index("ix_receipts_expiry", "expires_at"),
        Index("ix_receipts_plan", "plan_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    traveler_subject: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    request_id: Mapped[str] = mapped_column(String(100), nullable=False)
    operation: Mapped[str] = mapped_column(String(80), nullable=False)
    payload_digest: Mapped[str] = mapped_column(String(64), nullable=False)
    plan_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("plans.id", ondelete="CASCADE"), nullable=True
    )
    result_status: Mapped[ReceiptStatus] = mapped_column(
        Enum(ReceiptStatus, native_enum=False), nullable=False
    )
    result_ref: Mapped[str | None] = mapped_column(String(255), nullable=True)
    result_json: Mapped[str] = mapped_column(Text, default="{}", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    plan: Mapped[Plan | None] = relationship(back_populates="receipts")


class PlanChallenge(Base):
    __tablename__ = "plan_challenges"
    __table_args__ = (
        Index("ix_challenges_plan", "plan_id"),
        Index("ix_challenges_expiry", "expires_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    token_hash: Mapped[bytes] = mapped_column(LargeBinary(64), nullable=False, unique=True)
    traveler_subject: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    plan_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("plans.id", ondelete="CASCADE"), nullable=False
    )
    operation: Mapped[str] = mapped_column(String(80), nullable=False)
    expected_revision: Mapped[int] = mapped_column(Integer, nullable=False)
    change_digest: Mapped[str] = mapped_column(String(64), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    consumed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    plan: Mapped[Plan] = relationship(back_populates="challenges")
