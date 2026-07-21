"""card full art

Adds cards.is_full_art so owned cards can record whether the artwork spans the
whole card (full-art holo promos, SIRs), which drives a distinct foil treatment
in the UI.

Revision ID: 0011_card_full_art
Revises: 0010_notification_review_type
Create Date: 2026-07-21
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0011_card_full_art"
down_revision = "0010_notification_review_type"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "cards",
        sa.Column("is_full_art", sa.Boolean(), nullable=False, server_default=sa.false()),
    )


def downgrade() -> None:
    op.drop_column("cards", "is_full_art")
