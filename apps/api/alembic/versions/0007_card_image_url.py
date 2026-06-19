"""card image url

Adds cards.image_url so owned card records can store the card image
from the TCG catalog at creation time.

Revision ID: 0007_card_image_url
Revises: 0006_listing_notes_and_card_type
Create Date: 2026-06-18
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0007_card_image_url"
down_revision = "0006_listing_notes_and_card_type"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("cards", sa.Column("image_url", sa.String(500), nullable=True))


def downgrade() -> None:
    op.drop_column("cards", "image_url")
