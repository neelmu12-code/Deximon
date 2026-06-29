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


def enriched_meta(db: Session, notification: Notification) -> dict[str, str]:
    meta = dict(notification.meta or {})
    if meta.get("actor_avatar_url"):
        return meta

    username = (
        meta.get("reviewer_username")
        or meta.get("sender_username")
        or meta.get("actor_username")
        or notification.title
    )
    if not username:
        return meta

    user = db.scalar(
        select(User)
        .options(selectinload(User.profile))
        .where(func.lower(User.username) == username.lower(), User.is_active.is_(True))
    )
    if user is None:
        return meta
    return {**meta, **actor_meta(user)}


def unread_count(db: Session, user_id: UUID) -> int:
    return db.scalar(
        select(func.count())
        .select_from(Notification)
        .where(Notification.user_id == user_id, Notification.is_read.is_(False))
    ) or 0


def to_response(notification: Notification, db: Session | None = None) -> NotificationResponse:
    meta = enriched_meta(db, notification) if db is not None else (notification.meta or {})
    return NotificationResponse(
        id=notification.id,
        type=notification.type,
        title=notification.title,
        body=notification.body,
        is_read=notification.is_read,
        meta=meta,
        created_at=notification.created_at,
    )


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
