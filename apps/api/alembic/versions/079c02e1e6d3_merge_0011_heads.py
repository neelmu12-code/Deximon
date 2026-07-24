"""merge 0011 heads

Revision ID: 079c02e1e6d3
Revises: 0011_card_full_art, 0011_profile_binder_cover
Create Date: 2026-07-24 03:44:52.006108

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '079c02e1e6d3'
down_revision: Union[str, None] = ('0011_card_full_art', '0011_profile_binder_cover')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
