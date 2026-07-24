"""allow half-star seller reviews

Revision ID: 0016_half_star_reviews
Revises: 0015_post_participants_marker
Create Date: 2026-07-24 12:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0016_half_star_reviews"
down_revision: str | None = "0015_post_participants_marker"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.alter_column(
        "seller_reviews",
        "rating",
        existing_type=sa.Integer(),
        type_=sa.Numeric(2, 1),
        existing_nullable=False,
    )
    op.drop_constraint("ck_seller_reviews_rating", "seller_reviews", type_="check")
    op.create_check_constraint(
        "ck_seller_reviews_rating",
        "seller_reviews",
        "rating >= 0.5 AND rating <= 5",
    )


def downgrade() -> None:
    op.drop_constraint("ck_seller_reviews_rating", "seller_reviews", type_="check")
    # Round any half stars up to whole stars before narrowing the column back.
    op.execute("UPDATE seller_reviews SET rating = CEIL(rating)")
    op.alter_column(
        "seller_reviews",
        "rating",
        existing_type=sa.Numeric(2, 1),
        type_=sa.Integer(),
        existing_nullable=False,
        postgresql_using="rating::integer",
    )
    op.create_check_constraint(
        "ck_seller_reviews_rating",
        "seller_reviews",
        "rating >= 1 AND rating <= 5",
    )
