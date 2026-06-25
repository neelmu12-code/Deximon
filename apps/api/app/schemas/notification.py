from datetime import datetime
from uuid import UUID

from pydantic import BaseModel

from app.models.notification import NotificationType


class NotificationResponse(BaseModel):
    id: UUID
    type: NotificationType
    title: str
    body: str
    is_read: bool
    meta: dict[str, str]
    created_at: datetime


class NotificationListResponse(BaseModel):
    notifications: list[NotificationResponse]
    unread_count: int
