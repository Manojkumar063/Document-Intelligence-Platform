import uuid
from datetime import datetime, timezone

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.db.models.document import Document


class NotificationRepository:
    def __init__(self, db: AsyncIOMotorDatabase) -> None:
        self.db = db
        self.col = db["notifications"]

    async def notify_document_status(self, doc: Document, status: str) -> None:
        if doc.is_shared:
            users = [user async for user in self.db["users"].find({"is_active": True}, {"_id": 1})]
            recipient_ids = [str(user["_id"]) for user in users]
        else:
            recipient_ids = [doc.user_id]
        if not recipient_ids:
            return

        completed = status == "completed"
        title = "Document ready" if completed else "Document processing failed"
        message = f"{doc.original_name} is ready to use." if completed else f"{doc.original_name} could not be processed."
        now = datetime.now(timezone.utc)
        await self.col.insert_many(
            [
                {
                    "_id": str(uuid.uuid4()),
                    "user_id": user_id,
                    "title": title,
                    "message": message,
                    "href": "/documents",
                    "created_at": now,
                    "read_at": None,
                }
                for user_id in recipient_ids
            ]
        )

    async def list_for_user(self, user_id: str, limit: int = 10) -> tuple[list[dict], int]:
        cursor = self.col.find({"user_id": user_id}).sort("created_at", -1).limit(limit)
        items = [item async for item in cursor]
        unread_count = await self.col.count_documents({"user_id": user_id, "read_at": None})
        return items, unread_count

    async def mark_read(self, notification_id: str, user_id: str) -> dict | None:
        now = datetime.now(timezone.utc)
        await self.col.update_one(
            {"_id": notification_id, "user_id": user_id, "read_at": None},
            {"$set": {"read_at": now}},
        )
        return await self.col.find_one({"_id": notification_id, "user_id": user_id})