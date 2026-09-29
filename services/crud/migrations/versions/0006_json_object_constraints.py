"""Keep structured CRUD payloads as JSON objects rather than arrays/scalars."""

from alembic import op

revision = "0006"
down_revision = "0005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_check_constraint(
        "ck_planning_briefs_payload_object",
        "planning_briefs",
        "jsonb_typeof(payload) = 'object'",
    )
    op.create_check_constraint(
        "ck_receipts_result_json_object",
        "plan_action_receipts",
        "jsonb_typeof(result_json) = 'object'",
    )


def downgrade() -> None:
    op.drop_constraint(
        "ck_receipts_result_json_object", "plan_action_receipts", type_="check"
    )
    op.drop_constraint(
        "ck_planning_briefs_payload_object", "planning_briefs", type_="check"
    )
