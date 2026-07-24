"""post participants marker

Revision ID: 0015_post_participants_marker
Revises: 0014_add_conversation_participants
Create Date: 2026-07-24 03:44:52.006108

"""
from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = '0015_post_participants_marker'
down_revision: str | None = '0014_add_conversation_participants'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
