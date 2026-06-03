"""profile extended fields: location, social handles

Revision ID: 0003_profile_extended_fields
Revises: 0002_auth_foundation
Create Date: 2026-06-03
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0003_profile_extended_fields"
down_revision = "0002_auth_foundation"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("profiles", sa.Column("location", sa.String(100), nullable=True))
    op.add_column("profiles", sa.Column("twitter_handle", sa.String(50), nullable=True))
    op.add_column("profiles", sa.Column("instagram_handle", sa.String(50), nullable=True))


def downgrade() -> None:
    op.drop_column("profiles", "instagram_handle")
    op.drop_column("profiles", "twitter_handle")
    op.drop_column("profiles", "location")
