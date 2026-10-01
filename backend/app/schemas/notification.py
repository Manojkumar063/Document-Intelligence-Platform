from datetime import datetime

from pydantic import BaseModel


class NotificationResponse(BaseModel):
    id: str
    title: str
    message: str
    href: str
    created_at: datetime
    read: bool


class NotificationList(BaseModel):
    items: list[NotificationResponse]
    unread_count: int