"""Create auth-owned encrypted session and MFA state tables."""

import sqlalchemy as sa
from alembic import op

revision = "0005"
down_revision = "0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "auth_sessions",
        sa.Column("id", sa.String(64), primary_key=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("payload", sa.LargeBinary(), nullable=False),
    )
    op.create_index("ix_auth_sessions_expires_at", "auth_sessions", ["expires_at"])

    op.create_table(
        "auth_recovery_codes",
        sa.Column("subject", sa.String(255), primary_key=True),
        sa.Column("email", sa.String(320), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("payload", sa.LargeBinary(), nullable=False),
    )
    op.create_index("ix_auth_recovery_codes_email", "auth_recovery_codes", ["email"])

    op.create_table(
        "auth_enrollments",
        sa.Column("subject", sa.String(255), primary_key=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("payload", sa.LargeBinary(), nullable=False),
    )
    op.create_index("ix_auth_enrollments_expires_at", "auth_enrollments", ["expires_at"])


def downgrade() -> None:
    op.drop_index("ix_auth_enrollments_expires_at", table_name="auth_enrollments")
    op.drop_table("auth_enrollments")
    op.drop_index("ix_auth_recovery_codes_email", table_name="auth_recovery_codes")
    op.drop_table("auth_recovery_codes")
    op.drop_index("ix_auth_sessions_expires_at", table_name="auth_sessions")
    op.drop_table("auth_sessions")
