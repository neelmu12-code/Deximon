"""merge password reset and tcg catalog heads

Revision ID: 0005_merge_auth_and_tcg_heads
Revises: 0004_password_reset_tokens, 0004_tcg_card_catalog
Create Date: 2026-06-10
"""
from __future__ import annotations

revision = "0005_merge_auth_and_tcg_heads"
down_revision = ("0004_password_reset_tokens", "0004_tcg_card_catalog")
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
