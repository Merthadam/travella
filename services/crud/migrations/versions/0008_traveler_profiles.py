"""Add traveler-scoped reusable profile details."""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB

revision = "0008"
down_revision = "0007"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "traveler_profiles",
        sa.Column("traveler_subject", sa.String(length=255), primary_key=True),
        sa.Column("payload", JSONB(), nullable=False),
        sa.Column("onboarding_complete", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("traveler_profiles")
