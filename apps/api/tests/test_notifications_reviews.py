from uuid import UUID, uuid4

import pytest
from fastapi.testclient import TestClient
from starlette.websockets import WebSocketDisconnect

from app.services import notifications as notification_service
from tests.test_marketplace_chat_binder import (
    auth_headers,
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


def test_listing_seller_includes_review_stats(client: TestClient) -> None:
    seller = register_user(client, "seller@example.com", "seller")
    buyer = register_user(client, "buyer@example.com", "buyer")
    seller_headers = auth_headers(seller)
    buyer_headers = auth_headers(buyer)
    card = create_card(client, seller_headers)
    listing = create_listing(client, seller_headers, str(card["id"]))

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
