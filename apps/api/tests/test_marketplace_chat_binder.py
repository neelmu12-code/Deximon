from uuid import UUID

from fastapi.testclient import TestClient


def register_user(client: TestClient, email: str, username: str) -> dict[str, object]:
    response = client.post(
        "/auth/register",
        json={
            "email": email,
            "username": username,
            "display_name": username.title(),
            "password": "Starmie123!",
        },
    )
    assert response.status_code == 201
    return response.json()


def auth_headers(auth_body: dict[str, object]) -> dict[str, str]:
    return {"Authorization": f"Bearer {auth_body['access_token']}"}


def create_card(
    client: TestClient,
    headers: dict[str, str],
    name: str = "Charizard",
    set_code: str = "base1",
    rarity: str = "Rare Holo",
    card_type: str = "Fire",
) -> dict[str, object]:
    response = client.post(
        "/binder/cards",
        headers=headers,
        json={
            "name": name,
            "set_code": set_code,
            "number": "4",
            "rarity": rarity,
            "card_type": card_type,
            "condition": "NM",
            "language": "EN",
            "holo_type": "holo",
        },
    )
    assert response.status_code == 201
    assert response.json()["card_type"] == card_type
    return response.json()


def create_listing(
    client: TestClient,
    headers: dict[str, str],
    card_id: str,
    asking_price: str = "250.00",
    notes: str | None = None,
) -> dict[str, object]:
    body: dict[str, object] = {"card_id": card_id, "asking_price": asking_price}
    if notes is not None:
        body["notes"] = notes
    response = client.post("/market/listings", headers=headers, json=body)
    assert response.status_code == 201
    return response.json()


def test_binder_card_create_assign_and_move_requires_auth(client: TestClient) -> None:
    assert client.get("/binder/me").status_code == 401
    seller = register_user(client, "seller@example.com", "seller")
    headers = auth_headers(seller)

    card = create_card(client, headers)
    response = client.put(
        "/binder/pages/0/slots/0",
        headers=headers,
        json={"card_id": card["id"]},
    )
    assert response.status_code == 200
    assert response.json()["pages"][0]["slots"][0]["card"]["name"] == "Charizard"

    moved = client.post(
        "/binder/move",
        headers=headers,
        json={
            "from_page_index": 0,
            "from_slot_index": 0,
            "to_page_index": 0,
            "to_slot_index": 2,
        },
    )
    assert moved.status_code == 200
    slots = moved.json()["pages"][0]["slots"]
    assert slots[0]["card"] is None
    assert slots[2]["card"]["id"] == card["id"]


def test_marketplace_listing_search_ownership_and_status_transitions(client: TestClient) -> None:
    seller = register_user(client, "seller@example.com", "seller")
    buyer = register_user(client, "buyer@example.com", "buyer")
    seller_headers = auth_headers(seller)
    buyer_headers = auth_headers(buyer)
    card = create_card(client, seller_headers)

    listing = create_listing(client, seller_headers, str(card["id"]), notes="Mint, pack-fresh.")
    assert listing["card"]["name"] == "Charizard"
    assert listing["card"]["card_type"] == "Fire"
    assert listing["seller"]["username"] == "seller"
    assert listing["status"] == "available"
    assert listing["notes"] == "Mint, pack-fresh."

    duplicate = client.post(
        "/market/listings",
        headers=seller_headers,
        json={"card_id": card["id"], "asking_price": "199.00"},
    )
    assert duplicate.status_code == 409

    search = client.get("/market/listings?q=char")
    assert search.status_code == 200
    assert search.json()[0]["id"] == listing["id"]

    forbidden = client.patch(
        f"/market/listings/{listing['id']}",
        headers=buyer_headers,
        json={"status": "sold"},
    )
    assert forbidden.status_code == 403

    on_hold = client.patch(
        f"/market/listings/{listing['id']}",
        headers=seller_headers,
        json={"status": "on_hold"},
    )
    assert on_hold.status_code == 200
    assert on_hold.json()["status"] == "on_hold"

    sold = client.patch(
        f"/market/listings/{listing['id']}",
        headers=seller_headers,
        json={"status": "sold"},
    )
    assert sold.status_code == 200

    reopened = client.patch(
        f"/market/listings/{listing['id']}",
        headers=seller_headers,
        json={"status": "available"},
    )
    assert reopened.status_code == 400


