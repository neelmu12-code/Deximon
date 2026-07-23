from uuid import UUID, uuid4

import pytest
from fastapi.testclient import TestClient
from starlette.websockets import WebSocketDisconnect

from app.services import notifications as notification_service
from tests.test_marketplace_chat_binder import (
    auth_headers,
    complete_sale,
    create_card,
    create_listing,
    register_user,
)


class _FakeSocket:
    """Stand-in for a Starlette WebSocket in hub unit tests.

    The notifications WS route uses SessionLocal directly, so a full round-trip
    can't be driven through the test client's overridden DB. These fakes let us
    exercise the hub fan-out and dead-socket handling without a live socket.
    """

    def __init__(self, *, fail: bool = False) -> None:
        self.fail = fail
        self.sent: list[dict[str, object]] = []

    async def send_json(self, data: dict[str, object]) -> None:
        if self.fail:
            raise RuntimeError("socket closed")
        self.sent.append(data)


def test_notifications_require_auth(client: TestClient) -> None:
    assert client.get("/notifications").status_code == 401


def test_message_creates_notification_for_recipient(client: TestClient) -> None:
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
    )
    assert conversation.status_code == 201
    conversation_id = conversation.json()["id"]

    sent = client.post(
        f"/conversations/{conversation_id}/messages",
        headers=buyer_headers,
        json={"body": "Still available?"},
    )
    assert sent.status_code == 201

    notifications = client.get("/notifications", headers=seller_headers)
    assert notifications.status_code == 200
    payload = notifications.json()
    assert payload["unread_count"] == 1
    assert len(payload["notifications"]) == 1
    assert payload["notifications"][0]["type"] == "message"
    assert payload["notifications"][0]["title"] == "buyer"
    assert "Pikachu" in payload["notifications"][0]["body"]


def test_mark_all_notifications_read(client: TestClient) -> None:
    seller = register_user(client, "seller@example.com", "seller")
    buyer = register_user(client, "buyer@example.com", "buyer")
    seller_headers = auth_headers(seller)
    buyer_headers = auth_headers(buyer)
    card = create_card(client, seller_headers)
    listing = create_listing(client, seller_headers, str(card["id"]))
    conversation = client.post(
        "/conversations",
        headers=buyer_headers,
        json={"listing_id": listing["id"]},
    )
    conversation_id = UUID(conversation.json()["id"])
    client.post(
        f"/conversations/{conversation_id}/messages",
        headers=buyer_headers,
        json={"body": "Hello"},
    )

    read_all = client.patch("/notifications/read-all", headers=seller_headers)
    assert read_all.status_code == 200
    assert read_all.json()["unread_count"] == 0
    assert all(item["is_read"] for item in read_all.json()["notifications"])


def test_seller_reviews_create_list_and_profile_rating(client: TestClient) -> None:
    seller = register_user(client, "seller@example.com", "seller")
    buyer = register_user(client, "buyer@example.com", "buyer")
    seller_headers = auth_headers(seller)
    buyer_headers = auth_headers(buyer)
    complete_sale(client, seller_headers, buyer_headers)

    self_review = client.post(
        "/reviews/seller/seller",
        headers=seller_headers,
        json={"rating": 5},
    )
    assert self_review.status_code == 400

    created = client.post(
        "/reviews/seller/seller",
        headers=buyer_headers,
        json={"rating": 4, "comment": "Fast ship"},
    )
    assert created.status_code == 201
    assert created.json()["reviewer_username"] == "buyer"
    assert created.json()["rating"] == 4

    duplicate = client.post(
        "/reviews/seller/seller",
        headers=buyer_headers,
        json={"rating": 5},
    )
    assert duplicate.status_code == 409

    listed = client.get("/reviews/seller/seller")
    assert listed.status_code == 200
    body = listed.json()
    assert body["review_count"] == 1
    assert body["avg_rating"] == 4.0
    assert body["reviews"][0]["comment"] == "Fast ship"

    profile = client.get("/profiles/seller")
    assert profile.status_code == 200
    assert profile.json()["avg_rating"] == 4.0
    assert profile.json()["review_count"] == 1


def test_review_rejected_without_any_dealing(client: TestClient) -> None:
    seller = register_user(client, "seller@example.com", "seller")
    stranger = register_user(client, "stranger@example.com", "stranger")
    seller_headers = auth_headers(seller)
    card = create_card(client, seller_headers)
    create_listing(client, seller_headers, str(card["id"]))

    refused = client.post(
        "/reviews/seller/seller",
        headers=auth_headers(stranger),
        json={"rating": 1},
    )
    assert refused.status_code == 403


