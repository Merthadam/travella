"""Add destination pins."""
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None

def upgrade():
    op.create_table("destination_pins", sa.Column("id", UUID(as_uuid=True), primary_key=True), sa.Column("plan_id", UUID(as_uuid=True), nullable=False), sa.Column("place_id", sa.String(255), nullable=False), sa.Column("name", sa.String(255), nullable=False), sa.Column("address", sa.String(512), nullable=False), sa.Column("latitude", sa.Float(), nullable=False), sa.Column("longitude", sa.Float(), nullable=False), sa.Column("granularity", sa.String(32), nullable=False), sa.Column("created_at", sa.DateTime(timezone=True), nullable=False), sa.ForeignKeyConstraint(["plan_id"], ["plans.id"], name="fk_destination_pins_plan_id", ondelete="CASCADE"), sa.UniqueConstraint("plan_id", "place_id", name="uq_destination_pins_plan_place"))
    op.create_index("ix_destination_pins_plan_id", "destination_pins", ["plan_id"])

def downgrade():
    op.drop_table("destination_pins")
