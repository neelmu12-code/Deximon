"""notification review_prompt type

Adds the review_prompt notification type, sent to the recorded buyer when a
seller closes a sale so they can leave a review.

Revision ID: 0013_notification_review_prompt
Revises: 0012_listing_buyer
Create Date: 2026-07-23
"""
from __future__ import annotations

from alembic import op

revision = "0013_notification_review_prompt"
down_revision = "0012_listing_buyer"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TYPE notificationtype ADD VALUE IF NOT EXISTS 'review_prompt'")


def downgrade() -> None:
    pass