def test_review_rejected_while_listing_unsold(client: TestClient) -> None:
    seller = register_user(client, "seller@example.com", "seller")
    buyer = register_user(client, "buyer@example.com", "buyer")
    seller_headers = auth_headers(seller)
    buyer_headers = auth_headers(buyer)
    card = create_card(client, seller_headers)
    listing = create_listing(client, seller_headers, str(card["id"]))

    conversation = client.post(
        "/conversations",
        headers=buyer_headers,
        json={"listing_id": listing["id"]},
    )
    assert conversation.status_code == 201
    conversation_id = conversation.json()["id"]

    # Chatting is not buying — the listing is still available.
    too_early = client.post(
        "/reviews/seller/seller",
        headers=buyer_headers,
        json={"rating": 5},
    )
    assert too_early.status_code == 403

    sold = client.patch(
        f"/conversations/{conversation_id}/listing-status",
        headers=seller_headers,
        json={"status": "sold"},
    )
    assert sold.status_code == 200

    allowed = client.post(
        "/reviews/seller/seller",
        headers=buyer_headers,
        json={"rating": 5},
    )
    assert allowed.status_code == 201


def test_review_rejected_for_other_sellers_sale(client: TestClient) -> None:
    """A completed sale earns a review of that seller only, not of everyone."""
    register_user(client, "seller@example.com", "seller")
    other = register_user(client, "other@example.com", "other")
    buyer = register_user(client, "buyer@example.com", "buyer")
    buyer_headers = auth_headers(buyer)
    complete_sale(client, auth_headers(other), buyer_headers)

    refused = client.post(
        "/reviews/seller/seller",
        headers=buyer_headers,
        json={"rating": 2},
    )
    assert refused.status_code == 403


def test_only_the_recorded_buyer_can_review(client: TestClient) -> None:
    """Two people chat on one listing; only the one the seller sold to may review."""
    seller = register_user(client, "seller@example.com", "seller")
    buyer = register_user(client, "buyer@example.com", "buyer")
    bystander = register_user(client, "bystander@example.com", "bystander")
    seller_headers = auth_headers(seller)
    buyer_headers = auth_headers(buyer)
    by_headers = auth_headers(bystander)

    card = create_card(client, seller_headers)
    listing = create_listing(client, seller_headers, str(card["id"]))

    buyer_convo = client.post("/conversations", headers=buyer_headers, json={"listing_id": listing["id"]})
    client.post("/conversations", headers=by_headers, json={"listing_id": listing["id"]})

    sold = client.patch(
        f"/conversations/{buyer_convo.json()['id']}/listing-status",
        headers=seller_headers,
        json={"status": "sold"},
    )
    assert sold.status_code == 200

    assert client.post("/reviews/seller/seller", headers=buyer_headers, json={"rating": 5}).status_code == 201
    assert client.post("/reviews/seller/seller", headers=by_headers, json={"rating": 1}).status_code == 403


def test_marketplace_sold_without_buyer_grants_no_review(client: TestClient) -> None:
    """A listing marked sold from the marketplace records no buyer, so no one gains review rights."""
    seller = register_user(client, "seller@example.com", "seller")
    buyer = register_user(client, "buyer@example.com", "buyer")
    seller_headers = auth_headers(seller)
    buyer_headers = auth_headers(buyer)
    card = create_card(client, seller_headers)
    listing = create_listing(client, seller_headers, str(card["id"]))
    client.post("/conversations", headers=buyer_headers, json={"listing_id": listing["id"]})

    sold = client.patch(
        f"/market/listings/{listing['id']}",
        headers=seller_headers,
        json={"status": "sold"},
    )
    assert sold.status_code == 200

    refused = client.post("/reviews/seller/seller", headers=buyer_headers, json={"rating": 5})
    assert refused.status_code == 403


def test_buyer_recorded_from_the_listing_page_can_review(client: TestClient) -> None:
    """The seller names the buyer on the listing itself rather than from a chat."""
    seller = register_user(client, "seller@example.com", "seller")
    buyer = register_user(client, "buyer@example.com", "buyer")
    seller_headers = auth_headers(seller)
    buyer_headers = auth_headers(buyer)
    card = create_card(client, seller_headers)
    listing = create_listing(client, seller_headers, str(card["id"]))
    client.post("/conversations", headers=buyer_headers, json={"listing_id": listing["id"]})

    sold = client.patch(
        f"/market/listings/{listing['id']}",
        headers=seller_headers,
        json={"status": "sold", "buyer_id": buyer["user"]["id"]},
    )
    assert sold.status_code == 200

    review = client.post("/reviews/seller/seller", headers=buyer_headers, json={"rating": 4})
    assert review.status_code == 201