def test_listing_scoped_conversation_and_messages(client: TestClient) -> None:
    seller = register_user(client, "seller@example.com", "seller")
    buyer = register_user(client, "buyer@example.com", "buyer")
    outsider = register_user(client, "outsider@example.com", "outsider")
    seller_headers = auth_headers(seller)
    buyer_headers = auth_headers(buyer)
    outsider_headers = auth_headers(outsider)
    card = create_card(client, seller_headers, "Pikachu")
    listing = create_listing(client, seller_headers, str(card["id"]), "12.50")

    own_listing_chat = client.post(
        "/conversations",
        headers=seller_headers,
        json={"listing_id": listing["id"]},
    )
    assert own_listing_chat.status_code == 400

    conversation = client.post(
        "/conversations",
        headers=buyer_headers,
        json={"listing_id": listing["id"]},
    )
    assert conversation.status_code == 201
    conversation_id = UUID(conversation.json()["id"])

    message = client.post(
        f"/conversations/{conversation_id}/messages",
        headers=buyer_headers,
        json={"body": "Is this still available?"},
    )
    assert message.status_code == 201
    assert message.json()["sender_username"] == "buyer"

    seller_view = client.get(f"/conversations/{conversation_id}", headers=seller_headers)
    assert seller_view.status_code == 200
    assert seller_view.json()["messages"][0]["body"] == "Is this still available?"

    outsider_view = client.get(f"/conversations/{conversation_id}", headers=outsider_headers)
    assert outsider_view.status_code == 403


def test_marketplace_filters_by_set_rarity_and_type(client: TestClient) -> None:
    seller = register_user(client, "seller@example.com", "seller")
    headers = auth_headers(seller)

    fire = create_card(
        client, headers, name="Charizard", set_code="base1", rarity="Rare Holo", card_type="Fire"
    )
    water = create_card(
        client, headers, name="Blastoise", set_code="base1", rarity="Rare", card_type="Water"
    )
    psychic = create_card(
        client, headers, name="Mewtwo", set_code="jungle", rarity="Rare Holo", card_type="Psychic"
    )
    for card in (fire, water, psychic):
        create_listing(client, headers, str(card["id"]))

    by_type = client.get("/market/listings?type=Water")
    assert by_type.status_code == 200
    assert [row["card"]["name"] for row in by_type.json()] == ["Blastoise"]

    by_set = client.get("/market/listings?set=jungle")
    assert [row["card"]["name"] for row in by_set.json()] == ["Mewtwo"]

    by_rarity = client.get("/market/listings?rarity=Rare Holo")
    names = sorted(row["card"]["name"] for row in by_rarity.json())
    assert names == ["Charizard", "Mewtwo"]


def test_listing_notes_update_and_cancelled_hidden_from_default_search(client: TestClient) -> None:
    seller = register_user(client, "seller@example.com", "seller")
    headers = auth_headers(seller)
    card = create_card(client, headers)
    listing = create_listing(client, headers, str(card["id"]), notes="Original note")

    updated = client.patch(
        f"/market/listings/{listing['id']}",
        headers=headers,
        json={"notes": "Updated note", "asking_price": "300.00"},
    )
    assert updated.status_code == 200
    assert updated.json()["notes"] == "Updated note"
    assert updated.json()["asking_price"] == 300.0

    cancelled = client.patch(
        f"/market/listings/{listing['id']}",
        headers=headers,
        json={"status": "cancelled"},
    )
    assert cancelled.status_code == 200

    # Default search excludes cancelled listings...
    default_search = client.get("/market/listings")
    assert all(row["status"] != "cancelled" for row in default_search.json())
    # ...but an explicit status filter can still surface them.
    explicit = client.get("/market/listings?status=cancelled")
    assert [row["id"] for row in explicit.json()] == [listing["id"]]
