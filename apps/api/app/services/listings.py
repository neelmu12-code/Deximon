"""Listing status transitions, shared by the marketplace and chat routes."""

from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.card import Card
from app.models.chat import Conversation
from app.models.listing import Listing, ListingStatus
from app.models.notification import NotificationType
from app.models.user import User
from app.services.notifications import actor_meta, create_notification

# "on_hold" is the pending state: available and pending toggle freely, and either
# can be closed as sold or cancelled. Sold and cancelled are terminal.
ALLOWED_STATUS_TRANSITIONS: dict[ListingStatus, set[ListingStatus]] = {
    ListingStatus.AVAILABLE: {
        ListingStatus.ON_HOLD,
        ListingStatus.SOLD,
        ListingStatus.CANCELLED,
    },
    ListingStatus.ON_HOLD: {
        ListingStatus.AVAILABLE,
        ListingStatus.SOLD,
        ListingStatus.CANCELLED,
    },
    ListingStatus.SOLD: set(),
    ListingStatus.CANCELLED: set(),
}


def ensure_valid_transition(current: ListingStatus, new: ListingStatus) -> None:
    if new != current and new not in ALLOWED_STATUS_TRANSITIONS[current]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid listing status transition",
        )


def ensure_buyer_of_listing(db: Session, listing: Listing, buyer_id: UUID) -> None:
    """Check that `buyer_id` opened a chat on this listing.

    Without it a seller could hand review rights to any user id they liked.
    """
    if buyer_id == listing.seller_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot record yourself as the buyer",
        )
    conversation = db.scalar(
        select(Conversation.id).where(
            Conversation.listing_id == listing.id,
            Conversation.requester_id == buyer_id,
        )
    )
    if conversation is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="That buyer has no conversation on this listing",
        )


async def notify_listing_status_change(db: Session, listing: Listing, actor: User) -> None:
    """Tell everyone chatting on this listing that its status changed.

    A closed sale reads differently depending who you are: the recorded buyer is
    asked for a review, everyone else is told the card is gone.
    """
    card = db.get(Card, listing.card_id)
    card_name = card.name if card else "a listing"
    conversations = db.scalars(select(Conversation).where(Conversation.listing_id == listing.id))
    closed = listing.status in {ListingStatus.SOLD, ListingStatus.CANCELLED}

    for conversation in conversations:
        if conversation.requester_id == actor.id:
            continue

        base_meta = {
            "listing_id": str(listing.id),
            "conversation_id": str(conversation.id),
            "status": listing.status.value,
            **actor_meta(actor),
        }

        if listing.status == ListingStatus.SOLD and listing.buyer_id == conversation.requester_id:
            await create_notification(
                db,
                user_id=conversation.requester_id,
                type=NotificationType.review_prompt,
                title=actor.username,
                body=f"sold you {card_name} — leave a review",
                meta={**base_meta, "seller_username": actor.username},
            )
            continue

        if closed:
            verb = "sold" if listing.status == ListingStatus.SOLD else "removed"
            body = f"{verb} {card_name} — no longer available"
        else:
            body = f"changed {card_name} to {listing.status.value.replace('_', ' ')}"

        await create_notification(
            db,
            user_id=conversation.requester_id,
            type=NotificationType.listing_status,
            title=actor.username,
            body=body,
            meta=base_meta,
        )
