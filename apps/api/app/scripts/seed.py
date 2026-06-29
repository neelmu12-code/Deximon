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


def _image(number: str) -> str:
    return f"https://images.pokemontcg.io/base1/{number}_hires.png"


_BOB_LISTINGS = [
    ("Blastoise", "base1", "2", "Rare Holo", "Water", "NM", True, 380.00, ListingStatus.AVAILABLE),
    ("Venusaur", "base1", "15", "Rare Holo", "Grass", "LP", True, 285.00, ListingStatus.ON_HOLD),
    ("Mewtwo", "base1", "10", "Rare Holo", "Psychic", "MP", True, 245.00, ListingStatus.AVAILABLE),
    ("Gyarados", "base1", "6", "Rare Holo", "Water", "NM", True, 145.00, ListingStatus.AVAILABLE),
    ("Hitmonchan", "base1", "7", "Rare", "Fighting", "HP", False, 78.00, ListingStatus.SOLD),
]


def seed() -> None:
    db = SessionLocal()
    try:
        alice = _get_or_create_user(db, "alice@example.com", "alice")
        bob = _get_or_create_user(db, "bob@example.com", "bob")

        if db.query(Card).filter(Card.owner_id == bob.id).count() == 0:
            page = db.query(BinderPage).filter(BinderPage.user_id == bob.id).first()
            assert page is not None
            for slot_index, (
                name,
                set_code,
                number,
                rarity,
                card_type,
                condition,
                is_holo,
                price,
                listing_status,
            ) in enumerate(_BOB_LISTINGS):
                card = Card(
                    owner_id=bob.id,
                    name=name,
                    set_code=set_code,
                    number=number,
                    rarity=rarity,
                    card_type=card_type,
                    condition=condition,
                    language="EN",
                    is_holo=is_holo,
                    image_url=_image(number),
                )
                db.add(card)
                db.flush()
                db.add(BinderSlot(page_id=page.id, slot_index=slot_index, card_id=card.id))
                db.add(
                    Listing(
                        card_id=card.id,
                        seller_id=bob.id,
                        asking_price=price,
                        status=listing_status,
                    )
                )

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
    finally:
        db.close()


if __name__ == "__main__":
    seed()
