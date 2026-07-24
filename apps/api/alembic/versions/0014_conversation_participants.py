"""add conversation participants

Revision ID: 0014_conversation_participants
Revises: 0013_notification_review_prompt
Create Date: 2026-07-24 04:35:22.453077

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0014_conversation_participants"
down_revision: str | None = "0013_notification_review_prompt"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "conversation_participants",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("conversation_id", sa.UUID(), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("last_read_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["conversation_id"],
            ["conversations.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "conversation_id",
            "user_id",
            name="uq_conversation_participants_conversation_user",
        ),
    )
    op.create_index(
        op.f("ix_conversation_participants_conversation_id"),
        "conversation_participants",
        ["conversation_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_conversation_participants_user_id"),
        "conversation_participants",
        ["user_id"],
        unique=False,
    )

    # Existing conversations predate read tracking. Mark the deploy point as
    # read so users are notified only for messages arriving after this feature.
    op.execute(
        """
        INSERT INTO conversation_participants
            (id, conversation_id, user_id, last_read_at)
        SELECT gen_random_uuid(), conversations.id, conversations.requester_id, now()
        FROM conversations
        UNION ALL
        SELECT gen_random_uuid(), conversations.id, listings.seller_id, now()
        FROM conversations
        JOIN listings ON listings.id = conversations.listing_id
        ON CONFLICT (conversation_id, user_id) DO NOTHING
        """
    )


def downgrade() -> None:
    op.drop_index(
        op.f("ix_conversation_participants_user_id"),
        table_name="conversation_participants",
    )
    op.drop_index(
        op.f("ix_conversation_participants_conversation_id"),
        table_name="conversation_participants",
    )
    op.drop_table("conversation_participants")
