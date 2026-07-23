"""profile binder cover

Adds profiles.binder_cover (JSONB) so a user's binder cover choice
(colour/image + embossed-name toggle) persists server-side instead of
living only in the browser's localStorage.

Revision ID: 0011_profile_binder_cover
Revises: 0010_notification_review_type
Create Date: 2026-07-23
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "0011_profile_binder_cover"
down_revision = "0010_notification_review_type"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "profiles",
        sa.Column("binder_cover", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("profiles", "binder_cover")
