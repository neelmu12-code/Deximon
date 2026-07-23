"""listing buyer

Adds listings.buyer_id so a sold listing records who bought it. The buyer is set
when the seller marks the listing sold from a specific buyer conversation, and
only that buyer may review the seller for the sale.

Also merges the two 0011 branches (card_full_art and profile_binder_cover), which
were authored in parallel and both point at 0010, so the tree has a single head.

Revision ID: 0012_listing_buyer
Revises: 0011_card_full_art, 0011_profile_binder_cover
Create Date: 2026-07-21
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0012_listing_buyer"
down_revision = ("0011_card_full_art", "0011_profile_binder_cover")
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "listings",
        sa.Column("buyer_id", sa.UUID(), nullable=True),
    )
    op.create_index(op.f("ix_listings_buyer_id"), "listings", ["buyer_id"])
    op.create_foreign_key(
        "fk_listings_buyer_id_users",
        "listings",
        "users",
        ["buyer_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint("fk_listings_buyer_id_users", "listings", type_="foreignkey")
    op.drop_index(op.f("ix_listings_buyer_id"), table_name="listings")
    op.drop_column("listings", "buyer_id")
