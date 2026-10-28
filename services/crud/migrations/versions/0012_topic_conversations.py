"""Add isolated specialist histories and bounded research state.

Rollout is additive. Export specialist data before any downgrade; prefer forward fixes.
"""
import sqlalchemy as sa
from alembic import op

revision = "0012"
down_revision = "0011"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("conversation_messages", sa.Column("topic", sa.String(10), nullable=False, server_default="trip"))
    op.create_table("travel_topic_states",
        sa.Column("plan_id", sa.UUID(), sa.ForeignKey("plans.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("topic", sa.String(10), primary_key=True),
        sa.Column("payload", sa.JSON(), nullable=False))
    op.create_table("travel_topic_runs",
        sa.Column("plan_id", sa.UUID(), sa.ForeignKey("plans.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("event_id", sa.String(80), primary_key=True),
        sa.Column("topic", sa.String(10), nullable=False),
        sa.Column("input_digest", sa.String(64), nullable=False),
        sa.Column("brief_digest", sa.String(64), nullable=False),
        sa.Column("status", sa.String(20), nullable=False),
        sa.Column("message_id", sa.UUID(), nullable=False))


def downgrade():
    op.drop_table("travel_topic_runs")
    op.drop_table("travel_topic_states")
    op.drop_column("conversation_messages", "topic")
