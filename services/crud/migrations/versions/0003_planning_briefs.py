"""Add the Plan-scoped Planning Brief projection."""

from alembic import op

revision = "0003_planning_briefs"
down_revision = "0002_destination_pins"
branch_labels = None
depends_on = None


def upgrade() -> None:
    from services.crud.models import Base
    Base.metadata.create_all(bind=op.get_bind())


def downgrade() -> None:
    pass
