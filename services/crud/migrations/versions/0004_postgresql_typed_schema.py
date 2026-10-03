"""Enforce PostgreSQL-native structured data and Plan invariants."""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB, NUMERIC

revision = "0004"
down_revision = "0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Earlier SQLAlchemy mappings persisted enum member names (for example,
    # ``ACTIVE``). Normalize those legacy rows to the public wire values before
    # installing the named checks used by the typed model.
    op.execute("UPDATE plans SET lifecycle = lower(lifecycle)")
    op.execute("UPDATE plans SET title_source = lower(title_source)")
    op.execute("UPDATE plans SET last_working_view = lower(last_working_view)")
    op.execute("UPDATE plan_action_receipts SET result_status = lower(result_status)")

    # The casts preserve existing JSON text exactly as JSON values. PostgreSQL
    # reports the offending row when malformed legacy data is encountered.
    op.alter_column(
        "planning_briefs",
        "payload",
        existing_type=sa.Text(),
        type_=JSONB(),
        postgresql_using="payload::jsonb",
    )
    op.alter_column(
        "plan_action_receipts",
        "result_json",
        existing_type=sa.Text(),
        type_=JSONB(),
        postgresql_using="result_json::jsonb",
    )
    op.alter_column(
        "destination_pins",
        "latitude",
        existing_type=sa.Float(),
        type_=NUMERIC(precision=9, scale=6),
        postgresql_using="latitude::numeric(9,6)",
    )
    op.alter_column(
        "destination_pins",
        "longitude",
        existing_type=sa.Float(),
        type_=NUMERIC(precision=9, scale=6),
        postgresql_using="longitude::numeric(9,6)",
    )

    op.create_check_constraint(
        "ck_plans_lifecycle", "plans", "lifecycle IN ('active', 'deleted')"
    )
    op.create_check_constraint(
        "ck_plans_title_source", "plans", "title_source IN ('automatic', 'manual')"
    )
    op.create_check_constraint(
        "ck_plans_working_view",
        "plans",
        "last_working_view IN ('conversation', 'workspace')",
    )
    op.create_check_constraint(
        "ck_receipts_result_status",
        "plan_action_receipts",
        "result_status IN ('succeeded', 'conflict', 'gone')",
    )
    op.create_check_constraint(
        "ck_destination_latitude",
        "destination_pins",
        "latitude >= -90 AND latitude <= 90",
    )
    op.create_check_constraint(
        "ck_destination_longitude",
        "destination_pins",
        "longitude >= -180 AND longitude <= 180",
    )


def downgrade() -> None:
    op.drop_constraint("ck_destination_longitude", "destination_pins", type_="check")
    op.drop_constraint("ck_destination_latitude", "destination_pins", type_="check")
    op.drop_constraint(
        "ck_receipts_result_status", "plan_action_receipts", type_="check"
    )
    op.drop_constraint("ck_plans_working_view", "plans", type_="check")
    op.drop_constraint("ck_plans_title_source", "plans", type_="check")
    op.drop_constraint("ck_plans_lifecycle", "plans", type_="check")

    op.alter_column(
        "destination_pins",
        "longitude",
        existing_type=NUMERIC(precision=9, scale=6),
        type_=sa.Float(),
        postgresql_using="longitude::double precision",
    )
    op.alter_column(
        "destination_pins",
        "latitude",
        existing_type=NUMERIC(precision=9, scale=6),
        type_=sa.Float(),
        postgresql_using="latitude::double precision",
    )
    op.alter_column(
        "plan_action_receipts",
        "result_json",
        existing_type=JSONB(),
        type_=sa.Text(),
        postgresql_using="result_json::text",
    )
    op.alter_column(
        "planning_briefs",
        "payload",
        existing_type=JSONB(),
        type_=sa.Text(),
        postgresql_using="payload::text",
    )
