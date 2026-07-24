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


def complete_sale(
    client: TestClient,
    seller_headers: dict[str, str],
    buyer_headers: dict[str, str],
    card_name: str = "Charizard",
) -> dict[str, object]:
    """Drive a listing to sold from the buyer's chat, which records them as buyer."""
    card = create_card(client, seller_headers, card_name)
    listing = create_listing(client, seller_headers, str(card["id"]))
    conversation = client.post(
        "/conversations",
        headers=buyer_headers,
        json={"listing_id": listing["id"]},
    )
    assert conversation.status_code == 201
    sold = client.patch(
        f"/conversations/{conversation.json()['id']}/listing-status",
        headers=seller_headers,
        json={"status": "sold"},
    )
    assert sold.status_code == 200
    return listing


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


def test_rest_message_broadcasts_to_participant_websocket(client: TestClient) -> None:
    seller = register_user(client, "seller@example.com", "seller")
    buyer = register_user(client, "buyer@example.com", "buyer")
    seller_headers = auth_headers(seller)
    buyer_headers = auth_headers(buyer)
    card = create_card(client, seller_headers, "Pikachu")
    listing = create_listing(client, seller_headers, str(card["id"]), "12.50")
    conversation = client.post(
        "/conversations",
        headers=buyer_headers,
        json={"listing_id": listing["id"]},
    ).json()

    websocket_url = f"/conversations/{conversation['id']}/ws?token={seller['access_token']}"
    with client.websocket_connect(websocket_url) as seller_socket:
        assert seller_socket.receive_json()["type"] == "ready"

        response = client.post(
            f"/conversations/{conversation['id']}/messages",
            headers=buyer_headers,
            json={"body": "Is this still available?"},
        )
        assert response.status_code == 201

        event = seller_socket.receive_json()
        assert event["type"] == "message"
        assert event["message"]["id"] == response.json()["id"]
        assert event["message"]["sender_username"] == "buyer"


def test_conversation_unread_counts_clear_when_opened(client: TestClient) -> None:
    seller = register_user(client, "seller@example.com", "seller")
    buyer = register_user(client, "buyer@example.com", "buyer")
    seller_headers = auth_headers(seller)
    buyer_headers = auth_headers(buyer)
    card = create_card(client, seller_headers, "Pikachu")
    listing = create_listing(client, seller_headers, str(card["id"]), "12.50")
    conversation = client.post(
        "/conversations",
        headers=buyer_headers,
        json={"listing_id": listing["id"]},
    ).json()
    conversation_id = conversation["id"]

    sent = client.post(
        f"/conversations/{conversation_id}/messages",
        headers=buyer_headers,
        json={"body": "Is this still available?"},
    )
    assert sent.status_code == 201

    seller_unread = client.get("/conversations/unread-count", headers=seller_headers)
    buyer_unread = client.get("/conversations/unread-count", headers=buyer_headers)
    assert seller_unread.json() == {"unread_count": 1}
    assert buyer_unread.json() == {"unread_count": 0}

    seller_inbox = client.get("/conversations", headers=seller_headers)
    assert seller_inbox.status_code == 200
    assert seller_inbox.json()[0]["unread_count"] == 1

    opened = client.get(f"/conversations/{conversation_id}", headers=seller_headers)
    assert opened.status_code == 200
    assert opened.json()["unread_count"] == 0
    assert client.get(
        "/conversations/unread-count",
        headers=seller_headers,
    ).json() == {"unread_count": 0}


