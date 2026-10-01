from datetime import datetime, timezone

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.db.models.user import User


class UserRepository:
    def __init__(self, db: AsyncIOMotorDatabase) -> None:
        self.col = db["users"]

    async def get_by_id(self, user_id: str) -> User | None:
        doc = await self.col.find_one({"_id": user_id})
        return User.from_doc(doc) if doc else None

    async def get_by_email(self, email: str) -> User | None:
        doc = await self.col.find_one({"email": email})
        return User.from_doc(doc) if doc else None

    async def create(self, email: str, hashed_password: str, full_name: str) -> User:
        user = User(email=email, hashed_password=hashed_password, full_name=full_name)
        await self.col.insert_one(user.to_doc())
        return user

    async def set_role(self, user_id: str, role: str) -> None:
        await self.col.update_one({"_id": user_id}, {"$set": {"role": role}})

    async def list_all(self) -> list[User]:
        return [User.from_doc(d) async for d in self.col.find()]
