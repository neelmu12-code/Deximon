"""post participants marker

Revision ID: 0015_post_participants_marker
Revises: 0014_add_conversation_participants
Create Date: 2026-07-24 03:44:52.006108

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '0015_post_participants_marker'
down_revision: Union[str, None] = '0014_add_conversation_participants'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