def test_websocket_message_broadcasts_to_both_participants(client: TestClient) -> None:
    seller = register_user(client, "seller@example.com", "seller")
    buyer = register_user(client, "buyer@example.com", "buyer")
    seller_headers = auth_headers(seller)
    buyer_headers = auth_headers(buyer)
    card = create_card(client, seller_headers, "Pikachu")
    listing = create_listing(client, seller_headers, str(card["id"]), "12.50")
    conversation = client.post(
        "/conversations",
        headers=buyer_headers,
        json={"listing_id": listing["id"]},
    ).json()
    conversation_id = conversation["id"]

    seller_url = f"/conversations/{conversation_id}/ws?token={seller['access_token']}"
    buyer_url = f"/conversations/{conversation_id}/ws"
    with client.websocket_connect(seller_url) as seller_socket:
        assert seller_socket.receive_json()["type"] == "ready"
        with client.websocket_connect(buyer_url) as buyer_socket:
            assert buyer_socket.receive_json()["type"] == "ready"

            buyer_socket.send_text("Can you ship this tomorrow?")
            seller_event = seller_socket.receive_json()
            buyer_event = buyer_socket.receive_json()

    assert seller_event["type"] == "message"
    assert buyer_event == seller_event
    assert seller_event["message"]["sender_username"] == "buyer"
    assert seller_event["message"]["body"] == "Can you ship this tomorrow?"

    persisted = client.get(
        f"/conversations/{conversation_id}",
        headers=seller_headers,
    )
    assert persisted.status_code == 200
    assert persisted.json()["messages"][-1]["id"] == seller_event["message"]["id"]


def test_seller_marks_listing_sold_from_chat_and_records_buyer(client: TestClient) -> None:
    seller = register_user(client, "seller@example.com", "seller")
    buyer = register_user(client, "buyer@example.com", "buyer")
    seller_headers = auth_headers(seller)
    buyer_headers = auth_headers(buyer)
    card = create_card(client, seller_headers)
    listing = create_listing(client, seller_headers, str(card["id"]))
    conversation = client.post(
        "/conversations", headers=buyer_headers, json={"listing_id": listing["id"]}
    )
    conversation_id = conversation.json()["id"]

    buyer_attempt = client.patch(
        f"/conversations/{conversation_id}/listing-status",
        headers=buyer_headers,
        json={"status": "sold"},
    )
    assert buyer_attempt.status_code == 403

    # Pending is not a sale, so it must not record a buyer.
    pending = client.patch(
        f"/conversations/{conversation_id}/listing-status",
        headers=seller_headers,
        json={"status": "on_hold"},
    )
    assert pending.status_code == 200
    assert pending.json()["listing_status"] == "on_hold"
    assert pending.json()["listing_buyer_id"] is None

    reopened = client.patch(
        f"/conversations/{conversation_id}/listing-status",
        headers=seller_headers,
        json={"status": "available"},
    )
    assert reopened.status_code == 200
    assert reopened.json()["listing_status"] == "available"

    sold = client.patch(
        f"/conversations/{conversation_id}/listing-status",
        headers=seller_headers,
        json={"status": "sold"},
    )
    assert sold.status_code == 200
    assert sold.json()["listing_status"] == "sold"
    assert sold.json()["listing_buyer_id"] == buyer["user"]["id"]


def test_marketplace_hides_pending_and_sold_listings(client: TestClient) -> None:
    seller = register_user(client, "seller@example.com", "seller")
    buyer = register_user(client, "buyer@example.com", "buyer")
    seller_headers = auth_headers(seller)
    buyer_headers = auth_headers(buyer)
    card = create_card(client, seller_headers)
    listing = create_listing(client, seller_headers, str(card["id"]))
    conversation = client.post(
        "/conversations", headers=buyer_headers, json={"listing_id": listing["id"]}
    )
    conversation_id = conversation.json()["id"]

    assert [row["id"] for row in client.get("/market/listings").json()] == [listing["id"]]

    client.patch(
        f"/conversations/{conversation_id}/listing-status",
        headers=seller_headers,
        json={"status": "on_hold"},
    )
    # Hidden from the default view, still reachable with an explicit filter.
    assert client.get("/market/listings").json() == []
    assert [row["id"] for row in client.get("/market/listings?status=on_hold").json()] == [
        listing["id"]
    ]

    client.patch(
        f"/conversations/{conversation_id}/listing-status",
        headers=seller_headers,
        json={"status": "available"},
    )
    assert [row["id"] for row in client.get("/market/listings").json()] == [listing["id"]]

    client.patch(
        f"/conversations/{conversation_id}/listing-status",
        headers=seller_headers,
        json={"status": "sold"},
    )
    assert client.get("/market/listings").json() == []


