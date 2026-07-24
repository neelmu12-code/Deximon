"""widen seller review comment column

Revision ID: 0017_review_comment_length
Revises: 0016_half_star_reviews
Create Date: 2026-07-24 13:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0017_review_comment_length"
down_revision: str | None = "0016_half_star_reviews"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.alter_column(
        "seller_reviews",
        "comment",
        existing_type=sa.String(500),
        type_=sa.String(1000),
        existing_nullable=True,
    )


def downgrade() -> None:
    op.execute("UPDATE seller_reviews SET comment = LEFT(comment, 500) WHERE comment IS NOT NULL")
    op.alter_column(
        "seller_reviews",
        "comment",
        existing_type=sa.String(1000),
        type_=sa.String(500),
        existing_nullable=True,
    )