def test_sale_prompts_the_buyer_and_tells_everyone_else_it_is_gone(client: TestClient) -> None:
    seller = register_user(client, "seller@example.com", "seller")
    buyer = register_user(client, "buyer@example.com", "buyer")
    bystander = register_user(client, "bystander@example.com", "bystander")
    seller_headers = auth_headers(seller)
    buyer_headers = auth_headers(buyer)
    by_headers = auth_headers(bystander)
    card = create_card(client, seller_headers, "Mewtwo")
    listing = create_listing(client, seller_headers, str(card["id"]))
    buyer_convo = client.post(
        "/conversations", headers=buyer_headers, json={"listing_id": listing["id"]}
    )
    client.post("/conversations", headers=by_headers, json={"listing_id": listing["id"]})

    sold = client.patch(
        f"/market/listings/{listing['id']}",
        headers=seller_headers,
        json={"status": "sold", "buyer_id": buyer["user"]["id"]},
    )
    assert sold.status_code == 200

    buyer_note = client.get("/notifications", headers=buyer_headers).json()["notifications"][0]
    assert buyer_note["type"] == "review_prompt"
    assert "leave a review" in buyer_note["body"]
    assert buyer_note["meta"]["seller_username"] == "seller"
    assert buyer_note["meta"]["conversation_id"] == buyer_convo.json()["id"]

    other_note = client.get("/notifications", headers=by_headers).json()["notifications"][0]
    assert other_note["type"] == "listing_status"
    assert "no longer available" in other_note["body"]
    assert "review" not in other_note["body"]


def test_review_eligibility_reflects_what_the_post_would_do(client: TestClient) -> None:
    seller = register_user(client, "seller@example.com", "seller")
    buyer = register_user(client, "buyer@example.com", "buyer")
    stranger = register_user(client, "stranger@example.com", "stranger")
    seller_headers = auth_headers(seller)
    buyer_headers = auth_headers(buyer)

    # Nobody qualifies before a sale, the seller included.
    assert client.get("/reviews/seller/seller/eligibility", headers=buyer_headers).json() == {
        "can_review": False,
        "already_reviewed": False,
        "listing_id": None,
        "listing_card_name": None,
    }
    assert (
        client.get("/reviews/seller/seller/eligibility", headers=seller_headers).json()["can_review"]
        is False
    )

    complete_sale(client, seller_headers, buyer_headers, card_name="Blastoise")

    eligible = client.get("/reviews/seller/seller/eligibility", headers=buyer_headers).json()
    assert eligible["can_review"] is True
    assert eligible["already_reviewed"] is False
    assert eligible["listing_card_name"] == "Blastoise"

    assert (
        client.get("/reviews/seller/seller/eligibility", headers=auth_headers(stranger)).json()[
            "can_review"
        ]
        is False
    )

    posted = client.post("/reviews/seller/seller", headers=buyer_headers, json={"rating": 5})
    assert posted.status_code == 201

    # One review per seller, so the form shouldn't be offered a second time.
    after = client.get("/reviews/seller/seller/eligibility", headers=buyer_headers).json()
    assert after["can_review"] is False
    assert after["already_reviewed"] is True


def test_review_eligibility_requires_auth(client: TestClient) -> None:
    # No registration first: registering would leave an auth cookie on the client.
    assert client.get("/reviews/seller/seller/eligibility").status_code == 401


def test_review_cannot_be_pinned_to_someone_elses_listing(client: TestClient) -> None:
    seller = register_user(client, "seller@example.com", "seller")
    other = register_user(client, "other@example.com", "other")
    buyer = register_user(client, "buyer@example.com", "buyer")
    seller_headers = auth_headers(seller)
    buyer_headers = auth_headers(buyer)
    complete_sale(client, seller_headers, buyer_headers)
    # A listing the buyer never bought, from a different seller.
    foreign = create_listing(
        client, auth_headers(other), str(create_card(client, auth_headers(other))["id"])
    )

    refused = client.post(
        "/reviews/seller/seller",
        headers=buyer_headers,
        json={"rating": 5, "listing_id": foreign["id"]},
    )
    assert refused.status_code == 400


