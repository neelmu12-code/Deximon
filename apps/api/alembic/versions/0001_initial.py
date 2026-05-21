"""schema v0: users, profiles, cards, binder, listings, conversations, messages

Revision ID: 0001_initial
Revises:
Create Date: 2026-02-16
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "0001_initial"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("email", sa.String(255), nullable=False, unique=True),
        sa.Column("username", sa.String(50), nullable=False, unique=True),
        sa.Column("password_hash", sa.String(255), nullable=True),
        sa.Column("google_subject", sa.String(255), nullable=True, unique=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_users_email", "users", ["email"])
    op.create_index("ix_users_username", "users", ["username"])

    op.create_table(
        "profiles",
        sa.Column("user_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("display_name", sa.String(80), nullable=True),
        sa.Column("bio", sa.String(500), nullable=True),
        sa.Column("avatar_url", sa.String(500), nullable=True),
        sa.Column("binder_public", sa.Boolean(), nullable=False, server_default=sa.true()),
    )

    op.create_table(
        "cards",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("owner_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("set_code", sa.String(20), nullable=True),
        sa.Column("number", sa.String(20), nullable=True),
        sa.Column("rarity", sa.String(40), nullable=True),
        sa.Column("condition", sa.String(20), nullable=True),
        sa.Column("language", sa.String(10), nullable=True),
        sa.Column("is_holo", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("is_reverse_holo", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("notes", sa.String(500), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_cards_owner_id", "cards", ["owner_id"])
    op.create_index("ix_cards_name", "cards", ["name"])
    op.create_index("ix_cards_set_code", "cards", ["set_code"])
    op.create_index("ix_cards_rarity", "cards", ["rarity"])

    op.create_table(
        "binder_pages",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("page_index", sa.Integer(), nullable=False),
        sa.UniqueConstraint("user_id", "page_index", name="uq_binder_pages_user_index"),
    )
    op.create_index("ix_binder_pages_user_id", "binder_pages", ["user_id"])

    op.create_table(
        "binder_slots",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("page_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("binder_pages.id", ondelete="CASCADE"), nullable=False),
        sa.Column("slot_index", sa.Integer(), nullable=False),
        sa.Column("card_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("cards.id", ondelete="SET NULL"), nullable=True, unique=True),
        sa.UniqueConstraint("page_id", "slot_index", name="uq_binder_slots_page_slot"),
        sa.CheckConstraint("slot_index >= 0 AND slot_index < 9", name="ck_binder_slots_index_range"),
    )
    op.create_index("ix_binder_slots_page_id", "binder_slots", ["page_id"])

    listing_status = postgresql.ENUM(
        "available", "on_hold", "sold", "cancelled", name="listing_status", create_type=False
    )
    listing_status.create(op.get_bind(), checkfirst=True)
    op.create_table(
        "listings",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("card_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("cards.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("seller_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("asking_price", sa.Numeric(10, 2), nullable=True),
        sa.Column("status", listing_status, nullable=False, server_default="available"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_listings_seller_id", "listings", ["seller_id"])

    op.create_table(
        "conversations",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("listing_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("listings.id", ondelete="CASCADE"), nullable=False),
        sa.Column("requester_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("listing_id", "requester_id", name="uq_conversations_listing_requester"),
    )
    op.create_index("ix_conversations_listing_id", "conversations", ["listing_id"])

    op.create_table(
        "messages",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("conversation_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("sender_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("body", sa.String(2000), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_messages_conversation_id", "messages", ["conversation_id"])
    op.create_index("ix_messages_created_at", "messages", ["created_at"])


def downgrade() -> None:
    op.drop_table("messages")
    op.drop_table("conversations")
    op.drop_table("listings")
    sa.Enum(name="listing_status").drop(op.get_bind(), checkfirst=True)
    op.drop_table("binder_slots")
    op.drop_table("binder_pages")
    op.drop_table("cards")
    op.drop_table("profiles")
    op.drop_table("users")