def test_seller_marks_sold_with_chosen_buyer_from_the_listing(client: TestClient) -> None:
    """The listing page route: mark sold and name which chatter bought it."""
    seller = register_user(client, "seller@example.com", "seller")
    buyer = register_user(client, "buyer@example.com", "buyer")
    bystander = register_user(client, "bystander@example.com", "bystander")
    seller_headers = auth_headers(seller)
    card = create_card(client, seller_headers)
    listing = create_listing(client, seller_headers, str(card["id"]))
    for user in (buyer, bystander):
        client.post(
            "/conversations", headers=auth_headers(user), json={"listing_id": listing["id"]}
        )

    # This is what fills the seller's "who did you sell to?" picker.
    interested = client.get(f"/conversations?listing_id={listing['id']}", headers=seller_headers)
    assert interested.status_code == 200
    assert {row["requester_username"] for row in interested.json()} == {"buyer", "bystander"}

    sold = client.patch(
        f"/market/listings/{listing['id']}",
        headers=seller_headers,
        json={"status": "sold", "buyer_id": buyer["user"]["id"]},
    )
    assert sold.status_code == 200
    assert sold.json()["status"] == "sold"
    assert sold.json()["buyer_id"] == buyer["user"]["id"]


def test_recording_a_buyer_is_validated(client: TestClient) -> None:
    seller = register_user(client, "seller@example.com", "seller")
    buyer = register_user(client, "buyer@example.com", "buyer")
    stranger = register_user(client, "stranger@example.com", "stranger")
    seller_headers = auth_headers(seller)
    card = create_card(client, seller_headers)
    listing = create_listing(client, seller_headers, str(card["id"]))
    client.post("/conversations", headers=auth_headers(buyer), json={"listing_id": listing["id"]})

    not_sold = client.patch(
        f"/market/listings/{listing['id']}",
        headers=seller_headers,
        json={"status": "on_hold", "buyer_id": buyer["user"]["id"]},
    )
    assert not_sold.status_code == 400

    never_chatted = client.patch(
        f"/market/listings/{listing['id']}",
        headers=seller_headers,
        json={"status": "sold", "buyer_id": stranger["user"]["id"]},
    )
    assert never_chatted.status_code == 400

    self_buy = client.patch(
        f"/market/listings/{listing['id']}",
        headers=seller_headers,
        json={"status": "sold", "buyer_id": seller["user"]["id"]},
    )
    assert self_buy.status_code == 400

    # Each rejection rolls back the whole PATCH, status included.
    unchanged = client.get(f"/market/listings/{listing['id']}").json()
    assert unchanged["status"] == "available"
    assert unchanged["buyer_id"] is None


def test_recorded_buyer_cannot_be_swapped_afterwards(client: TestClient) -> None:
    """Re-pointing a sale would quietly strip the first buyer's review rights."""
    seller = register_user(client, "seller@example.com", "seller")
    buyer = register_user(client, "buyer@example.com", "buyer")
    other = register_user(client, "other@example.com", "other")
    seller_headers = auth_headers(seller)
    card = create_card(client, seller_headers)
    listing = create_listing(client, seller_headers, str(card["id"]))
    for user in (buyer, other):
        client.post(
            "/conversations", headers=auth_headers(user), json={"listing_id": listing["id"]}
        )

    first = client.patch(
        f"/market/listings/{listing['id']}",
        headers=seller_headers,
        json={"status": "sold", "buyer_id": buyer["user"]["id"]},
    )
    assert first.status_code == 200

    swap = client.patch(
        f"/market/listings/{listing['id']}",
        headers=seller_headers,
        json={"status": "sold", "buyer_id": other["user"]["id"]},
    )
    assert swap.status_code == 409
    assert client.get(f"/market/listings/{listing['id']}").json()["buyer_id"] == buyer["user"]["id"]


