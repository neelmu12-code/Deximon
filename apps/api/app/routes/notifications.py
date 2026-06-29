from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect, status
from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.security import decode_access_token
from app.db.session import SessionLocal, get_db
from app.dependencies.auth import get_current_user
from app.models.notification import Notification
from app.models.user import User
from app.schemas.notification import NotificationListResponse, NotificationResponse
from app.services import notifications as notification_service

router = APIRouter(prefix="/notifications", tags=["notifications"])
DbSession = Annotated[Session, Depends(get_db)]
CurrentUser = Annotated[User, Depends(get_current_user)]


@router.get("", response_model=NotificationListResponse)
def list_notifications(
    current_user: CurrentUser,
    db: DbSession,
    skip: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=50)] = 20,
) -> NotificationListResponse:
    notifications = db.scalars(
        select(Notification)
        .where(Notification.user_id == current_user.id)
        .order_by(Notification.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    items = [notification_service.to_response(n, db) for n in notifications]
    return NotificationListResponse(
        notifications=items,
        unread_count=notification_service.unread_count(db, current_user.id),
    )


@router.patch("/read-all", response_model=NotificationListResponse)
def mark_all_read(
    current_user: CurrentUser,
    db: DbSession,
    skip: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=50)] = 20,
) -> NotificationListResponse:
    db.execute(
        update(Notification)
        .where(Notification.user_id == current_user.id, Notification.is_read.is_(False))
        .values(is_read=True)
    )
    db.commit()
    db.expire_all()
    return list_notifications(current_user, db, skip=skip, limit=limit)


@router.patch("/{notification_id}/read", response_model=NotificationResponse)
def mark_read(
    notification_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
) -> NotificationResponse:
    notification = db.get(Notification, notification_id)
    if notification is None or notification.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")
    notification.is_read = True
    db.commit()
    db.refresh(notification)
    return notification_service.to_response(notification, db)


@router.websocket("/ws")
async def notifications_websocket(websocket: WebSocket) -> None:
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

        await websocket.accept()
        notification_service.register(user_id, websocket)
        await websocket.send_json(
            {"type": "ready", "unread_count": notification_service.unread_count(db, user_id)}
        )

        while True:
            payload = await websocket.receive_json()
            if payload.get("action") == "read_all":
                db.execute(
                    update(Notification)
                    .where(Notification.user_id == user_id, Notification.is_read.is_(False))
                    .values(is_read=True)
                )
                db.commit()
                await websocket.send_json({"type": "unread_count", "unread_count": 0})
    except WebSocketDisconnect:
        return
    finally:
        notification_service.unregister(user_id, websocket)
        db.close()
