"""listing notes and owned-card type

Adds:
- cards.card_type      single primary energy/card type, used by marketplace filtering
- listings.notes       free-text listing notes (asking price + notes per design doc)

Revision ID: 0006_listing_notes_and_card_type
Revises: 0005_merge_auth_and_tcg_heads
Create Date: 2026-06-16
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0006_listing_notes_and_card_type"
down_revision = "0005_merge_auth_and_tcg_heads"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("cards", sa.Column("card_type", sa.String(40), nullable=True))
    op.create_index("ix_cards_card_type", "cards", ["card_type"])
    op.add_column("listings", sa.Column("notes", sa.String(500), nullable=True))


def downgrade() -> None:
    op.drop_column("listings", "notes")
    op.drop_index("ix_cards_card_type", table_name="cards")
    op.drop_column("cards", "card_type")
