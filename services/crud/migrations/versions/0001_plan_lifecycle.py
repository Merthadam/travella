"""Create the initial Plan lifecycle tables."""
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None

def upgrade():
    op.create_table("plans", sa.Column("id", UUID(as_uuid=True), primary_key=True), sa.Column("traveler_subject", sa.String(255), nullable=False), sa.Column("lifecycle", sa.String(32), nullable=False), sa.Column("revision", sa.Integer(), nullable=False), sa.Column("title", sa.String(120), nullable=False), sa.Column("title_source", sa.String(32), nullable=False), sa.Column("destination_summary", sa.String(255)), sa.Column("last_working_view", sa.String(32), nullable=False), sa.Column("last_activity_at", sa.DateTime(timezone=True), nullable=False), sa.Column("deleted_at", sa.DateTime(timezone=True)), sa.Column("recovery_deadline", sa.DateTime(timezone=True)), sa.Column("created_at", sa.DateTime(timezone=True), nullable=False), sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False))
    op.create_index("ix_plans_traveler_subject", "plans", ["traveler_subject"])
    op.create_index("ix_plans_traveler_lifecycle_activity", "plans", ["traveler_subject", "lifecycle", "last_activity_at"])
    op.create_table("conversations", sa.Column("id", UUID(as_uuid=True), primary_key=True), sa.Column("plan_id", UUID(as_uuid=True), nullable=False), sa.Column("created_at", sa.DateTime(timezone=True), nullable=False), sa.ForeignKeyConstraint(["plan_id"], ["plans.id"], name="fk_conversations_plan_id", ondelete="CASCADE"), sa.UniqueConstraint("plan_id", name="uq_conversations_plan_id"))
    op.create_index("ix_conversations_plan_id", "conversations", ["plan_id"])
    op.create_table("plan_action_receipts", sa.Column("id", UUID(as_uuid=True), primary_key=True), sa.Column("traveler_subject", sa.String(255), nullable=False), sa.Column("request_id", sa.String(100), nullable=False), sa.Column("operation", sa.String(80), nullable=False), sa.Column("payload_digest", sa.String(64), nullable=False), sa.Column("plan_id", UUID(as_uuid=True)), sa.Column("result_status", sa.String(32), nullable=False), sa.Column("result_ref", sa.String(255)), sa.Column("result_json", sa.Text(), nullable=False), sa.Column("created_at", sa.DateTime(timezone=True), nullable=False), sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False), sa.ForeignKeyConstraint(["plan_id"], ["plans.id"], name="fk_receipts_plan_id", ondelete="CASCADE"), sa.UniqueConstraint("traveler_subject", "request_id", name="uq_receipt_traveler_request"))
    op.create_index("ix_plan_action_receipts_traveler_subject", "plan_action_receipts", ["traveler_subject"])
    op.create_index("ix_receipts_expiry", "plan_action_receipts", ["expires_at"])
    op.create_index("ix_receipts_plan", "plan_action_receipts", ["plan_id"])
    op.create_table("plan_challenges", sa.Column("id", UUID(as_uuid=True), primary_key=True), sa.Column("token_hash", sa.LargeBinary(length=64), nullable=False), sa.Column("traveler_subject", sa.String(255), nullable=False), sa.Column("plan_id", UUID(as_uuid=True), nullable=False), sa.Column("operation", sa.String(80), nullable=False), sa.Column("expected_revision", sa.Integer(), nullable=False), sa.Column("change_digest", sa.String(64), nullable=False), sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False), sa.Column("consumed_at", sa.DateTime(timezone=True)), sa.ForeignKeyConstraint(["plan_id"], ["plans.id"], name="fk_challenges_plan_id", ondelete="CASCADE"), sa.UniqueConstraint("token_hash", name="uq_plan_challenges_token_hash"))
    op.create_index("ix_plan_challenges_traveler_subject", "plan_challenges", ["traveler_subject"])
    op.create_index("ix_challenges_plan", "plan_challenges", ["plan_id"])
    op.create_index("ix_challenges_expiry", "plan_challenges", ["expires_at"])

def downgrade():
    op.drop_table("plan_challenges")
    op.drop_table("plan_action_receipts")
    op.drop_table("conversations")
    op.drop_table("plans")
