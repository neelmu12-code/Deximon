from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class TcgCard(Base):
    """Pokémon TCG card catalog entry. Populated once from pokemontcg.io; read-only at runtime."""

    __tablename__ = "tcg_cards"

    id: Mapped[str] = mapped_column(String(30), primary_key=True)  # e.g. "sv1-1"
    name: Mapped[str] = mapped_column(String(120), nullable=False, index=True)
    set_code: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    set_name: Mapped[str] = mapped_column(String(80), nullable=False)
    number: Mapped[str] = mapped_column(String(20), nullable=False)
    rarity: Mapped[str | None] = mapped_column(String(50), nullable=True)
    types: Mapped[str | None] = mapped_column(String(100), nullable=True)
    image_small: Mapped[str | None] = mapped_column(String(300), nullable=True)
    image_large: Mapped[str | None] = mapped_column(String(300), nullable=True)
