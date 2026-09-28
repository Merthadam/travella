"""Initial CRUD Plan lifecycle schema."""

from alembic import op

revision = "0001_plan_lifecycle"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    from services.crud.models import Base

    bind = op.get_bind()
    Base.metadata.create_all(bind=bind)


def downgrade() -> None:
    from services.crud.models import Base

    bind = op.get_bind()
    Base.metadata.drop_all(bind=bind)
