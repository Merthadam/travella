"""Add planning briefs."""
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None

def upgrade():
    op.create_table("planning_briefs", sa.Column("id", UUID(as_uuid=True), primary_key=True), sa.Column("plan_id", UUID(as_uuid=True), nullable=False), sa.Column("payload", sa.Text(), nullable=False), sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False), sa.ForeignKeyConstraint(["plan_id"], ["plans.id"], name="fk_planning_briefs_plan_id", ondelete="CASCADE"), sa.UniqueConstraint("plan_id", name="uq_planning_briefs_plan_id"))
    op.create_index("ix_planning_briefs_plan_id", "planning_briefs", ["plan_id"])

def downgrade():
    op.drop_table("planning_briefs")
