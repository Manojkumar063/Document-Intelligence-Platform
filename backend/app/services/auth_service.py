from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.security import create_access_token, hash_password, verify_password
from app.db.repositories.user_repo import UserRepository
from app.db.models.user import User
from app.utils.exceptions import ConflictError, UnauthorizedError


class AuthService:
    def __init__(self, db: AsyncIOMotorDatabase) -> None:
        self.repo = UserRepository(db)

    async def register(self, email: str, password: str, full_name: str) -> User:
        existing = await self.repo.get_by_email(email)
        if existing:
            raise ConflictError(f"Email '{email}' is already registered")
        hashed = hash_password(password)
        return await self.repo.create(email=email, hashed_password=hashed, full_name=full_name)

    async def login(self, email: str, password: str) -> str:
        user = await self.repo.get_by_email(email)
        if not user or not verify_password(password, user.hashed_password):
            raise UnauthorizedError("Invalid email or password")
        if not user.is_active:
            raise UnauthorizedError("Account is disabled")
        return create_access_token(subject=str(user.id))