def test_listing_seller_includes_review_stats(client: TestClient) -> None:
    seller = register_user(client, "seller@example.com", "seller")
    buyer = register_user(client, "buyer@example.com", "buyer")
    seller_headers = auth_headers(seller)
    buyer_headers = auth_headers(buyer)
    listing = complete_sale(client, seller_headers, buyer_headers)

    client.post(
        "/reviews/seller/seller",
        headers=buyer_headers,
        json={"rating": 5, "listing_id": listing["id"]},
    )

    detail = client.get(f"/market/listings/{listing['id']}")
    assert detail.status_code == 200
    assert detail.json()["seller"]["avg_rating"] == 5.0
    assert detail.json()["seller"]["review_count"] == 1


def test_review_creates_notification_for_seller(client: TestClient) -> None:
    seller = register_user(client, "seller@example.com", "seller")
    buyer = register_user(client, "buyer@example.com", "buyer")
    seller_headers = auth_headers(seller)
    buyer_headers = auth_headers(buyer)
    complete_sale(client, seller_headers, buyer_headers)

    created = client.post(
        "/reviews/seller/seller",
        headers=buyer_headers,
        json={"rating": 5, "comment": "Great seller"},
    )
    assert created.status_code == 201

    notifications = client.get("/notifications", headers=seller_headers)
    assert notifications.status_code == 200
    payload = notifications.json()
    assert payload["unread_count"] == 1
    assert payload["notifications"][0]["type"] == "review"
    assert payload["notifications"][0]["title"] == "buyer"
    assert payload["notifications"][0]["meta"]["reviewer_username"] == "buyer"
    assert "5-star" in payload["notifications"][0]["body"]


def test_listing_status_change_notifies_requester(client: TestClient) -> None:
    seller = register_user(client, "seller@example.com", "seller")
    buyer = register_user(client, "buyer@example.com", "buyer")
    seller_headers = auth_headers(seller)
    buyer_headers = auth_headers(buyer)
    card = create_card(client, seller_headers, "Mewtwo")
    listing = create_listing(client, seller_headers, str(card["id"]))

    client.post(
        "/conversations",
        headers=buyer_headers,
        json={"listing_id": listing["id"]},
    )

    updated = client.patch(
        f"/market/listings/{listing['id']}",
        headers=seller_headers,
        json={"status": "on_hold"},
    )
    assert updated.status_code == 200

    notifications = client.get("/notifications", headers=buyer_headers)
    assert notifications.status_code == 200
    payload = notifications.json()
    assert payload["unread_count"] == 1
    assert payload["notifications"][0]["type"] == "listing_status"
    assert "on hold" in payload["notifications"][0]["body"].lower()


def test_notifications_ws_requires_token(client: TestClient) -> None:
    # No token and no auth cookie -> the route closes with a policy violation
    # before accepting, which the test client surfaces as a disconnect.
    with pytest.raises(WebSocketDisconnect), client.websocket_connect("/notifications/ws"):
        pass


async def test_push_fans_out_to_all_user_sockets() -> None:
    user_id = uuid4()
    tab_one = _FakeSocket()
    tab_two = _FakeSocket()
    notification_service.register(user_id, tab_one)  # type: ignore[arg-type]
    notification_service.register(user_id, tab_two)  # type: ignore[arg-type]
    try:
        await notification_service.push(user_id, {"type": "ping"})
        assert tab_one.sent == [{"type": "ping"}]
        assert tab_two.sent == [{"type": "ping"}]
    finally:
        notification_service.unregister(user_id, tab_one)  # type: ignore[arg-type]
        notification_service.unregister(user_id, tab_two)  # type: ignore[arg-type]


async def test_push_drops_dead_sockets() -> None:
    user_id = uuid4()
    live = _FakeSocket()
    dead = _FakeSocket(fail=True)
    notification_service.register(user_id, live)  # type: ignore[arg-type]
    notification_service.register(user_id, dead)  # type: ignore[arg-type]
    try:
        await notification_service.push(user_id, {"type": "ping"})
        assert live.sent == [{"type": "ping"}]
        assert dead not in notification_service.hub.get(user_id, set())
        assert live in notification_service.hub.get(user_id, set())
    finally:
        notification_service.unregister(user_id, live)  # type: ignore[arg-type]


def test_unregister_clears_empty_user_entry() -> None:
    user_id = uuid4()
    socket = _FakeSocket()
    notification_service.register(user_id, socket)  # type: ignore[arg-type]
    notification_service.unregister(user_id, socket)  # type: ignore[arg-type]
    assert user_id not in notification_service.hub
