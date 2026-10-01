from typing import Annotated

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.security import decode_access_token
from app.db.database import get_db
from app.db.repositories.user_repo import UserRepository
from app.utils.exceptions import ForbiddenError, NotFoundError, UnauthorizedError

DBSession = Annotated[AsyncIOMotorDatabase, Depends(get_db)]

_bearer = HTTPBearer(auto_error=False)


async def get_current_user_id(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
) -> str:
    if credentials is None:
        raise UnauthorizedError("Authorization header missing")
    payload = decode_access_token(credentials.credentials)
    user_id: str | None = payload.get("sub")
    if not user_id:
        raise UnauthorizedError("Token subject missing")
    return user_id


CurrentUserID = Annotated[str, Depends(get_current_user_id)]


async def get_current_admin_user_id(user_id: CurrentUserID, db: DBSession) -> str:
    user = await UserRepository(db).get_by_id(user_id)
    if not user:
        raise NotFoundError("User", user_id)
    if user.role != "admin":
        raise ForbiddenError("Only admins can upload documents")
    return user_id


CurrentAdminUserID = Annotated[str, Depends(get_current_admin_user_id)]
