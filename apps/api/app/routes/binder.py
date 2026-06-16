from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Path, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.dependencies.auth import get_current_user
from app.models.binder import BinderPage, BinderSlot
from app.models.card import Card
from app.models.user import User
from app.schemas.binder import (
    BinderMoveRequest,
    BinderPageResponse,
    BinderResponse,
    BinderSlotResponse,
    BinderSlotSetRequest,
    HoloType,
    OwnedCardCreate,
    OwnedCardResponse,
)

router = APIRouter(prefix="/binder", tags=["binder"])
DbSession = Annotated[Session, Depends(get_db)]
CurrentUser = Annotated[User, Depends(get_current_user)]
PageIndex = Annotated[int, Path(ge=0)]
SlotIndex = Annotated[int, Path(ge=0, le=8)]


def _holo_type(card: Card) -> HoloType:
    if card.is_reverse_holo:
        return "reverse_holo"
    if card.is_holo:
        return "holo"
    return "normal"


def _card_response(card: Card) -> OwnedCardResponse:
    return OwnedCardResponse(
        id=card.id,
        owner_id=card.owner_id,
        name=card.name,
        set_code=card.set_code,
        number=card.number,
        rarity=card.rarity,
        card_type=card.card_type,
        condition=card.condition,
        language=card.language,
        holo_type=_holo_type(card),
        notes=card.notes,
        created_at=card.created_at,
    )


def _get_owned_card(db: Session, user_id: UUID, card_id: UUID) -> Card:
    card = db.get(Card, card_id)
    if card is None or card.owner_id != user_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Card not found")
    return card


def _get_or_create_page(db: Session, user_id: UUID, page_index: int) -> BinderPage:
    page = db.scalar(
        select(BinderPage).where(
            BinderPage.user_id == user_id,
            BinderPage.page_index == page_index,
        )
    )
    if page is not None:
        return page

    page = BinderPage(user_id=user_id, page_index=page_index)
    db.add(page)
    db.flush()
    return page


def _binder_response(db: Session, user_id: UUID) -> BinderResponse:
    pages = list(
        db.scalars(
            select(BinderPage)
            .where(BinderPage.user_id == user_id)
            .order_by(BinderPage.page_index)
        )
    )
    if not pages:
        pages = [_get_or_create_page(db, user_id, 0)]
        db.commit()

    page_ids = [page.id for page in pages]
    slots = (
        list(db.scalars(select(BinderSlot).where(BinderSlot.page_id.in_(page_ids))))
        if page_ids
        else []
    )
    card_ids = [slot.card_id for slot in slots if slot.card_id is not None]
    cards = (
        list(db.scalars(select(Card).where(Card.id.in_(card_ids))))
        if card_ids
        else []
    )
    cards_by_id = {card.id: card for card in cards}
    slots_by_page = {
        page.id: {slot.slot_index: slot for slot in slots if slot.page_id == page.id}
        for page in pages
    }

    return BinderResponse(
        owner_id=user_id,
        pages=[
            BinderPageResponse(
                page_index=page.page_index,
                slots=[
                    BinderSlotResponse(
                        slot_index=slot_index,
                        card=(
                            _card_response(cards_by_id[slot.card_id])
                            if (slot := slots_by_page[page.id].get(slot_index))
                            and slot.card_id is not None
                            and slot.card_id in cards_by_id
                            else None
                        ),
                    )
                    for slot_index in range(9)
                ],
            )
            for page in pages
        ],
    )


@router.get("/me", response_model=BinderResponse)
def get_my_binder(current_user: CurrentUser, db: DbSession) -> BinderResponse:
    return _binder_response(db, current_user.id)


@router.get("/cards", response_model=list[OwnedCardResponse])
def list_my_cards(current_user: CurrentUser, db: DbSession) -> list[OwnedCardResponse]:
    cards = db.scalars(
        select(Card).where(Card.owner_id == current_user.id).order_by(Card.created_at.desc())
    )
    return [_card_response(card) for card in cards]


@router.post("/cards", response_model=OwnedCardResponse, status_code=status.HTTP_201_CREATED)
def create_owned_card(
    payload: OwnedCardCreate,
    current_user: CurrentUser,
    db: DbSession,
) -> OwnedCardResponse:
    card = Card(
        owner_id=current_user.id,
        name=payload.name.strip(),
        set_code=payload.set_code,
        number=payload.number,
        rarity=payload.rarity,
        card_type=payload.card_type,
        condition=payload.condition,
        language=payload.language,
        is_holo=payload.holo_type == "holo",
        is_reverse_holo=payload.holo_type == "reverse_holo",
        notes=payload.notes,
    )
    db.add(card)
    db.commit()
    db.refresh(card)
    return _card_response(card)


@router.put("/pages/{page_index}/slots/{slot_index}", response_model=BinderResponse)
def set_binder_slot(
    page_index: PageIndex,
    slot_index: SlotIndex,
    payload: BinderSlotSetRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> BinderResponse:
    page = _get_or_create_page(db, current_user.id, page_index)
    slot = db.scalar(
        select(BinderSlot).where(
            BinderSlot.page_id == page.id,
            BinderSlot.slot_index == slot_index,
        )
    )

    if payload.card_id is not None:
        _get_owned_card(db, current_user.id, payload.card_id)
        existing_slot = db.scalar(
            select(BinderSlot)
            .join(BinderPage, BinderSlot.page_id == BinderPage.id)
            .where(
                BinderPage.user_id == current_user.id,
                BinderSlot.card_id == payload.card_id,
            )
        )
        if existing_slot is not None and (
            existing_slot.page_id != page.id or existing_slot.slot_index != slot_index
        ):
            existing_slot.card_id = None
            db.flush()

    if slot is None:
        db.add(BinderSlot(page_id=page.id, slot_index=slot_index, card_id=payload.card_id))
    else:
        slot.card_id = payload.card_id

    db.commit()
    return _binder_response(db, current_user.id)


@router.post("/move", response_model=BinderResponse)
def move_binder_card(
    payload: BinderMoveRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> BinderResponse:
    if (
        payload.from_page_index == payload.to_page_index
        and payload.from_slot_index == payload.to_slot_index
    ):
        return _binder_response(db, current_user.id)

    source_page = db.scalar(
        select(BinderPage).where(
            BinderPage.user_id == current_user.id,
            BinderPage.page_index == payload.from_page_index,
        )
    )
    if source_page is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Source slot not found")

    source_slot = db.scalar(
        select(BinderSlot).where(
            BinderSlot.page_id == source_page.id,
            BinderSlot.slot_index == payload.from_slot_index,
        )
    )
    if source_slot is None or source_slot.card_id is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Source slot is empty")

    target_page = _get_or_create_page(db, current_user.id, payload.to_page_index)
    target_slot = db.scalar(
        select(BinderSlot).where(
            BinderSlot.page_id == target_page.id,
            BinderSlot.slot_index == payload.to_slot_index,
        )
    )

    moving_card_id = source_slot.card_id
    target_card_id = target_slot.card_id if target_slot is not None else None
    source_slot.card_id = None
    if target_slot is not None:
        target_slot.card_id = None
    db.flush()

    if target_slot is None:
        target_slot = BinderSlot(
            page_id=target_page.id,
            slot_index=payload.to_slot_index,
            card_id=moving_card_id,
        )
        db.add(target_slot)
    else:
        target_slot.card_id = moving_card_id
    source_slot.card_id = target_card_id

    db.commit()
    return _binder_response(db, current_user.id)
