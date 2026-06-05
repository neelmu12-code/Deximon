"""tcg_card_catalog: pokemontcg.io reference data

Revision ID: 0004_tcg_card_catalog
Revises: 0003_profile_extended_fields
Create Date: 2026-06-05
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0004_tcg_card_catalog"
down_revision = "0003_profile_extended_fields"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "tcg_cards",
        sa.Column("id", sa.String(30), primary_key=True),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("set_code", sa.String(20), nullable=False),
        sa.Column("set_name", sa.String(80), nullable=False),
        sa.Column("number", sa.String(20), nullable=False),
        sa.Column("rarity", sa.String(50), nullable=True),
        sa.Column("types", sa.String(100), nullable=True),
        sa.Column("image_small", sa.String(300), nullable=True),
        sa.Column("image_large", sa.String(300), nullable=True),
    )
    op.create_index("ix_tcg_cards_name", "tcg_cards", ["name"])
    op.create_index("ix_tcg_cards_set_code", "tcg_cards", ["set_code"])


def downgrade() -> None:
    op.drop_index("ix_tcg_cards_set_code", table_name="tcg_cards")
    op.drop_index("ix_tcg_cards_name", table_name="tcg_cards")
    op.drop_table("tcg_cards")
