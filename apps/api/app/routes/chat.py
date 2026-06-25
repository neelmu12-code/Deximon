from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, status
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.security import decode_access_token
from app.db.session import SessionLocal, get_db
from app.dependencies.auth import get_current_user
from app.models.card import Card
from app.models.chat import Conversation, Message
from app.models.listing import Listing, ListingStatus
from app.models.notification import NotificationType
from app.models.user import User
from app.schemas.chat import (
    ConversationCreate,
    ConversationDetailResponse,
    ConversationResponse,
    MessageCreate,
    MessageResponse,
)
from app.services.notifications import actor_meta, create_notification

router = APIRouter(prefix="/conversations", tags=["chat"])
DbSession = Annotated[Session, Depends(get_db)]
CurrentUser = Annotated[User, Depends(get_current_user)]


def _message_response(db: Session, message: Message) -> MessageResponse:
    sender = db.get(User, message.sender_id)
    if sender is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Message sender not found")
    return MessageResponse(
        id=message.id,
        conversation_id=message.conversation_id,
        sender_id=message.sender_id,
        sender_username=sender.username,
        body=message.body,
        created_at=message.created_at,
    )


def _conversation_context(
    db: Session,
    conversation_id: UUID,
) -> tuple[Conversation, Listing, Card, User, User]:
    conversation = db.get(Conversation, conversation_id)
    if conversation is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")

    listing = db.get(Listing, conversation.listing_id)
    if listing is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found")

    card = db.get(Card, listing.card_id)
    requester = db.get(User, conversation.requester_id)
    seller = db.get(User, listing.seller_id)
    if card is None or requester is None or seller is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")

    return conversation, listing, card, requester, seller


def _require_participant(current_user: User, conversation: Conversation, listing: Listing) -> None:
    if current_user.id not in {conversation.requester_id, listing.seller_id}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your conversation")


async def _notify_message(
    db: Session,
    conversation: Conversation,
    listing: Listing,
    sender: User,
) -> None:
    recipient_id = (
        listing.seller_id if sender.id == conversation.requester_id else conversation.requester_id
    )
    card = db.get(Card, listing.card_id)
    card_name = card.name if card else "a listing"
    await create_notification(
        db,
        user_id=recipient_id,
        type=NotificationType.message,
        title=sender.username,
        body=f"sent you a message about {card_name}",
        meta={
            "conversation_id": str(conversation.id),
            "listing_id": str(listing.id),
            **actor_meta(sender),
        },
    )


def _conversation_response(
    db: Session,
    conversation: Conversation,
    include_messages: bool = False,
) -> ConversationResponse | ConversationDetailResponse:
    conversation, listing, card, requester, seller = _conversation_context(db, conversation.id)
    messages = list(
        db.scalars(
            select(Message)
            .where(Message.conversation_id == conversation.id)
            .order_by(Message.created_at)
        )
    )
    message_responses = [_message_response(db, message) for message in messages]
    last_message = message_responses[-1] if message_responses else None
    payload = {
        "id": conversation.id,
        "listing_id": conversation.listing_id,
        "requester_id": conversation.requester_id,
        "seller_id": listing.seller_id,
        "requester_username": requester.username,
        "seller_username": seller.username,
        "listing_card_name": card.name,
        "listing_status": listing.status,
        "last_message": last_message,
        "created_at": conversation.created_at,
    }
    if include_messages:
        return ConversationDetailResponse(**payload, messages=message_responses)
    return ConversationResponse(**payload)


@router.get("", response_model=list[ConversationResponse])
def list_conversations(current_user: CurrentUser, db: DbSession) -> list[ConversationResponse]:
    conversations = db.scalars(
        select(Conversation)
        .join(Listing, Conversation.listing_id == Listing.id)
        .where(
            or_(
                Conversation.requester_id == current_user.id,
                Listing.seller_id == current_user.id,
            )
        )
        .order_by(Conversation.created_at.desc())
    )
    return [
        response
        for conversation in conversations
        if isinstance((response := _conversation_response(db, conversation)), ConversationResponse)
    ]


