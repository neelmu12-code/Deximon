from uuid import UUID

from fastapi import WebSocket
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.models.notification import Notification, NotificationType
from app.models.user import User
from app.schemas.notification import NotificationResponse

# A user can have several live sockets at once (one per open tab), so we keep a
# set per user rather than a single socket that later tabs would overwrite.
hub: dict[UUID, set[WebSocket]] = {}


def register(user_id: UUID, websocket: WebSocket) -> None:
    hub.setdefault(user_id, set()).add(websocket)


def unregister(user_id: UUID, websocket: WebSocket) -> None:
    sockets = hub.get(user_id)
    if sockets is None:
        return
    sockets.discard(websocket)
    if not sockets:
        hub.pop(user_id, None)


async def push(user_id: UUID, message: dict[str, object]) -> None:
    # Fan out to every live socket for the user. A socket that errors on send is
    # a client that vanished without a clean close, so drop it here instead of
    # letting the failure bubble into the request that triggered the push.
    for websocket in list(hub.get(user_id, set())):
        try:
            await websocket.send_json(message)
        except Exception:
            unregister(user_id, websocket)


def actor_meta(user: User) -> dict[str, str]:
    meta: dict[str, str] = {}
    profile = user.profile
    if profile is None:
        return meta
    if profile.display_name:
        meta["actor_display_name"] = profile.display_name
    if profile.avatar_url:
        meta["actor_avatar_url"] = profile.avatar_url
    return meta


def _actor_username(notification: Notification) -> str | None:
    """Username whose profile should enrich this notification's meta.

    Returns None when the meta already carries the actor's avatar (so no lookup
    is needed) or when there's no username to resolve.
    """
    meta = notification.meta or {}
    if meta.get("actor_avatar_url"):
        return None
    username = (
        meta.get("reviewer_username")
        or meta.get("sender_username")
        or meta.get("actor_username")
        or notification.title
    )
    return username or None


def _load_actors(db: Session, usernames: set[str]) -> dict[str, User]:
    """Map lowercased username -> active user (with profile) for the given names."""
    if not usernames:
        return {}
    users = db.scalars(
        select(User)
        .options(selectinload(User.profile))
        .where(func.lower(User.username).in_(usernames), User.is_active.is_(True))
    )
    return {user.username.lower(): user for user in users}


def _merge_actor(notification: Notification, actor: User | None) -> dict[str, str]:
    meta = dict(notification.meta or {})
    if actor is None:
        return meta
    return {**meta, **actor_meta(actor)}


def enriched_meta(db: Session, notification: Notification) -> dict[str, str]:
    username = _actor_username(notification)
    if username is None:
        return dict(notification.meta or {})
    actors = _load_actors(db, {username.lower()})
    return _merge_actor(notification, actors.get(username.lower()))


def unread_count(db: Session, user_id: UUID) -> int:
    return db.scalar(
        select(func.count())
        .select_from(Notification)
        .where(Notification.user_id == user_id, Notification.is_read.is_(False))
    ) or 0


def _build_response(notification: Notification, meta: dict[str, str]) -> NotificationResponse:
    return NotificationResponse(
        id=notification.id,
        type=notification.type,
        title=notification.title,
        body=notification.body,
        is_read=notification.is_read,
        meta=meta,
        created_at=notification.created_at,
    )


def to_response(notification: Notification, db: Session | None = None) -> NotificationResponse:
    meta = enriched_meta(db, notification) if db is not None else dict(notification.meta or {})
    return _build_response(notification, meta)


def to_responses(db: Session, notifications: list[Notification]) -> list[NotificationResponse]:
    """Build responses for a list, resolving every actor profile in one query.

    The per-notification to_response would otherwise fire a user lookup for each
    row whose meta lacks an avatar, so a page of notifications becomes N queries.
    """
    wanted: set[str] = set()
    for notification in notifications:
        username = _actor_username(notification)
        if username is not None:
            wanted.add(username.lower())

    actors = _load_actors(db, wanted)
    responses: list[NotificationResponse] = []
    for notification in notifications:
        username = _actor_username(notification)
        actor = actors.get(username.lower()) if username is not None else None
        responses.append(_build_response(notification, _merge_actor(notification, actor)))
    return responses


async def create_notification(
    db: Session,
    *,
    user_id: UUID,
    type: NotificationType,
    title: str,
    body: str,
    meta: dict[str, str] | None = None,
) -> Notification:
    notification = Notification(
        user_id=user_id,
        type=type,
        title=title,
        body=body,
        is_read=False,
        meta=meta or {},
    )
    db.add(notification)
    db.commit()
    db.refresh(notification)

    await push(
        user_id,
        {
            "type": "notification",
            "notification": to_response(notification, db).model_dump(mode="json"),
            "unread_count": unread_count(db, user_id),
        },
    )
    return notification
