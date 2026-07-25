"""align seller review comment column with the model

Revision ID: 0018_review_comment_length_500
Revises: 0017_review_comment_length
Create Date: 2026-07-25 00:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0018_review_comment_length_500"
down_revision: str | None = "0017_review_comment_length"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.alter_column(
        "seller_reviews",
        "comment",
        existing_type=sa.String(1000),
        type_=sa.String(500),
        existing_nullable=True,
    )


def downgrade() -> None:
    op.alter_column(
        "seller_reviews",
        "comment",
        existing_type=sa.String(500),
        type_=sa.String(1000),
        existing_nullable=True,
    )
