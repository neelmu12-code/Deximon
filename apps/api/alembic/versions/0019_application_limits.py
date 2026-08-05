"""add durable application-wide usage counters

Revision ID: 0019_application_limits
Revises: 0018_review_comment_length_500
Create Date: 2026-08-05 00:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0019_application_limits"
down_revision: str | None = "0018_review_comment_length_500"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "application_counters",
        sa.Column("key", sa.String(length=50), nullable=False),
        sa.Column("value", sa.Integer(), nullable=False),
        sa.Column("period_start", sa.Date(), nullable=True),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "value >= 0",
            name="ck_application_counters_value_nonnegative",
        ),
        sa.PrimaryKeyConstraint("key"),
    )
    op.execute(
        sa.text(
            """
            INSERT INTO application_counters (key, value, period_start)
            SELECT 'total_accounts', COUNT(*), NULL
            FROM users
            """
        )
    )
    op.execute(
        sa.text(
            """
            INSERT INTO application_counters (key, value, period_start)
            VALUES ('daily_aws_scans', 0, CURRENT_DATE)
            """
        )
    )


def downgrade() -> None:
    op.drop_table("application_counters")