@router.post("", response_model=ConversationResponse, status_code=status.HTTP_201_CREATED)
def create_conversation(
    payload: ConversationCreate,
    current_user: CurrentUser,
    db: DbSession,
) -> ConversationResponse:
    listing = db.get(Listing, payload.listing_id)
    if listing is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found")
    if listing.seller_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot open a buyer chat on your own listing",
        )
    if listing.status == ListingStatus.CANCELLED:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Listing is not available")

    conversation = db.scalar(
        select(Conversation).where(
            Conversation.listing_id == listing.id,
            Conversation.requester_id == current_user.id,
        )
    )
    created = False
    if conversation is None:
        conversation = Conversation(listing_id=listing.id, requester_id=current_user.id)
        db.add(conversation)
        db.commit()
        db.refresh(conversation)
        created = True

    response = _conversation_response(db, conversation)
    if not isinstance(response, ConversationResponse):
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Invalid response")
    if not created:
        return response
    return response


@router.get("/{conversation_id}", response_model=ConversationDetailResponse)
def get_conversation(
    conversation_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
) -> ConversationDetailResponse:
    conversation, listing, _card, _requester, _seller = _conversation_context(db, conversation_id)
    _require_participant(current_user, conversation, listing)
    response = _conversation_response(db, conversation, include_messages=True)
    if not isinstance(response, ConversationDetailResponse):
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Invalid response")
    return response


@router.get("/{conversation_id}/messages", response_model=list[MessageResponse])
def list_messages(
    conversation_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
) -> list[MessageResponse]:
    conversation, listing, _card, _requester, _seller = _conversation_context(db, conversation_id)
    _require_participant(current_user, conversation, listing)
    messages = db.scalars(
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .order_by(Message.created_at)
    )
    return [_message_response(db, message) for message in messages]


@router.post(
    "/{conversation_id}/messages",
    response_model=MessageResponse,
    status_code=status.HTTP_201_CREATED,
)
async def send_message(
    conversation_id: UUID,
    payload: MessageCreate,
    current_user: CurrentUser,
    db: DbSession,
) -> MessageResponse:
    conversation, listing, _card, _requester, _seller = _conversation_context(db, conversation_id)
    _require_participant(current_user, conversation, listing)

    body = payload.body.strip()
    if not body:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Message cannot be empty")

    message = Message(conversation_id=conversation.id, sender_id=current_user.id, body=body)
    db.add(message)
    db.commit()
    db.refresh(message)
    await _notify_message(db, conversation, listing, current_user)
    return _message_response(db, message)


@router.websocket("/{conversation_id}/ws")
async def conversation_websocket(websocket: WebSocket, conversation_id: UUID) -> None:
    settings = get_settings()
    token = websocket.query_params.get("token") or websocket.cookies.get(settings.auth_cookie_name)
    if not token:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    try:
        claims = decode_access_token(token, settings)
        user_id = UUID(str(claims["sub"]))
    except (KeyError, TypeError, ValueError):
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    db = SessionLocal()
    try:
        user = db.get(User, user_id)
        if user is None or not user.is_active:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return
        conversation, listing, _card, _requester, _seller = _conversation_context(db, conversation_id)
        _require_participant(user, conversation, listing)

        await websocket.accept()
        await websocket.send_json({"type": "ready", "conversation_id": str(conversation_id)})
        while True:
            body = (await websocket.receive_text()).strip()
            if not body:
                continue
            message = Message(conversation_id=conversation.id, sender_id=user.id, body=body[:2000])
            db.add(message)
            db.commit()
            db.refresh(message)
            await _notify_message(db, conversation, listing, user)
            await websocket.send_json(
                {
                    "type": "message",
                    "message": _message_response(db, message).model_dump(mode="json"),
                }
            )
    except HTTPException:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
    except WebSocketDisconnect:
        return
    finally:
        db.close()
