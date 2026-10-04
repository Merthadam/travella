"""Persist research context independently from saved Plan requirements."""
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB

revision = "0009"
down_revision = "0008"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "research_contexts",
        sa.Column("plan_id", sa.UUID(), sa.ForeignKey("plans.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("payload", JSONB(), nullable=False),
        sa.Column("revision", sa.Integer(), nullable=False),
        sa.Column("active_event", sa.String(100), nullable=True),
        sa.Column("lease_until", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )


def downgrade():
    op.drop_table("research_contexts")
