"""0010_notification_review_type

Revision ID: 0010_notification_review_type
Revises: 0009_notifications_and_reviews
Create Date: 2026-06-25
"""
from __future__ import annotations

from alembic import op

revision = "0010_notification_review_type"
down_revision = "0009_notifications_and_reviews"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TYPE notificationtype ADD VALUE IF NOT EXISTS 'review'")


def downgrade() -> None:
    pass
