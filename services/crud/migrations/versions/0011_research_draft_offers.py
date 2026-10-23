"""Persist Plan-owned Research invitations and suppression without changing Plans."""
import sqlalchemy as sa
from alembic import op

revision = "0011"
down_revision = "0010"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("research_contexts", sa.Column("priorities_since", sa.DateTime(timezone=True), nullable=True))
    op.create_table(
        "research_draft_offers",
        sa.Column("id", sa.UUID(), primary_key=True),
        sa.Column("plan_id", sa.UUID(), sa.ForeignKey("plans.id", ondelete="CASCADE"), nullable=False),
        sa.Column("event_id", sa.String(100), nullable=True),
        sa.Column("message_id", sa.String(36), nullable=True),
        sa.Column("sequence", sa.Integer(), nullable=False),
        sa.Column("revision", sa.Integer(), nullable=False),
        sa.Column("fingerprint", sa.String(64), nullable=False),
        sa.Column("status", sa.String(20), nullable=False),
        sa.Column("deferred", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("plan_id", "event_id", name="uq_research_offer_event"),
        sa.UniqueConstraint("plan_id", "sequence", name="uq_research_offer_sequence"),
        sa.CheckConstraint("status IN ('available','review','deferred','consumed','superseded')", name="ck_research_offer_status"),
    )
    op.create_index("ix_research_draft_offers_plan_id", "research_draft_offers", ["plan_id"])


def downgrade():
    op.drop_table("research_draft_offers")
    op.drop_column("research_contexts", "priorities_since")
