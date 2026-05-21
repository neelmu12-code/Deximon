"""Idempotent dev seed. Creates a small set of users + cards + listings so the frontend
has something to render against. Safe to re-run."""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.models import (
    BinderPage,
    BinderSlot,
    Card,
    Listing,
    ListingStatus,
    Profile,
    User,
)


def _get_or_create_user(db: Session, email: str, username: str) -> User:
    existing = db.query(User).filter(User.email == email).one_or_none()
    if existing is not None:
        return existing
    user = User(email=email, username=username, password_hash="!seed!")
    db.add(user)
    db.flush()
    db.add(Profile(user_id=user.id, display_name=username.title(), binder_public=True))
    db.add(BinderPage(user_id=user.id, page_index=0))
    db.flush()
    return user


def seed() -> None:
    db = SessionLocal()
    try:
        alice = _get_or_create_user(db, "alice@example.com", "alice")
        bob = _get_or_create_user(db, "bob@example.com", "bob")

        if db.query(Card).filter(Card.owner_id == alice.id).count() == 0:
            charizard = Card(
                owner_id=alice.id,
                name="Charizard",
                set_code="base1",
                number="4",
                rarity="Rare Holo",
                condition="NM",
                language="EN",
                is_holo=True,
            )
            pikachu = Card(
                owner_id=alice.id,
                name="Pikachu",
                set_code="base1",
                number="58",
                rarity="Common",
                condition="LP",
                language="EN",
            )
            db.add_all([charizard, pikachu])
            db.flush()

            page = db.query(BinderPage).filter(BinderPage.user_id == alice.id).first()
            assert page is not None
            db.add_all([
                BinderSlot(page_id=page.id, slot_index=0, card_id=charizard.id),
                BinderSlot(page_id=page.id, slot_index=1, card_id=pikachu.id),
            ])
            db.add(
                Listing(
                    card_id=charizard.id,
                    seller_id=alice.id,
                    asking_price=250.00,
                    status=ListingStatus.AVAILABLE,
                )
            )

        db.commit()
        print(f"seed: users={db.query(User).count()} cards={db.query(Card).count()} "
              f"listings={db.query(Listing).count()}")
        # Make sure bob shows up in the log line above too
        _ = bob
    finally:
        db.close()


if __name__ == "__main__":
    seed()
