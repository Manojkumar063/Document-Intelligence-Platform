import uuid
from datetime import datetime, timezone

from motor.motor_asyncio import AsyncIOMotorDatabase


class UsageRepository:
    def __init__(self, db: AsyncIOMotorDatabase) -> None:
        self.col = db["usage_events"]

    async def record(self, user_id: str, action: str) -> None:
        await self.col.insert_one(
            {
                "_id": str(uuid.uuid4()),
                "user_id": user_id,
                "action": action,
                "created_at": datetime.now(timezone.utc),
            }
        )