def test_seller_can_edit_price_and_notes(client: TestClient) -> None:
    seller = register_user(client, "seller@example.com", "seller")
    outsider = register_user(client, "outsider@example.com", "outsider")
    seller_headers = auth_headers(seller)
    card = create_card(client, seller_headers)
    listing = create_listing(client, seller_headers, str(card["id"]))

    updated = client.patch(
        f"/market/listings/{listing['id']}",
        headers=seller_headers,
        json={"asking_price": "199.99", "notes": "Price drop, near mint."},
    )
    assert updated.status_code == 200
    assert updated.json()["asking_price"] == 199.99
    assert updated.json()["notes"] == "Price drop, near mint."

    assert (
        client.patch(
            f"/market/listings/{listing['id']}",
            headers=auth_headers(outsider),
            json={"asking_price": "1.00"},
        ).status_code
        == 403
    )


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


def test_create_card_auto_places_into_binder_in_order(client: TestClient) -> None:
    seller = register_user(client, "seller@example.com", "seller")
    headers = auth_headers(seller)

    first = create_card(client, headers, name="Charizard")
    second = create_card(client, headers, name="Blastoise")

    binder = client.get("/binder/me", headers=headers)
    assert binder.status_code == 200
    slots = binder.json()["pages"][0]["slots"]
    assert slots[0]["card"]["id"] == first["id"]
    assert slots[1]["card"]["id"] == second["id"]


def test_create_card_can_skip_binder_placement(client: TestClient) -> None:
    seller = register_user(client, "seller@example.com", "seller")
    headers = auth_headers(seller)

    response = client.post(
        "/binder/cards",
        headers=headers,
        json={
            "name": "Charizard",
            "set_code": "base1",
            "number": "4",
            "image_url": "https://img.example/charizard.png",
            "holo_type": "normal",
            "place_in_binder": False,
        },
    )
    assert response.status_code == 201
    assert response.json()["image_url"] == "https://img.example/charizard.png"

    binder = client.get("/binder/me", headers=headers)
    assert all(slot["card"] is None for slot in binder.json()["pages"][0]["slots"])


def test_update_owned_card_edits_mutable_fields(client: TestClient) -> None:
    seller = register_user(client, "seller@example.com", "seller")
    headers = auth_headers(seller)
    card = create_card(client, headers)

    updated = client.patch(
        f"/binder/cards/{card['id']}",
        headers=headers,
        json={"condition": "LP", "notes": "small edge wear", "holo_type": "reverse_holo"},
    )
    assert updated.status_code == 200
    body = updated.json()
    assert body["condition"] == "LP"
    assert body["notes"] == "small edge wear"
    assert body["holo_type"] == "reverse_holo"
    # Identity fields are untouched by a partial update.
    assert body["name"] == "Charizard"
    assert body["card_type"] == "Fire"


def test_delete_owned_card_empties_its_binder_slot(client: TestClient) -> None:
    seller = register_user(client, "seller@example.com", "seller")
    headers = auth_headers(seller)
    card = create_card(client, headers)

    deleted = client.delete(f"/binder/cards/{card['id']}", headers=headers)
    assert deleted.status_code == 204

    # The card is gone from the owner's collection and its slot reads empty.
    remaining = client.get("/binder/cards", headers=headers)
    assert all(row["id"] != card["id"] for row in remaining.json())
    binder = client.get("/binder/me", headers=headers)
    assert all(slot["card"] is None for slot in binder.json()["pages"][0]["slots"])

    # A second delete is a no-op 404, not a 500.
    assert client.delete(f"/binder/cards/{card['id']}", headers=headers).status_code == 404


