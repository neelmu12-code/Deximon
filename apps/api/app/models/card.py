from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import Boolean, DateTime, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Card(Base):
    """A specific card instance owned by a user (not a catalog entry — that lives in the TCG API)."""

    __tablename__ = "cards"

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    owner_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )

    name: Mapped[str] = mapped_column(String(120), nullable=False, index=True)
    set_code: Mapped[str | None] = mapped_column(String(20), nullable=True, index=True)
    number: Mapped[str | None] = mapped_column(String(20), nullable=True)
    rarity: Mapped[str | None] = mapped_column(String(40), nullable=True, index=True)
    condition: Mapped[str | None] = mapped_column(String(20), nullable=True)
    language: Mapped[str | None] = mapped_column(String(10), nullable=True)
    is_holo: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    is_reverse_holo: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    notes: Mapped[str | None] = mapped_column(String(500), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
