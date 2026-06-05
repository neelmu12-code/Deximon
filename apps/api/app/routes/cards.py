from typing import Annotated

import sqlalchemy as sa
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.tcg_card import TcgCard
from app.schemas.cards import CardSearchResult

router = APIRouter(prefix="/cards", tags=["cards"])
DbSession = Annotated[Session, Depends(get_db)]


@router.get("/search", response_model=list[CardSearchResult])
def search_cards(
    q: Annotated[str, Query(min_length=1, max_length=100)],
    db: DbSession,
    limit: Annotated[int, Query(ge=1, le=50)] = 24,
) -> list[CardSearchResult]:
    rows = db.scalars(
        sa.select(TcgCard)
        .where(
            sa.or_(
                TcgCard.name.ilike(f"%{q}%"),
                TcgCard.set_code.ilike(f"%{q}%"),
                TcgCard.number.ilike(f"%{q}%"),
            )
        )
        .order_by(
            # Exact-prefix matches first, then everything else alphabetically
            sa.case((TcgCard.name.ilike(f"{q}%"), 0), else_=1),
            TcgCard.name,
        )
        .limit(limit)
    ).all()

    return [
        CardSearchResult(
            id=row.id,
            name=row.name,
            set=row.set_code,
            set_name=row.set_name,
            num=row.number,
            rarity=row.rarity or "",
            image=row.image_small or row.image_large or "",
        )
        for row in rows
    ]
