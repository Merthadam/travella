"""Add explicitly confirmed Planning Canvas snapshots."""
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB

revision = "0010"
down_revision = "0009"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "planning_canvases",
        sa.Column("plan_id", sa.UUID(), sa.ForeignKey("plans.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("payload", JSONB(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("jsonb_typeof(payload) = 'object'", name="ck_planning_canvas_payload_object"),
    )


def downgrade():
    op.drop_table("planning_canvases")