def test_card_update_and_delete_scoped_to_owner(client: TestClient) -> None:
    owner = register_user(client, "owner@example.com", "owner")
    intruder = register_user(client, "intruder@example.com", "intruder")
    owner_headers = auth_headers(owner)
    intruder_headers = auth_headers(intruder)
    card = create_card(client, owner_headers)

    assert (
        client.patch(
            f"/binder/cards/{card['id']}", headers=intruder_headers, json={"condition": "DMG"}
        ).status_code
        == 404
    )
    assert client.delete(f"/binder/cards/{card['id']}", headers=intruder_headers).status_code == 404


def _binder_card_names(body: dict[str, object]) -> list[str]:
    return [
        slot["card"]["name"]
        for page in body["pages"]  # type: ignore[attr-defined]
        for slot in page["slots"]
        if slot["card"] is not None
    ]


def test_public_binder_returns_owner_cards_when_public(client: TestClient) -> None:
    owner = register_user(client, "misty@example.com", "misty")
    create_card(client, auth_headers(owner), name="Starmie", set_code="base1")

    # No auth header: a public binder is readable by anyone.
    response = client.get("/binder/misty")

    assert response.status_code == 200
    assert "Starmie" in _binder_card_names(response.json())


def test_public_binder_lookup_is_case_insensitive(client: TestClient) -> None:
    register_user(client, "ash@example.com", "Ash")

    assert client.get("/binder/ASH").status_code == 200
    assert client.get("/binder/ash").status_code == 200


def test_public_binder_hidden_when_owner_is_private(client: TestClient) -> None:
    owner = register_user(client, "brock@example.com", "brock")
    headers = auth_headers(owner)
    create_card(client, headers, name="Onix", set_code="base1")

    privacy = client.patch(
        "/profiles/me/privacy", headers=headers, json={"binder_visibility": "private"}
    )
    assert privacy.status_code == 200

    assert client.get("/binder/brock").status_code == 403


def test_public_binder_unknown_user_returns_404(client: TestClient) -> None:
    assert client.get("/binder/nobody").status_code == 404


def test_profile_stats_counts_owned_listed_and_sold(client: TestClient) -> None:
    seller = register_user(client, "sasha@example.com", "sasha")
    headers = auth_headers(seller)

    charizard = create_card(client, headers, name="Charizard", set_code="base1")
    blastoise = create_card(client, headers, name="Blastoise", set_code="base1")
    create_card(client, headers, name="Venusaur", set_code="base1")  # owned, never listed

    create_listing(client, headers, str(charizard["id"]))  # stays available
    sold = create_listing(client, headers, str(blastoise["id"]))
    marked = client.patch(
        f"/market/listings/{sold['id']}", headers=headers, json={"status": "sold"}
    )
    assert marked.status_code == 200

    stats = client.get("/profiles/sasha/stats")
    assert stats.status_code == 200
    assert stats.json() == {"cards_owned": 3, "cards_listed": 1, "completed_trades": 1}


def test_profile_stats_unknown_user_returns_404(client: TestClient) -> None:
    assert client.get("/profiles/ghost/stats").status_code == 404


def test_marketplace_listings_filter_by_seller(client: TestClient) -> None:
    ash = register_user(client, "ash2@example.com", "ashketchum")
    gary = register_user(client, "gary@example.com", "garyoak")
    ash_card = create_card(client, auth_headers(ash), name="Pikachu", set_code="base1")
    gary_card = create_card(client, auth_headers(gary), name="Eevee", set_code="base1")
    create_listing(client, auth_headers(ash), str(ash_card["id"]))
    create_listing(client, auth_headers(gary), str(gary_card["id"]))

    result = client.get("/market/listings?seller=ashketchum")
    assert result.status_code == 200
    body = result.json()
    assert len(body) == 1
    assert body[0]["seller"]["username"] == "ashketchum"
    assert body[0]["card"]["name"] == "Pikachu"

    # Lookup is case-insensitive.
    assert len(client.get("/market/listings?seller=AshKetchum").json()) == 1
