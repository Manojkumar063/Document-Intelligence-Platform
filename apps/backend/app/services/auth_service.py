from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo.errors import DuplicateKeyError

from app.core.security import create_access_token, hash_password, verify_password
from app.db.repositories.user_repo import UserRepository
from app.db.models.user import User
from app.utils.exceptions import ConflictError, UnauthorizedError


class AuthService:
    def __init__(self, db: AsyncIOMotorDatabase) -> None:
        self.repo = UserRepository(db)

    async def register(self, email: str, password: str, full_name: str) -> User:
        normalized_email = email.strip().lower()
        existing = await self.repo.get_by_email(normalized_email)
        if existing:
            raise ConflictError("An account with this email already exists")
        hashed = hash_password(password)
        try:
            return await self.repo.create(
                email=normalized_email, hashed_password=hashed, full_name=full_name
            )
        except DuplicateKeyError as exc:
            # The unique MongoDB index is the final authority under concurrent requests.
            raise ConflictError("An account with this email already exists") from exc

    async def login(self, email: str, password: str) -> str:
        user = await self.repo.get_by_email(email.strip().lower())
        if not user or not verify_password(password, user.hashed_password):
            raise UnauthorizedError("Invalid email or password")
        if not user.is_active:
            raise UnauthorizedError("Invalid email or password")
        return create_access_token(subject=str(user.id))
