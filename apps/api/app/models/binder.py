from uuid import UUID, uuid4

from sqlalchemy import CheckConstraint, ForeignKey, Integer, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class BinderPage(Base):
    """An ordered page in a user's binder. Pages hold 9 slots (indexes 0–8)."""

    __tablename__ = "binder_pages"
    __table_args__ = (
        UniqueConstraint("user_id", "page_index", name="uq_binder_pages_user_index"),
    )

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    page_index: Mapped[int] = mapped_column(Integer, nullable=False)


class BinderSlot(Base):
    """A single slot on a page. (page_id, slot_index) is unique; slot_index ∈ [0, 8].
    `card_id` is nullable so a slot can be empty."""

    __tablename__ = "binder_slots"
    __table_args__ = (
        UniqueConstraint("page_id", "slot_index", name="uq_binder_slots_page_slot"),
        CheckConstraint("slot_index >= 0 AND slot_index < 9", name="ck_binder_slots_index_range"),
    )

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    page_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("binder_pages.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    slot_index: Mapped[int] = mapped_column(Integer, nullable=False)
    card_id: Mapped[UUID | None] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("cards.id", ondelete="SET NULL"),
        nullable=True,
        unique=True,
    )
