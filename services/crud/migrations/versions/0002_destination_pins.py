"""Add durable city and country destination pins to a Plan."""

from alembic import op


revision = "0002_destination_pins"
down_revision = "0001_plan_lifecycle"
branch_labels = None
depends_on = None


def upgrade() -> None:
    from services.crud.models import Base

    Base.metadata.create_all(bind=op.get_bind())


def downgrade() -> None:
    # The development service owns schema creation through metadata. A destructive
    # downgrade is intentionally omitted until managed production migrations exist.
    pass
