from fastapi import APIRouter

from app.api.deps import CurrentUserID, DBSession
from app.db.repositories.notification_repo import NotificationRepository
from app.schemas.notification import NotificationList, NotificationResponse
from app.utils.exceptions import NotFoundError

router = APIRouter(prefix="/notifications", tags=["notifications"])


def to_response(item: dict) -> NotificationResponse:
    return NotificationResponse(
        id=str(item["_id"]),
        title=item["title"],
        message=item["message"],
        href=item["href"],
        created_at=item["created_at"],
        read=item.get("read_at") is not None,
    )


@router.get("", response_model=NotificationList)
async def list_notifications(user_id: CurrentUserID, db: DBSession) -> NotificationList:
    items, unread_count = await NotificationRepository(db).list_for_user(user_id)
    return NotificationList(items=[to_response(item) for item in items], unread_count=unread_count)


@router.patch("/{notification_id}/read", response_model=NotificationResponse)
async def mark_notification_read(
    notification_id: str, user_id: CurrentUserID, db: DBSession
) -> NotificationResponse:
    item = await NotificationRepository(db).mark_read(notification_id, user_id)
    if not item:
        raise NotFoundError("Notification", notification_id)
    return to_response(item)